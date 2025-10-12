/**
 * Automatic Cache Cleanup Hook
 * 
 * This hook automatically detects and clears stale caches when:
 * - App loads and cache version doesn't match
 * - Accounts are created, updated, or deleted
 * - User logs in/out
 * - Critical data changes occur
 */

import { useEffect, useRef } from 'react'
import { autoCleanStaleCache, clearAccountCaches, getCacheStats } from '@/lib/cache-manager'
import { invalidateAccountsCache } from './use-accounts'

interface UseAutoCacheCleanupOptions {
  userId?: string
  enabled?: boolean
}

export function useAutoCacheCleanup(options: UseAutoCacheCleanupOptions = {}) {
  const { userId, enabled = true } = options
  const hasRunRef = useRef(false)
  const lastUserIdRef = useRef<string | undefined>(undefined)
  
  useEffect(() => {
    if (!enabled) return
    
    // Run once on mount to check for stale caches
    if (!hasRunRef.current) {
      hasRunRef.current = true
      
      ;(async () => {
        try {
          const wasCleared = await autoCleanStaleCache()
          
          if (wasCleared) {
            console.log('[AutoCache] Stale cache detected and cleared automatically')
            
            // Also invalidate in-memory caches
            invalidateAccountsCache('auto-cleanup on version mismatch')
            
            // Log cache stats after cleanup
            const stats = getCacheStats()
            console.log('[AutoCache] Cache stats after cleanup:', stats)
          }
        } catch (error) {
          console.error('[AutoCache] Error during auto cleanup:', error)
        }
      })()
    }
    
    // Detect user change (login/logout/switch user)
    if (userId && lastUserIdRef.current && userId !== lastUserIdRef.current) {
      console.log('[AutoCache] User changed, clearing account-specific caches')
      
      // Clear account-related caches
      clearAccountCaches()
      invalidateAccountsCache('user changed')
    }
    
    lastUserIdRef.current = userId
  }, [userId, enabled])
  
  // Return manual cleanup function for emergency use
  return {
    manualCleanup: async () => {
      console.log('[AutoCache] Manual cleanup triggered')
      await autoCleanStaleCache()
      clearAccountCaches()
      invalidateAccountsCache('manual cleanup')
    }
  }
}

/**
 * Hook to automatically clear caches when accounts change
 */
export function useAccountChangeDetection() {
  const accountsVersionRef = useRef<number>(0)
  
  return {
    notifyAccountsChanged: () => {
      accountsVersionRef.current++
      console.log('[AutoCache] Accounts changed, clearing account caches')
      clearAccountCaches()
      invalidateAccountsCache('accounts changed')
    }
  }
}

