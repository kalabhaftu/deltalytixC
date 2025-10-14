/**
 * Unified Cache Layer
 * 
 * Automatically uses Redis when available, falls back to memory cache
 * Provides a unified API regardless of backend
 */

import {
  getFromCache as redisGet,
  setInCache as redisSet,
  deleteFromCache as redisDelete,
  deleteCachePattern as redisDeletePattern,
  isRedisAvailable,
  CachePrefix,
  CacheTTL,
} from './redis-cache'

import {
  memGet,
  memSet,
  memDelete,
  memDeletePattern,
} from './memory-cache'

export { CachePrefix, CacheTTL }

/**
 * Get value from cache (Redis or memory)
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (isRedisAvailable()) {
    return await redisGet<T>(key)
  }
  
  return memGet<T>(key)
}

/**
 * Set value in cache (Redis or memory)
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttl: number = CacheTTL.SHORT
): Promise<boolean> {
  if (isRedisAvailable()) {
    return await redisSet(key, value, ttl)
  }
  
  memSet(key, value, ttl)
  return true
}

/**
 * Delete key from cache (Redis or memory)
 */
export async function deleteCached(key: string): Promise<boolean> {
  if (isRedisAvailable()) {
    return await redisDelete(key)
  }
  
  memDelete(key)
  return true
}

/**
 * Delete keys matching pattern (Redis or memory)
 */
export async function deleteCachedPattern(pattern: string): Promise<number> {
  if (isRedisAvailable()) {
    return await redisDeletePattern(pattern)
  }
  
  return memDeletePattern(pattern)
}

/**
 * Get or set pattern (cache-aside) - unified
 */
export async function getOrSetCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.SHORT
): Promise<T> {
  // Try to get from cache
  const cached = await getCached<T>(key)
  if (cached !== null) {
    return cached
  }

  // Cache miss - fetch fresh data
  const data = await fetcher()
  
  // Store in cache for next time
  await setCached(key, data, ttl)
  
  return data
}

/**
 * Invalidate all user-specific caches
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    deleteCachedPattern(`${CachePrefix.DASHBOARD_STATS}${userId}*`),
    deleteCachedPattern(`${CachePrefix.USER_DATA}${userId}*`),
    deleteCachedPattern(`${CachePrefix.ACCOUNT_LIST}${userId}*`),
    deleteCachedPattern(`${CachePrefix.TRADE_LIST}${userId}*`),
    deleteCachedPattern(`${CachePrefix.CALENDAR_DATA}${userId}*`),
  ])
}

/**
 * Get current cache backend
 */
export function getCacheBackend(): 'redis' | 'memory' {
  return isRedisAvailable() ? 'redis' : 'memory'
}

