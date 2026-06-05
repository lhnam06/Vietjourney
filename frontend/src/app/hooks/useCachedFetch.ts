/**
 * Stale-while-revalidate hook.
 *
 * On first render:
 *   - If cached data exists → return it immediately (isLoading = false).
 *   - If stale → trigger a background revalidation while showing stale data.
 *   - If no cache → fetch normally (isLoading = true).
 *
 * Usage:
 *   const { data, isLoading, refresh } = useCachedFetch(
 *     `timeline:${tripId}`,
 *     () => getTimelineDetail(tripId, token)
 *   );
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cacheGet, cacheIsStale, cacheSet } from '../lib/apiCache';

type Options = {
  ttlMs?: number;
  enabled?: boolean;
};

type Result<T> = {
  data: T | undefined;
  isLoading: boolean;
  isRevalidating: boolean;
  error: Error | null;
  refresh: () => void;
};

export function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  { ttlMs, enabled = true }: Options = {}
): Result<T> {
  const cached = cacheGet<T>(cacheKey);

  const [data, setData] = useState<T | undefined>(cached);
  const [isLoading, setIsLoading] = useState(!cached && enabled);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(
    async (background: boolean) => {
      if (background) {
        setIsRevalidating(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await fetcher();
        if (!mountedRef.current) return;
        cacheSet(cacheKey, result);
        setData(result);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        if (!mountedRef.current) return;
        setIsLoading(false);
        setIsRevalidating(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cacheKey]
  );

  useEffect(() => {
    if (!enabled) return;

    const hasCached = !!cacheGet<T>(cacheKey);
    const stale = cacheIsStale(cacheKey, ttlMs);

    if (!hasCached) {
      run(false);
    } else if (stale) {
      run(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]);

  const refresh = useCallback(() => {
    run(false);
  }, [run]);

  return { data, isLoading, isRevalidating, error, refresh };
}
