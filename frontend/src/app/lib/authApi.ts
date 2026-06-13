interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export interface AuthResult {
  token: string;
  success: boolean;
}

export interface RegisterInput {
  username: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface UserInfo {
  id: string;
  username: string;
  displayName?: string | null;
}

export const authStorageKey = "token";

async function authFetch<T>(path: string, init: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Yêu cầu thất bại (${response.status})`);
  }

  if (!payload) {
    throw new Error("Backend không trả về dữ liệu hợp lệ.");
  }

  return payload.result;
}

export function getAuthToken() {
  return localStorage.getItem(authStorageKey);
}

export function saveAuthToken(token: string) {
  localStorage.setItem(authStorageKey, token);
}

export function clearAuthToken() {
  localStorage.removeItem(authStorageKey);
}

export function login(input: LoginInput) {
  return authFetch<AuthResult>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function register(input: RegisterInput) {
  return authFetch<UserInfo>("/api/v1/users/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
