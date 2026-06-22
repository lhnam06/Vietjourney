interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

interface ReadThroughCacheOptions<T> {
  key: string;
  loader: () => Promise<T>;
  signal?: AbortSignal;
  ttlMs: number;
}

const cacheEntries = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const keyVersions = new Map<string, number>();
let cacheEpoch = 0;

function createAbortError() {
  const error = new Error("Request was aborted.");
  error.name = "AbortError";
  return error;
}

function getKeyVersion(key: string) {
  return keyVersions.get(key) ?? 0;
}

function setKeyVersion(key: string, version: number) {
  keyVersions.set(key, version);
}

function removeMatchingEntries(predicate: (key: string) => boolean) {
  const knownKeys = new Set<string>([
    ...cacheEntries.keys(),
    ...inFlightRequests.keys(),
    ...keyVersions.keys(),
  ]);

  for (const key of cacheEntries.keys()) {
    if (predicate(key)) {
      cacheEntries.delete(key);
    }
  }

  for (const key of inFlightRequests.keys()) {
    if (predicate(key)) {
      inFlightRequests.delete(key);
    }
  }

  for (const key of knownKeys) {
    if (predicate(key)) {
      setKeyVersion(key, getKeyVersion(key) + 1);
    }
  }
}

function withAbortSignal<T>(promise: Promise<T>, signal?: AbortSignal) {
  if (!signal) {
    return promise;
  }

  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    const handleAbort = () => {
      signal.removeEventListener("abort", handleAbort);
      reject(createAbortError());
    };

    signal.addEventListener("abort", handleAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener("abort", handleAbort);
        reject(error);
      },
    );
  });
}

export function invalidateReadCacheKey(key: string) {
  removeMatchingEntries((entryKey) => entryKey === key);
}

export function invalidateReadCachePrefix(prefix: string) {
  removeMatchingEntries((entryKey) => entryKey.startsWith(prefix));
}

export function clearReadCache() {
  cacheEpoch += 1;
  cacheEntries.clear();
  inFlightRequests.clear();
  keyVersions.clear();
}

export async function readThroughCache<T>({
  key,
  loader,
  signal,
  ttlMs,
}: ReadThroughCacheOptions<T>) {
  const cachedEntry = cacheEntries.get(key) as CacheEntry<T> | undefined;
  const now = Date.now();

  if (cachedEntry && cachedEntry.expiresAt > now) {
    return withAbortSignal(Promise.resolve(cachedEntry.value), signal);
  }

  if (cachedEntry && cachedEntry.expiresAt <= now) {
    cacheEntries.delete(key);
  }

  const existingRequest = inFlightRequests.get(key) as Promise<T> | undefined;
  if (existingRequest) {
    return withAbortSignal(existingRequest, signal);
  }

  const requestEpoch = cacheEpoch;
  const requestVersion = getKeyVersion(key);
  let request: Promise<T>;
  request = loader()
    .then((value) => {
      if (requestEpoch === cacheEpoch && requestVersion === getKeyVersion(key)) {
        cacheEntries.set(key, {
          expiresAt: Date.now() + ttlMs,
          value,
        });
      }

      return value;
    })
    .finally(() => {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, request);

  return withAbortSignal(request, signal);
}
