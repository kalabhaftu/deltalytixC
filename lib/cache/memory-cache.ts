/**
 * In-Memory Cache Fallback
 * 
 * Provides caching when Redis/Upstash is not available
 * Uses LRU (Least Recently Used) eviction strategy
 * Memory-efficient for serverless environments
 */

interface CacheEntry<T> {
  value: T
  expires: number
  lastAccessed: number
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private maxSize: number = 100 // Maximum number of cached items
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Clean up expired entries every 60 seconds
    if (typeof process !== 'undefined' && !this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 60000)
    }
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      return null
    }

    // Update last accessed time
    entry.lastAccessed = Date.now()
    return entry.value as T
  }

  /**
   * Set value in cache with TTL
   */
  set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    // Evict least recently used if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000),
      lastAccessed: Date.now()
    })
  }

  /**
   * Delete key from cache
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Delete keys matching pattern
   */
  deletePattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    let count = 0

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime: number = Infinity

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Destroy cache and cleanup
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }
}

// Global instance
const memoryCache = new MemoryCache()

export default memoryCache

// Export convenience functions
export const memGet = <T>(key: string) => memoryCache.get<T>(key)
export const memSet = <T>(key: string, value: T, ttl?: number) => memoryCache.set(key, value, ttl)
export const memDelete = (key: string) => memoryCache.delete(key)
export const memDeletePattern = (pattern: string) => memoryCache.deletePattern(pattern)
export const memClear = () => memoryCache.clear()
export const memSize = () => memoryCache.size()

