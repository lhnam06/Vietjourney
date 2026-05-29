import { requestJson } from './api';

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  roles?: { name: string; description?: string }[];
};

type AuthenticationResult = { token: string; success: boolean };

const TOKEN_KEY = 'vj_access_token';
export { TOKEN_KEY };

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function loginRequest(username: string, password: string): Promise<AuthenticationResult> {
  return requestJson<AuthenticationResult>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function registerRequest(body: {
  username: string;
  password: string;
  displayName: string;
}): Promise<AuthUser> {
  return requestJson<AuthUser>('/api/v1/users/register', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getMyInfo(accessToken: string): Promise<AuthUser> {
  return requestJson<AuthUser>('/api/v1/users/my-info', {
    method: 'GET',
    accessToken,
  });
}

export async function refreshTokenRequest(token: string): Promise<AuthenticationResult> {
  return requestJson<AuthenticationResult>('/api/v1/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function logoutRequest(token: string): Promise<void> {
  await requestJson<void>('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}
