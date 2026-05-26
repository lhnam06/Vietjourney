/**
 * Lightweight module-level stale-while-revalidate cache for API responses.
 *
 * - Cache lives in memory (survives React re-renders and SPA navigation).
 * - By default, entries are mirrored to sessionStorage (survives hard reload, same tab).
 * - Pass `persistent: true` to mirror to localStorage instead (survives new tabs and
 *   browser restarts — use only for non-sensitive listing data like "my timelines").
 * - TTL (default 5 min) controls when a background revalidation fires.
 */

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

type SetOptions = {
  /** Store in localStorage so the data survives across tabs and reloads. Default: false (sessionStorage). */
  persistent?: boolean;
};

const MEMORY: Map<string, CacheEntry<unknown>> = new Map();
const SESSION_PREFIX = 'vj:apicache:';
const LOCAL_PREFIX = 'vj:apicache-p:';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

function storageGet<T>(key: string): CacheEntry<T> | null {
  // Check localStorage first (persistent), then sessionStorage.
  for (const [storage, prefix] of [
    [localStorage, LOCAL_PREFIX],
    [sessionStorage, SESSION_PREFIX],
  ] as const) {
    try {
      const raw = storage.getItem(prefix + key);
      if (raw) return JSON.parse(raw) as CacheEntry<T>;
    } catch {
      // ignore
    }
  }
  return null;
}

function storagePut<T>(key: string, entry: CacheEntry<T>, persistent: boolean): void {
  const [storage, prefix] = persistent
    ? [localStorage, LOCAL_PREFIX]
    : [sessionStorage, SESSION_PREFIX];
  try {
    storage.setItem(prefix + key, JSON.stringify(entry));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

function storageRemove(key: string): void {
  for (const [storage, prefix] of [
    [localStorage, LOCAL_PREFIX],
    [sessionStorage, SESSION_PREFIX],
  ] as const) {
    try {
      storage.removeItem(prefix + key);
    } catch {
      // ignore
    }
  }
}

export function cacheGet<T>(key: string): T | undefined {
  const mem = MEMORY.get(key) as CacheEntry<T> | undefined;
  if (mem) return mem.data;
  const stored = storageGet<T>(key);
  if (stored) {
    MEMORY.set(key, stored as CacheEntry<unknown>);
    return stored.data;
  }
  return undefined;
}

export function cacheSet<T>(key: string, data: T, options: SetOptions = {}): void {
  const entry: CacheEntry<T> = { data, fetchedAt: Date.now() };
  MEMORY.set(key, entry as CacheEntry<unknown>);
  storagePut(key, entry, options.persistent ?? false);
}

export function cacheIsStale(key: string, ttlMs = DEFAULT_TTL_MS): boolean {
  const mem = MEMORY.get(key);
  if (!mem) {
    const stored = storageGet<unknown>(key);
    if (!stored) return true;
    MEMORY.set(key, stored);
    return Date.now() - stored.fetchedAt > ttlMs;
  }
  return Date.now() - mem.fetchedAt > ttlMs;
}

export function cacheClear(key: string): void {
  MEMORY.delete(key);
  storageRemove(key);
}

export function cacheClearAll(): void {
  MEMORY.clear();
  for (const [storage, prefix] of [
    [localStorage, LOCAL_PREFIX],
    [sessionStorage, SESSION_PREFIX],
  ] as const) {
    try {
      for (let i = storage.length - 1; i >= 0; i--) {
        const k = storage.key(i);
        if (k?.startsWith(prefix)) storage.removeItem(k);
      }
    } catch {
      // ignore
    }
  }
}
