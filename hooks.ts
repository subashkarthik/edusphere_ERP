
import { useState, useEffect, useCallback } from 'react';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Global in-memory cache for API requests
const apiCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute frontend cache

/**
 * Generic hook for fetching API data with loading/error states.
 * Uses a global cache to provide instant UI transitions.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  fallback?: T,
  deps: any[] = [],
  cacheKey?: string // Optional key to enable cross-component caching
): UseApiResult<T> {
  // Generate a key based on deps if not provided
  const key = cacheKey || JSON.stringify(deps);
  
  const [data, setData] = useState<T | null>(() => {
    const cached = apiCache.get(key);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.data;
    }
    return fallback !== undefined ? fallback : null;
  });
  
  const [loading, setLoading] = useState(!data); // Don't show loading if we have cached data
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (isRefetch = false) => {
    if (!isRefetch && !loading && !data) setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
      apiCache.set(key, { data: result, timestamp: Date.now() });
    } catch (err: any) {
      console.warn('[API]', err.message);
      setError(err.message || 'Failed to fetch data');
      if (fallback !== undefined) {
        setData(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [key, ...deps]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: () => fetch(true) };
}
