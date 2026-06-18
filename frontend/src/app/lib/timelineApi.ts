export type TimelineVisibility = "PRIVATE" | "SHARED" | "PUBLIC_READ";
export type TimelineMemberRole = "OWNER" | "EDITOR" | "VIEWER";
export type TimelineEventCategory = "FOOD" | "DRINK" | "ACTIVITY";
export type TimelineEventStatus = "PLANNED" | "CONFIRMED" | "CANCELLED";
export type NotificationStatus = "UNREAD" | "READ" | "ARCHIVED";
export type NotificationCategory = "TIMELINE" | "COLLABORATION" | "SYSTEM" | "RECOMMENDATION";

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CurrentUser {
  id: string;
  username: string;
  displayName?: string | null;
}

export interface TimelineMember {
  id: string;
  userId: string;
  username: string;
  displayName?: string | null;
  role: TimelineMemberRole;
}

export interface TimelinePlace {
  id: string;
  name: string;
  address?: string | null;
  rating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
  imageUrl?: string | null;
}

export interface TimelineEvent {
  id: string;
  externalPlaceId: string;
  place?: TimelinePlace | null;
  category: TimelineEventCategory;
  startTime: string;
  endTime: string;
  orderIndex: number;
  notes?: string | null;
  status: TimelineEventStatus;
  version: number;
}

export interface Timeline {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  visibility: TimelineVisibility;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName?: string | null;
  members: TimelineMember[];
  events: TimelineEvent[];
  activeInviteCode?: string | null;
}

export interface TimelineInput {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  visibility: TimelineVisibility;
}

export interface TimelineEventInput {
  externalPlaceId: string;
  category: TimelineEventCategory;
  startTime: string;
  endTime: string;
  orderIndex?: number;
  notes?: string;
  status?: TimelineEventStatus;
}

export interface MoveTimelineEventInput {
  startTime: string;
  endTime: string;
  orderIndex?: number;
}

export interface ResizeTimelineEventInput {
  startTime: string;
  endTime: string;
}

export interface ReorderTimelineEventInput {
  orderIndex: number;
}

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  type: string;
  title: string;
  message?: string | null;
  payload?: Record<string, unknown> | null;
  status: NotificationStatus;
  sourceModule?: string | null;
  sourceReferenceType?: string | null;
  createdAt: string;
  readAt?: string | null;
  archivedAt?: string | null;
  sourceReferenceId?: string | null;
}

export interface NotificationQuery {
  status?: NotificationStatus;
  category?: NotificationCategory;
  includeArchived?: boolean;
  page?: number;
  size?: number;
}

export interface NotificationUnreadCount {
  unreadCount: number;
}

export interface NotificationPreference {
  category: NotificationCategory;
  inAppEnabled: boolean;
  realtimeEnabled: boolean;
}

export interface NotificationPreferenceInput {
  inAppEnabled: boolean;
  realtimeEnabled: boolean;
}

export interface InviteCodeResult {
  code: string;
  role: TimelineMemberRole;
  maxUses: number;
  expiresAt: string;
}

export interface JoinByCodeResult {
  timelineId: string;
  role: TimelineMemberRole;
}

const tokenKeys = [
  "token",
  "accessToken",
  "authToken",
  "jwt",
  "vietjourney_token",
  "VietJourney.token",
];

function getStoredToken() {
  const stores = [localStorage, sessionStorage];

  for (const store of stores) {
    for (const key of tokenKeys) {
      const value = store.getItem(key);
      if (value) return value.replace(/^Bearer\s+/i, "");
    }

    for (const key of ["auth", "user", "session"]) {
      const raw = store.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const token = parsed.token || parsed.accessToken || parsed.authToken;
        if (typeof token === "string") {
          return token.replace(/^Bearer\s+/i, "");
        }
      } catch {
        // Ignore malformed storage values from previous app versions.
      }
    }
  }

  return null;
}

