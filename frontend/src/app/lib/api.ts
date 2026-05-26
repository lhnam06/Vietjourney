const DEFAULT_BASE = 'http://localhost:8082';

export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || DEFAULT_BASE;

export type ApiEnvelope<T> = {
  code: number;
  message?: string;
  result?: T;
};

const SUCCESS = 1000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function requestJson<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null; signal?: AbortSignal } = {}
): Promise<T> {
  const { accessToken, headers: h, signal, ...rest } = init;
  const headers = new Headers(h);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store', ...rest, headers, signal });
  const text = await res.text();
  let data: ApiEnvelope<unknown> | null = null;
  try {
    data = text ? (JSON.parse(text) as ApiEnvelope<unknown>) : null;
  } catch {
    throw new ApiError('Phản hồi từ máy chủ không hợp lệ', 0);
  }

  if (!data) {
    throw new ApiError('Phản hồi từ máy chủ trống', 0);
  }

  if (data.code !== SUCCESS) {
    throw new ApiError(data.message || 'Có lỗi xảy ra', data.code);
  }

  if (data.result === undefined) {
    return undefined as T;
  }
  return data.result as T;
}
