/**
 * Server-side in-memory cache with TTL.
 * Reduces Firestore reads for frequently accessed data.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Get a cached value, or fetch it using the provided function.
 *
 * @param key - Cache key
 * @param ttlSeconds - Time-to-live in seconds
 * @param fetcher - Async function to fetch the data if cache misses
 * @returns The cached or freshly fetched data
 *
 * @example
 * ```ts
 * const settings = await getCached("payment-settings", 300, async () => {
 *   const doc = await adminDb.collection("settings").doc("payments").get();
 *   return doc.data();
 * });
 * ```
 */
export async function getCached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key) as CacheEntry<T> | undefined;

  if (existing && existing.expiresAt > now) {
    return existing.data;
  }

  const data = await fetcher();
  cache.set(key, { data, expiresAt: now + ttlSeconds * 1000 });
  return data;
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache keys matching a prefix.
 */
export function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  cache.clear();
}
