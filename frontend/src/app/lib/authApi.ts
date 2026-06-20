const _getApiBase = () => (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
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

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface ChangeDisplayNameInput {
  displayName: string;
}

export interface UserInfo {
  id: string;
  username: string;
  displayName?: string | null;
}

export const authStorageKey = "token";

async function authFetch<T>(path: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  const response = await fetch(path.startsWith("/") ? _getApiBase() + path : _getApiBase() + "/" + path, {
    ...init,
    headers,
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

async function authenticatedAuthFetch<T>(path: string, init: RequestInit) {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token.replace(/^Bearer\s+/i, "")}`);
  }

  return authFetch<T>(path, {
    ...init,
    headers,
  });
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

export function changePassword(input: ChangePasswordInput) {
  return authenticatedAuthFetch<UserInfo>("/api/v1/users/my-password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function changeDisplayName(input: ChangeDisplayNameInput) {
  return authenticatedAuthFetch<UserInfo>("/api/v1/users/my-display-name", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
