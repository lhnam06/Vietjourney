const _getApiBase = () => (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
export interface ChatMessage {
  id: string;
  timelineId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: string; // ISO string
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path.startsWith("/") ? _getApiBase() + path : _getApiBase() + "/" + path, { ...init, headers });
  
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Yêu cầu thất bại (${response.status})`);
  }

  if (!payload || !('result' in payload)) {
    throw new Error('Backend không trả về dữ liệu hợp lệ.');
  }

  return payload.result as T;
}

export async function getChatHistory(timelineId: string, token: string, page: number = 0, size: number = 50): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(`/api/v1/timelines/${timelineId}/chat?page=${page}&size=${size}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function sendChatMessage(timelineId: string, token: string, content: string): Promise<ChatMessage> {
  return apiFetch<ChatMessage>(`/api/v1/timelines/${timelineId}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ content }),
  });
}
