type QueryParams = Record<string, string | number | boolean | null | undefined>;

export function buildWsUrl(path: string, params: QueryParams = {}) {
  const configuredBase = (import.meta.env.VITE_WS_URL || import.meta.env.VITE_WS_BASE_URL || "") as string;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = configuredBase.trim() || `${window.location.protocol}//${window.location.host}`;
  const pathForBase =
    base.replace(/\/$/, "").endsWith("/ws") && normalizedPath.startsWith("/ws/")
      ? normalizedPath.slice("/ws".length)
      : normalizedPath;

  const url = new URL(`${base.replace(/\/$/, "")}${pathForBase}`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";

  Object.entries(params).forEach(([key, value]) => {
    if (value != null) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}
