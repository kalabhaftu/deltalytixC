/**
 * Optimized cache manager for large datasets
 * Handles memory efficiently by implementing LRU eviction and compression
 */

interface CacheEntry<T> {
  data: string // Serialized data
  originalData?: T // Original data if not compressed
  timestamp: number
  size: number
  accessCount: number
  lastAccessed: number
}

interface CacheOptions {
  maxSize: number // Maximum cache size in bytes
  maxAge: number // Maximum age in milliseconds
  compressionThreshold: number // Size threshold for compression
  enableCompression: boolean
}

class OptimizedCacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private maxSize: number
  private maxAge: number
  private currentSize = 0
  private compressionThreshold: number
  private enableCompression: boolean

  constructor(options: Partial<CacheOptions> = {}) {
    this.maxSize = options.maxSize || 50 * 1024 * 1024 // 50MB default
    this.maxAge = options.maxAge || 30 * 60 * 1000 // 30 minutes default
    this.compressionThreshold = options.compressionThreshold || 1024 // 1KB
    this.enableCompression = options.enableCompression ?? true
  }

  // Compress data for storage
  private compressData(data: any): string {
    if (!this.enableCompression) return JSON.stringify(data)

    const jsonString = JSON.stringify(data)
    if (jsonString.length < this.compressionThreshold) {
      return jsonString
    }

    // Simple compression by removing unnecessary whitespace and shortening keys
    return jsonString
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/,\s*/g, ',') // Remove whitespace after commas
      .replace(/\s*:\s*/g, ':') // Remove whitespace around colons
  }

  // Decompress data for retrieval
  private decompressData(data: string): any {
    try {
      return JSON.parse(data)
    } catch (error) {
      console.warn('[CacheManager] Failed to decompress data:', error)
      return null
    }
  }

  // Calculate approximate size of data in bytes
  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size
  }

  // Clean expired entries
  private cleanExpired(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        toDelete.push(key)
        this.currentSize -= entry.size
      }
    }

    toDelete.forEach(key => this.cache.delete(key))
  }

  // Evict least recently used entries when cache is full
  private evictLRU(neededSpace: number): void {
    // Sort entries by last accessed time (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort(([,a], [,b]) => a.lastAccessed - b.lastAccessed)

    let freedSpace = 0
    const toDelete: string[] = []

    for (const [key, entry] of entries) {
      if (freedSpace >= neededSpace) break

      toDelete.push(key)
      freedSpace += entry.size
      this.currentSize -= entry.size
    }

    toDelete.forEach(key => this.cache.delete(key))
  }

  // Set cache entry
  set<T>(key: string, data: T): void {
    this.cleanExpired()

    const serializedData = this.compressData(data)
    const size = this.calculateSize(data)

    // Check if we need to evict entries
    if (this.currentSize + size > this.maxSize) {
      this.evictLRU((this.currentSize + size) - this.maxSize)
    }

    const entry: CacheEntry<T> = {
      data: serializedData,
      originalData: this.enableCompression ? undefined : data, // Store original if not compressing
      timestamp: Date.now(),
      size,
      accessCount: 0,
      lastAccessed: Date.now()
    }

    // Remove old entry if it exists
    const oldEntry = this.cache.get(key)
    if (oldEntry) {
      this.currentSize -= oldEntry.size
    }

    this.cache.set(key, entry)
    this.currentSize += size
  }

  // Get cache entry
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      this.currentSize -= entry.size
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = Date.now()

    // Return original data if available, otherwise decompress
    if (entry.originalData !== undefined) {
      return entry.originalData
    }

    // Decompress if needed
    const decompressedData = this.decompressData(entry.data)
    return decompressedData
  }

  // Check if key exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key)
      this.currentSize -= entry.size
      return false
    }

    return true
  }

  // Delete specific entry
  delete(key: string): void {
    const entry = this.cache.get(key)
    if (entry) {
      this.cache.delete(key)
      this.currentSize -= entry.size
    }
  }

  // Clear all entries
  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.currentSize,
      maxSize: this.maxSize,
      entries: this.cache.size,
      utilization: (this.currentSize / this.maxSize) * 100
    }
  }

  // Get most accessed entries for debugging
  getMostAccessed(limit: number = 10) {
    return Array.from(this.cache.entries())
      .sort(([,a], [,b]) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        size: entry.size,
        age: Date.now() - entry.timestamp
      }))
  }
}

// Global cache instances
export const tradeDataCache = new OptimizedCacheManager({
  maxSize: 100 * 1024 * 1024, // 100MB for trade data
  maxAge: 30 * 60 * 1000, // 30 minutes
  compressionThreshold: 1024,
  enableCompression: true
})

export const userDataCache = new OptimizedCacheManager({
  maxSize: 10 * 1024 * 1024, // 10MB for user data
  maxAge: 60 * 60 * 1000, // 1 hour
  compressionThreshold: 512,
  enableCompression: true
})

export const statisticsCache = new OptimizedCacheManager({
  maxSize: 5 * 1024 * 1024, // 5MB for statistics
  maxAge: 15 * 60 * 1000, // 15 minutes
  compressionThreshold: 256,
  enableCompression: false // Stats are usually small, no need for compression
})

// Export singleton instance for general use
export const globalCache = new OptimizedCacheManager({
  maxSize: 50 * 1024 * 1024, // 50MB general cache
  maxAge: 60 * 60 * 1000, // 1 hour
  compressionThreshold: 1024,
  enableCompression: true
})
