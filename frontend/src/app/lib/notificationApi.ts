import { requestJson } from './api';

export type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';
export type NotificationCategory = 'SYSTEM' | 'TIMELINE' | 'COLLABORATION' | 'SOCIAL';

export interface NotificationResponse {
  id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  payload: Record<string, any>;
  status: NotificationStatus;
  createdAt: string;
  readAt?: string;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export async function getNotificationsRequest(
  accessToken: string,
  params: { status?: NotificationStatus; category?: NotificationCategory; page?: number; size?: number } = {}
): Promise<{ content: NotificationResponse[]; totalElements: number }> {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.category) query.append('category', params.category);
  if (params.page !== undefined) query.append('page', params.page.toString());
  if (params.size !== undefined) query.append('size', params.size.toString());

  const response = await requestJson<{ 
    result: { 
      content: NotificationResponse[]; 
      totalElements: number 
    } 
  }>(`/api/v1/notifications?${query.toString()}`, {
    method: 'GET',
    accessToken,
  });
  return response.result;
}

export async function getUnreadCountRequest(accessToken: string): Promise<number> {
  const response = await requestJson<{ result: UnreadCountResponse }>('/api/v1/notifications/unread-count', {
    method: 'GET',
    accessToken,
  });
  return response.result.unreadCount;
}

export async function markAsReadRequest(notificationId: string, accessToken: string): Promise<void> {
  await requestJson(`/api/v1/notifications/${notificationId}/read`, {
    method: 'PATCH',
    accessToken,
  });
}

export async function markAllAsReadRequest(accessToken: string): Promise<void> {
  await requestJson('/api/v1/notifications/read-all', {
    method: 'PATCH',
    accessToken,
  });
}
