import { API_BASE } from './api';

/** Resolve the WebSocket origin (no path). Returns null when realtime is unavailable. */
export function resolveWsBase(): string | null {
  const explicit = (import.meta.env.VITE_WS_BASE_URL as string | undefined)?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }

  // Local dev: route through Vite's /ws proxy → websocket-proxy on :8081
  if (import.meta.env.DEV) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}`;
  }

  // Production: only connect when explicitly configured
  return null;
}

/** Build a full WebSocket URL for a path such as `/ws/notifications`. */
export function buildWsUrl(path: string, params?: Record<string, string>): string | null {
  const base = resolveWsBase();
  if (!base) return null;

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/** Exposed for debugging / future API↔WS host mapping. */
export const configuredApiBase = API_BASE;
