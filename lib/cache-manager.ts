/**
 * Comprehensive Cache Management System
 * 
 * This module provides centralized cache management for:
 * - In-memory caches (React hooks)
 * - LocalStorage (Zustand stores, user preferences)
 * - SessionStorage
 * - Next.js server caches
 * - Service Worker caches
 */

const CACHE_VERSION_KEY = 'app_cache_version'
const CURRENT_CACHE_VERSION = '2.0.0' // Increment to force cache clear

/**
 * Cache version management
 */
export function checkCacheVersion(): boolean {
  if (typeof window === 'undefined') return true
  
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY)
    
    if (storedVersion !== CURRENT_CACHE_VERSION) {
      console.log(`[Cache] Version mismatch: ${storedVersion} -> ${CURRENT_CACHE_VERSION}. Clearing caches...`)
      return false
    }
    
    return true
  } catch (error) {
    console.error('[Cache] Error checking version:', error)
    return true
  }
}

export function updateCacheVersion(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_CACHE_VERSION)
    } catch (error) {
    console.error('[Cache] Error updating version:', error)
  }
}

/**
 * LocalStorage cache management
 */
export interface LocalStorageCacheItem {
  key?: string
  pattern?: RegExp
  description: string
}

// All localStorage keys used in the app
export const LOCAL_STORAGE_KEYS: LocalStorageCacheItem[] = [
  { key: 'accounts-store', description: 'Account list cache' },
  { key: 'equity-chart-store', description: 'Equity chart settings' },
  { key: 'table-config-store', description: 'Table configuration' },
  { key: 'calendar-view-store', description: 'Calendar view settings' },
  { key: 'modal-state-store', description: 'Modal state' },
  { key: 'theme', description: 'Theme preference' },
  { key: 'consent-banner-dismissed', description: 'Cookie consent' },
  { key: 'user-timezone', description: 'User timezone' },
  { pattern: /^dashboard-layout-/, description: 'Dashboard layouts (user-specific)' },
  { pattern: /^sidebar-/, description: 'Sidebar state' },
  { pattern: /^table-column-/, description: 'Table column visibility' },
]

/**
 * Get all cache keys matching patterns
 */
function getAllCacheKeys(excludeKeys: string[] = []): string[] {
  if (typeof window === 'undefined') return []
  
  const keys: string[] = []
  
  try {
    // Get all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && !excludeKeys.includes(key)) {
        keys.push(key)
      }
    }
  } catch (error) {
    console.error('[Cache] Error getting cache keys:', error)
  }
  
  return keys
}

/**
 * Clear specific localStorage cache keys
 */
export function clearLocalStorageCache(keysToKeep: string[] = ['theme', 'consent-banner-dismissed']): number {
  if (typeof window === 'undefined') return 0
  
  let clearedCount = 0
  const allKeys = getAllCacheKeys()
  
  try {
    for (const key of allKeys) {
      // Skip keys we want to keep
      if (keysToKeep.includes(key)) continue
      
      // Check if it's a cache-related key
      const isCacheKey = LOCAL_STORAGE_KEYS.some(item => {
        if (item.pattern) {
          return item.pattern.test(key)
        }
        return item.key === key
      })
      
      if (isCacheKey) {
        localStorage.removeItem(key)
        clearedCount++
        console.log(`[Cache] Removed localStorage key: ${key}`)
      }
    }
  } catch (error) {
    console.error('[Cache] Error clearing localStorage:', error)
  }
  
  return clearedCount
}

/**
 * Clear SessionStorage
 */
export function clearSessionStorage(): number {
  if (typeof window === 'undefined') return 0
  
  try {
    const length = sessionStorage.length
    sessionStorage.clear()
    console.log(`[Cache] Cleared ${length} sessionStorage items`)
    return length
  } catch (error) {
    console.error('[Cache] Error clearing sessionStorage:', error)
    return 0
  }
}

/**
 * Clear Service Worker caches
 */
export async function clearServiceWorkerCaches(): Promise<number> {
  if (typeof window === 'undefined' || !('caches' in window)) return 0
  
  let clearedCount = 0
  
  try {
    const cacheNames = await caches.keys()
    await Promise.all(
      cacheNames.map(async (cacheName) => {
        await caches.delete(cacheName)
        clearedCount++
        console.log(`[Cache] Deleted Service Worker cache: ${cacheName}`)
      })
    )
  } catch (error) {
    console.error('[Cache] Error clearing Service Worker caches:', error)
  }
  
  return clearedCount
}

/**
 * Clear browser cache (IndexedDB)
 */
