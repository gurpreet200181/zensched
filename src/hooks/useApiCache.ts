import { useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface ApiCacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

export const useApiCache = <T>(options: ApiCacheOptions = {}) => {
  const { ttl = 5 * 60 * 1000, maxSize = 100 } = options; // Default 5 minutes TTL
  const cache = useRef(new Map<string, CacheEntry<T>>());
  const [loading, setLoading] = useState<Set<string>>(new Set());

  const getCacheKey = (key: string | object): string => {
    return typeof key === 'string' ? key : JSON.stringify(key);
  };

  const get = useCallback((key: string | object): T | null => {
    const cacheKey = getCacheKey(key);
    const entry = cache.current.get(cacheKey);
    
    if (!entry) return null;
    
    // Check if entry has expired
    if (Date.now() > entry.expiry) {
      cache.current.delete(cacheKey);
      return null;
    }
    
    return entry.data;
  }, []);

  const set = useCallback((key: string | object, data: T) => {
    const cacheKey = getCacheKey(key);
    
    // Remove oldest entries if cache is full
    if (cache.current.size >= maxSize) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }
    
    cache.current.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }, [ttl, maxSize]);

  const fetchWithCache = useCallback(async <R>(
    key: string | object,
    fetchFn: () => Promise<R>,
    forceRefresh = false
  ): Promise<R> => {
    const cacheKey = getCacheKey(key);
    
    // Return cached data if available and not forcing refresh
    if (!forceRefresh) {
      const cached = get(key) as unknown as R;
      if (cached !== null) return cached;
    }
    
    // Prevent duplicate requests
    if (loading.has(cacheKey)) {
      // Wait for ongoing request
      while (loading.has(cacheKey)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      const cached = get(key) as unknown as R;
      if (cached !== null) return cached;
    }
    
    setLoading(prev => new Set(prev).add(cacheKey));
    
    try {
      const data = await fetchFn();
      set(key, data as unknown as T);
      return data;
    } finally {
      setLoading(prev => {
        const next = new Set(prev);
        next.delete(cacheKey);
        return next;
      });
    }
  }, [get, set]);

  const clear = useCallback((key?: string | object) => {
    if (key) {
      const cacheKey = getCacheKey(key);
      cache.current.delete(cacheKey);
    } else {
      cache.current.clear();
    }
  }, []);

  const isLoading = useCallback((key: string | object): boolean => {
    const cacheKey = getCacheKey(key);
    return loading.has(cacheKey);
  }, [loading]);

  return {
    get,
    set,
    fetchWithCache,
    clear,
    isLoading,
    size: cache.current.size
  };
};