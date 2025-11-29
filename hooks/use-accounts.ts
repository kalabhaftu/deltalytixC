'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useUserStore } from '@/store/user-store'
import { useRouter } from 'next/navigation'

/**
 * OPTIMIZED: This hook now reads from the user store instead of making its own
 * server action calls. The data-provider populates the store, and this hook
 * simply transforms the data for consumers.
 * 
 * This eliminates duplicate POST /dashboard requests that were causing performance issues.
 */

interface UnifiedAccount {
  id: string
  number: string
  name: string
  propfirm: string
  broker: string | undefined
  startingBalance: number
  currentBalance?: number
  currentEquity?: number
  status: 'active' | 'failed' | 'funded' | 'passed' | 'pending'
  createdAt: string
  userId: string
  groupId: string | null
  group: {
    id: string
    name: string
  } | null
  accountType: 'prop-firm' | 'live'
  displayName: string
  tradeCount: number
  owner: {
    id: string
    email: string
  } | null
  isOwner: boolean
  currentPhase: any
  phaseAccountNumber?: string | null
  isArchived?: boolean
  currentPhaseDetails?: {
    phaseNumber: number
    status: string
    phaseId: string
    masterAccountId?: string
    evaluationType?: string
  } | null
}

interface UseAccountsResult {
  accounts: UnifiedAccount[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseAccountsOptions {
  includeFailed?: boolean
  includeArchived?: boolean
}

// Global broadcast system for cache updates
const realtimeSubscribers = new Set<() => void>()

export function broadcastAccountsUpdate() {
  realtimeSubscribers.forEach(callback => {
    try {
      callback()
    } catch (error) {
      // Ignore subscriber callback errors
    }
  })
}

// Subscribe to realtime updates
export function subscribeToAccountsUpdates(callback: () => void) {
  realtimeSubscribers.add(callback)
  return () => realtimeSubscribers.delete(callback)
}

// Legacy compatibility functions - now just trigger broadcasts
export function invalidateAccountsCache(_reason?: string) {
  broadcastAccountsUpdate()
}

export function clearAccountsCache() {
  broadcastAccountsUpdate()
}

/**
 * Optimized useAccounts hook that reads from the user store.
 * No longer makes its own server action calls - data comes from the centralized data-provider.
 */
export function useAccounts(options: UseAccountsOptions = {}): UseAccountsResult {
  const { includeFailed = false, includeArchived = false } = options
  const router = useRouter()
  
  // Read from store - this is populated by data-provider
  const storeAccounts = useUserStore(state => state.accounts)
  const isLoading = useUserStore(state => state.isLoading)
  const user = useUserStore(state => state.user)
  
  // Transform accounts to the UnifiedAccount format
  const accounts = useMemo(() => {
    if (!storeAccounts || !Array.isArray(storeAccounts)) {
      return []
    }

    return storeAccounts
      .filter((account: any) => {
        // Filter out archived accounts unless requested
        if (!includeArchived && account.isArchived) return false
        // Filter out failed accounts unless requested
        if (!includeFailed && account.status === 'failed') return false
        return true
      })
      .map((account: any): UnifiedAccount => {
        const phaseDetails = account.currentPhaseDetails || account.phaseDetails
        const currentPhase = phaseDetails?.phaseNumber || account.currentPhase || null
        const phaseAccountNumber = phaseDetails?.phaseId || null

        return {
          id: account.id,
          number: account.number,
          name: account.name || account.number,
          propfirm: account.propfirm || '',
          broker: account.broker || undefined,
          startingBalance: account.startingBalance || 0,
          currentBalance: undefined,
          currentEquity: undefined,
          status: account.status || 'active',
          createdAt: account.createdAt instanceof Date 
            ? account.createdAt.toISOString() 
            : (typeof account.createdAt === 'string' ? account.createdAt : new Date().toISOString()),
          userId: account.userId || user?.id || '',
          groupId: account.groupId || null,
          group: account.groupId ? { id: account.groupId, name: 'Group' } : null,
          accountType: account.propfirm ? 'prop-firm' : 'live',
          displayName: account.displayName || account.name || account.number,
          tradeCount: account.tradeCount || 0,
          owner: null,
          isOwner: true,
          currentPhase,
          phaseAccountNumber,
          isArchived: account.isArchived || false,
          currentPhaseDetails: phaseDetails || null
        }
      })
  }, [storeAccounts, includeFailed, includeArchived, user?.id])

  // Refetch: Clear caches, broadcast update, and trigger router refresh
  // This ensures the data-provider reloads fresh data from the server
  const refetch = useCallback(async () => {
    // Clear localStorage caches to force fresh data fetch
    try {
      localStorage.removeItem('bundled-data-cache')
      localStorage.removeItem('bundled-data-timestamp')
      localStorage.removeItem('account-filter-settings-cache')
    } catch (e) {
      // Ignore storage errors
    }
    
    // Broadcast update to force re-renders
    broadcastAccountsUpdate()
    
    // Trigger Next.js router refresh to reload server data
    router.refresh()
  }, [router])

  // Subscribe to broadcasts for reactivity
  const [, forceUpdate] = useState(0)
  
  useEffect(() => {
    const unsubscribe = subscribeToAccountsUpdates(() => {
      forceUpdate(n => n + 1)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  return {
    accounts,
    isLoading,
    error: null,
    refetch
  }
}