export async function clearIndexedDB(): Promise<number> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return 0
  
  let clearedCount = 0
  
  try {
    const databases = await window.indexedDB.databases()
    
    for (const db of databases) {
      if (db.name) {
        window.indexedDB.deleteDatabase(db.name)
        clearedCount++
        console.log(`[Cache] Deleted IndexedDB: ${db.name}`)
      }
    }
  } catch (error) {
    console.error('[Cache] Error clearing IndexedDB:', error)
  }
  
  return clearedCount
}

/**
 * Clear Next.js client-side router cache
 */
export function clearNextJSCache(): void {
  if (typeof window === 'undefined') return
  
  try {
    // Force reload to clear Next.js internal caches
    // This is a soft reload that preserves user state but clears router cache
    if ('__NEXT_DATA__' in window) {
      // @ts-ignore
      delete window.__NEXT_DATA__
      console.log('[Cache] Cleared Next.js client cache')
    }
  } catch (error) {
    console.error('[Cache] Error clearing Next.js cache:', error)
  }
}

/**
 * Comprehensive cache clear (all except user preferences)
 */
export async function clearAllCaches(options: {
  keepTheme?: boolean
  keepConsent?: boolean
  clearServiceWorker?: boolean
  clearIndexedDB?: boolean
} = {}): Promise<{
  localStorage: number
  sessionStorage: number
  serviceWorker: number
  indexedDB: number
}> {
  const {
    keepTheme = true,
    keepConsent = true,
    clearServiceWorker = false, // Conservative by default
    clearIndexedDB: shouldClearIndexedDB = false // Conservative by default
  } = options
  
  console.log('[Cache] Starting comprehensive cache clear...')
  
  const keysToKeep: string[] = []
  if (keepTheme) keysToKeep.push('theme')
  if (keepConsent) keysToKeep.push('consent-banner-dismissed')
  
  // Clear caches
  const localStorageCleared = clearLocalStorageCache(keysToKeep)
  const sessionStorageCleared = clearSessionStorage()
  const serviceWorkerCleared = clearServiceWorker ? await clearServiceWorkerCaches() : 0
  const indexedDBCleared = shouldClearIndexedDB ? await clearIndexedDB() : 0
  
  // Clear Next.js cache
  clearNextJSCache()
  
  // Update cache version
  updateCacheVersion()
  
  const results = {
    localStorage: localStorageCleared,
    sessionStorage: sessionStorageCleared,
    serviceWorker: serviceWorkerCleared,
    indexedDB: indexedDBCleared
  }
  
  console.log('[Cache] Cache clear complete:', results)
  
  return results
}

/**
 * Check and auto-clear stale caches on app load
 */
export async function autoCleanStaleCache(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  
  const versionValid = checkCacheVersion()
  
  if (!versionValid) {
    console.log('[Cache] Stale cache detected. Auto-clearing...')
    await clearAllCaches({
      keepTheme: true,
      keepConsent: true,
      clearServiceWorker: false,
      clearIndexedDB: false
    })
    return true
  }

  return false
}

/**
 * Clear account-related caches only
 */
export function clearAccountCaches(): number {
  if (typeof window === 'undefined') return 0
  
  let clearedCount = 0
  const accountKeys = [
    'accounts-store',
    'equity-chart-store',
    'table-config-store',
  ]
  
  try {
    for (const key of accountKeys) {
      localStorage.removeItem(key)
      clearedCount++
      console.log(`[Cache] Cleared account cache: ${key}`)
    }
    
    // Also clear dashboard layouts (they contain account-specific data)
    const allKeys = getAllCacheKeys()
    for (const key of allKeys) {
      if (key.startsWith('dashboard-layout-')) {
        localStorage.removeItem(key)
        clearedCount++
        console.log(`[Cache] Cleared dashboard layout: ${key}`)
      }
    }
  } catch (error) {
    console.error('[Cache] Error clearing account caches:', error)
  }
  
  return clearedCount
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  version: string
  localStorageSize: number
  localStorageKeys: number
  sessionStorageKeys: number
} {
  if (typeof window === 'undefined') {
    return {
      version: CURRENT_CACHE_VERSION,
      localStorageSize: 0,
      localStorageKeys: 0,
      sessionStorageKeys: 0
    }
  }
  
  let localStorageSize = 0
  let localStorageKeys = 0
  let sessionStorageKeys = 0
  
  try {
    // Calculate localStorage size
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key) || ''
        localStorageSize += key.length + value.length
        localStorageKeys++
      }
    }
    
    sessionStorageKeys = sessionStorage.length
  } catch (error) {
    console.error('[Cache] Error getting cache stats:', error)
  }
  
  return {
    version: CURRENT_CACHE_VERSION,
    localStorageSize,
    localStorageKeys,
    sessionStorageKeys
  }
}

