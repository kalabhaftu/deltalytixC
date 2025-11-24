/**
 * Redis/Upstash Caching Layer
 * 
 * Provides high-performance caching for frequently accessed data
 * Compatible with Vercel KV (Upstash Redis)
 * 
 * Usage:
 * 1. Set up Vercel KV or Upstash Redis
 * 2. Add environment variables: KV_REST_API_URL, KV_REST_API_TOKEN
 * 3. Use cache functions in API routes
 */

import { kv } from '@vercel/kv'

// Cache key prefixes for organization
export const CachePrefix = {
  DASHBOARD_STATS: 'dashboard:stats:',
  USER_DATA: 'user:data:',
  ACCOUNT_LIST: 'account:list:',
  TRADE_LIST: 'trade:list:',
  CALENDAR_DATA: 'calendar:data:',
} as const

// Cache TTLs (Time To Live) in seconds
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
  VERY_LONG: 3600,  // 1 hour
} as const

/**
 * Get data from cache
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  try {
    if (!isRedisAvailable()) {
      return null
    }

    const data = await kv.get<T>(key)
    return data
  } catch (error) {
    return null
  }
}

/**
 * Set data in cache with TTL
 */
export async function setInCache<T>(
  key: string,
  value: T,
  ttl: number = CacheTTL.SHORT
): Promise<boolean> {
  try {
    if (!isRedisAvailable()) {
      return false
    }

    await kv.set(key, value, { ex: ttl })
    return true
  } catch (error) {
    return false
  }
}

/**
 * Delete key from cache
 */
export async function deleteFromCache(key: string): Promise<boolean> {
  try {
    if (!isRedisAvailable()) {
      return false
    }

    await kv.del(key)
    return true
  } catch (error) {
    return false
  }
}

/**
 * Delete multiple keys by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<number> {
  try {
    if (!isRedisAvailable()) {
      return 0
    }

    // Get all keys matching pattern
    const keys = await kv.keys(pattern)
    if (keys.length === 0) return 0

    // Delete all matching keys
    await kv.del(...keys)
    return keys.length
  } catch (error) {
    return 0
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

/**
 * Get or set pattern (cache-aside)
 * Tries to get from cache first, if miss, fetches data and caches it
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.SHORT
): Promise<T> {
  // Try to get from cache
  const cached = await getFromCache<T>(key)
  if (cached !== null) {
    return cached
  }

  // Cache miss - fetch fresh data
  const data = await fetcher()
  
  // Store in cache for next time
  await setInCache(key, data, ttl)
  
  return data
}

/**
 * Invalidate user-specific caches
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await Promise.all([
    deleteCachePattern(`${CachePrefix.DASHBOARD_STATS}${userId}*`),
    deleteCachePattern(`${CachePrefix.USER_DATA}${userId}*`),
    deleteCachePattern(`${CachePrefix.ACCOUNT_LIST}${userId}*`),
    deleteCachePattern(`${CachePrefix.TRADE_LIST}${userId}*`),
    deleteCachePattern(`${CachePrefix.CALENDAR_DATA}${userId}*`),
  ])
}

/**
 * Cache wrapper for dashboard stats
 */
export async function getCachedDashboardStats<T>(
  userId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `${CachePrefix.DASHBOARD_STATS}${userId}`
  return getOrSet(key, fetcher, CacheTTL.SHORT)
}

/**
 * Cache wrapper for user data
 */
export async function getCachedUserData<T>(
  userId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `${CachePrefix.USER_DATA}${userId}`
  return getOrSet(key, fetcher, CacheTTL.MEDIUM)
}

/**
 * Cache wrapper for account list
 */
export async function getCachedAccounts<T>(
  userId: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `${CachePrefix.ACCOUNT_LIST}${userId}`
  return getOrSet(key, fetcher, CacheTTL.MEDIUM)
}

/**
 * Cache wrapper for trade list
 */
export async function getCachedTrades<T>(
  userId: string,
  filters: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `${CachePrefix.TRADE_LIST}${userId}:${filters}`
  return getOrSet(key, fetcher, CacheTTL.SHORT)
}

/**
 * Cache wrapper for calendar data
 */
export async function getCachedCalendarData<T>(
  userId: string,
  month: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const key = `${CachePrefix.CALENDAR_DATA}${userId}:${month}`
  return getOrSet(key, fetcher, CacheTTL.MEDIUM)
}