async function apiFetch<T>(path: string, init: RequestInit = {}, signal?: AbortSignal) {
  const token = getStoredToken();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(path, {
    ...init,
    signal,
    headers,
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      (response.status === 401 || response.status === 403
        ? "Bạn cần đăng nhập để xem chuyến đi."
        : `Yêu cầu thất bại (${response.status})`);
    throw new Error(message);
  }

  if (!payload) {
    throw new Error("Backend không trả về dữ liệu hợp lệ.");
  }

  return payload.result;
}

export function fetchCurrentUser(signal?: AbortSignal) {
  return apiFetch<CurrentUser>("/api/v1/users/my-info", {}, signal);
}

export function fetchMyTimelines(signal?: AbortSignal) {
  return apiFetch<Timeline[]>("/api/v1/timelines/mine", {}, signal);
}

export function fetchTimeline(timelineId: string, signal?: AbortSignal) {
  return apiFetch<Timeline>(`/api/v1/timelines/${timelineId}`, {}, signal);
}

export function createTimeline(input: TimelineInput) {
  return apiFetch<Timeline>("/api/v1/timelines", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTimeline(timelineId: string, input: TimelineInput) {
  return apiFetch<Timeline>(`/api/v1/timelines/${timelineId}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteTimeline(timelineId: string) {
  return apiFetch<void>(`/api/v1/timelines/${timelineId}`, {
    method: "DELETE",
  });
}

export function duplicateTimeline(timelineId: string) {
  return apiFetch<Timeline>(`/api/v1/timelines/${timelineId}/duplicate`, {
    method: "POST",
  });
}

export function upsertTimelineMember(
  timelineId: string,
  input: { username: string; role: Exclude<TimelineMemberRole, "OWNER"> },
) {
  return apiFetch<TimelineMember>(`/api/v1/timelines/${timelineId}/members`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function removeTimelineMember(timelineId: string, memberId: string) {
  return apiFetch<void>(`/api/v1/timelines/${timelineId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export function resetTimelineInviteCode(
  timelineId: string,
  input: { role: TimelineMemberRole; maxUses?: number; expiresInHours?: number },
) {
  return apiFetch<InviteCodeResult>(`/api/v1/timelines/${timelineId}/invite-code/reset`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function joinTimelineByCode(code: string) {
  return apiFetch<JoinByCodeResult>("/api/v1/timelines/join-by-code", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function createTimelineEvent(timelineId: string, input: TimelineEventInput) {
  return apiFetch<TimelineEvent>(`/api/v1/timelines/${timelineId}/events`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchTimelineEvents(
  timelineId: string,
  rangeStart: string,
  rangeEnd: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ rangeStart, rangeEnd });
  return apiFetch<TimelineEvent[]>(
    `/api/v1/timelines/${timelineId}/events?${params.toString()}`,
    {},
    signal,
  );
}

export function moveTimelineEvent(
  timelineId: string,
  eventId: string,
  input: MoveTimelineEventInput,
) {
  return apiFetch<TimelineEvent>(`/api/v1/timelines/${timelineId}/events/${eventId}/move`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function resizeTimelineEvent(
  timelineId: string,
  eventId: string,
  input: ResizeTimelineEventInput,
) {
  return apiFetch<TimelineEvent>(`/api/v1/timelines/${timelineId}/events/${eventId}/resize`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function reorderTimelineEvent(
  timelineId: string,
  eventId: string,
  input: ReorderTimelineEventInput,
) {
  return apiFetch<TimelineEvent>(`/api/v1/timelines/${timelineId}/events/${eventId}/reorder`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteTimelineEvent(timelineId: string, eventId: string) {
  return apiFetch<void>(`/api/v1/timelines/${timelineId}/events/${eventId}`, {
    method: "DELETE",
  });
}

export async function fetchRecentNotifications(signal?: AbortSignal) {
  const page = await fetchNotifications({ page: 0, size: 6 }, signal);

  return page.content;
}

export function fetchNotifications(query: NotificationQuery = {}, signal?: AbortSignal) {
  const params = new URLSearchParams();
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 20));
  if (query.status) params.set("status", query.status);
  if (query.category) params.set("category", query.category);
  if (query.includeArchived) params.set("includeArchived", "true");

  return apiFetch<SpringPage<NotificationItem>>(
    `/api/v1/notifications?${params.toString()}`,
    {},
    signal,
  );
}

export function fetchNotificationUnreadCount(signal?: AbortSignal) {
  return apiFetch<NotificationUnreadCount>("/api/v1/notifications/unread-count", {}, signal);
}

export function fetchNotificationPreferences(signal?: AbortSignal) {
  return apiFetch<NotificationPreference[]>("/api/v1/notifications/preferences", {}, signal);
}

export function updateNotificationPreference(
  category: NotificationCategory,
  input: NotificationPreferenceInput,
) {
  return apiFetch<NotificationPreference>(`/api/v1/notifications/preferences/${category}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function markNotificationAsRead(notificationId: string) {
  return apiFetch<NotificationItem>(`/api/v1/notifications/${notificationId}/read`, {
    method: "PATCH",
  });
}

export function markAllNotificationsAsRead() {
  return apiFetch<void>("/api/v1/notifications/read-all", {
    method: "PATCH",
  });
}

export function archiveNotification(notificationId: string) {
  return apiFetch<void>(`/api/v1/notifications/${notificationId}`, {
    method: "DELETE",
  });
}

export function tripCoverImage(timeline: Timeline) {
  return (
    timeline.events.find((event) => event.place?.imageUrl)?.place?.imageUrl ||
    `https://picsum.photos/seed/${encodeURIComponent(timeline.id)}/960/640`
  );
}
