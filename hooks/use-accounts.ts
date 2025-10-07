import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { filterActiveAccounts } from '@/lib/utils/account-filters'
import { getAccountsAction } from '@/server/accounts'
import { createClient } from '@/lib/supabase'

interface UnifiedAccount {
  id: string
  number: string
  name: string
  propfirm: string
  broker: string | undefined  // Changed from string | null to match Account interface
  startingBalance: number
  currentBalance?: number     // Added missing field
  currentEquity?: number      // Added missing field
  status: 'active' | 'failed' | 'funded' | 'passed'
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
  currentPhaseDetails?: {
    phaseNumber: number
    status: string
    phaseId: string
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
}

// Enhanced global cache system with real-time invalidation
let accountsCache: UnifiedAccount[] | null = null
let accountsPromise: Promise<UnifiedAccount[]> | null = null
let lastFetchTime = 0
const CACHE_DURATION = 30000 // 30 seconds - balanced for performance and freshness
let isCurrentlyFetching = false

// Real-time cache invalidation tracking
const cacheInvalidationTags = new Set<string>()
const realtimeSubscribers = new Set<() => void>()

// Global broadcast system for cache updates
export function broadcastAccountsUpdate() {
  realtimeSubscribers.forEach(callback => {
    try {
      callback()
    } catch (error) {
      console.warn('[useAccounts] Error in realtime subscriber callback:', error)
    }
  })
}

// Subscribe to realtime updates
export function subscribeToAccountsUpdates(callback: () => void) {
  realtimeSubscribers.add(callback)
  return () => realtimeSubscribers.delete(callback)
}

// Enhanced cache invalidation with broadcast
export function invalidateAccountsCache(reason?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CACHE] Invalidating accounts cache${reason ? `: ${reason}` : ''}`)
  }
  accountsCache = null
  accountsPromise = null
  lastFetchTime = 0
  cacheInvalidationTags.clear()
  
  // Notify all subscribers about the cache invalidation
  broadcastAccountsUpdate()
}

// Function to clear cache when accounts are deleted (legacy compatibility)
export function clearAccountsCache() {
  invalidateAccountsCache('legacy clearAccountsCache called')
}


export function useAccounts(options: UseAccountsOptions = {}): UseAccountsResult {
  const { includeFailed = false } = options
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const supabaseRef = useRef<any>(null)

  const fetchAccounts = useCallback(async (forceRefresh = false, source = 'manual') => {
    // Check cache first with smarter invalidation
    const now = Date.now()
    if (!forceRefresh && accountsCache && (now - lastFetchTime) < CACHE_DURATION) {
      setAccounts(accountsCache)
      setIsLoading(false)
      setError(null)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useAccounts] Using cached data (${source})`, { cacheAge: now - lastFetchTime })
      }
      return
    }

    // Prevent multiple simultaneous requests
    if (isCurrentlyFetching && !forceRefresh) {
      // If there's already a request in progress, wait for it
      if (accountsPromise) {
        try {
          const cachedAccounts = await accountsPromise
          setAccounts(cachedAccounts)
          setIsLoading(false)
          setError(null)
          return
        } catch (err) {
          // If the promise failed, continue with new request
        }
      }
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()
    isCurrentlyFetching = true

    try {
      setIsLoading(true)
      setError(null)

      // Create the promise and store it globally
      accountsPromise = (async (): Promise<UnifiedAccount[]> => {
        try {
          const accounts = await getAccountsAction()

          // Safety check - if accounts is undefined, treat as empty array
          if (!accounts) {
            console.warn('[useAccounts] Server action returned undefined, treating as empty array')
            return []
          }
          
          // Transform accounts to match the expected interface
          // No async operations needed - phase data already included from server
          const transformedAccounts: UnifiedAccount[] = accounts.map((account: any) => {
            // Use phase data that's already loaded from server (currentPhaseDetails)
            const phaseDetails = account.currentPhaseDetails
            const currentPhase = phaseDetails?.phaseNumber || account.currentPhase || null
            const phaseAccountNumber = phaseDetails?.phaseId || null

            // NOTE: currentBalance and currentEquity are set to undefined here
            // They should be calculated by components that have access to trades data
            // The accounts page calculates these values in accountsWithRealEquity useMemo

            return {
              id: account.id,
              number: account.number,
              name: account.name || account.number, // Ensure name is never null
              propfirm: account.propfirm,
              broker: account.broker || undefined, // Convert null to undefined
              startingBalance: account.startingBalance,
              currentBalance: undefined, // To be calculated by components with trade data
              currentEquity: undefined,  // To be calculated by components with trade data
              status: account.status || 'active',
              createdAt: account.createdAt instanceof Date ? account.createdAt.toISOString() : account.createdAt,
              userId: account.userId,
              groupId: account.groupId,
              group: account.groupId ? { id: account.groupId, name: 'Group' } : null,
              accountType: account.propfirm ? 'prop-firm' : 'live',
              displayName: account.name || account.number,
              tradeCount: account.tradeCount || 0, // Use actual trade count from server
              owner: null,
              isOwner: true,
              currentPhase,
              phaseAccountNumber,
              // Include phase details for components that need them
              currentPhaseDetails: phaseDetails
            }
          })

          return transformedAccounts
        } catch (error) {
          console.error('[useAccounts] Server action error:', error)
          throw error
        }
      })()

      const fetchedAccounts = await accountsPromise

      if (fetchedAccounts) {
        // Update cache and notify subscribers
        accountsCache = fetchedAccounts
        lastFetchTime = now

        setAccounts(fetchedAccounts)
        setError(null)
        
        // Broadcast update to other components
        broadcastAccountsUpdate()
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useAccounts] Updated cache with ${fetchedAccounts.length} accounts (${source})`)
        }
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          return
        }
        console.error('[useAccounts] Fetch error:', err.message)
        setError(err.message)
        // FIXED: Schedule toast outside render cycle to prevent setState during render
        setTimeout(() => {
          toast.error('Error', {
            description: 'Failed to fetch accounts. Please try again.',
          })
        }, 0)
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsLoading(false)
      accountsPromise = null
      isCurrentlyFetching = false
    }
  }, [])

  const refetch = useCallback(() => fetchAccounts(true), [fetchAccounts])

  useEffect(() => {
    fetchAccounts(false, 'initial')

    // Subscribe to global account updates
    const unsubscribeFromBroadcast = subscribeToAccountsUpdates(() => {
      // Only update if we have cached data to avoid unnecessary fetching
      if (accountsCache && !isCurrentlyFetching) {
        setAccounts(accountsCache)
      }
    })

    // Set up intelligent real-time subscriptions with enhanced debouncing and error handling
    const setupRealtimeSubscriptions = async () => {
      try {
        const supabase = createClient()
        
        // Check if supabase client supports real-time (not in mock mode)
        if (!(supabase as any).channel || typeof (supabase as any).channel !== 'function') {
          return
        }

        // Enhanced intelligent refresh system with better debouncing
        let refreshTimeout: NodeJS.Timeout | null = null
        let lastChangeTime = 0
        const MIN_REFRESH_INTERVAL = 2000 // Reduced to 2 seconds for better responsiveness
        const MAX_REFRESH_INTERVAL = 15000 // Reduced to 15 seconds for fresher data
        let pendingChanges = new Set<string>()

        const intelligentRefresh = (changeType: string, changeId?: string) => {
          const now = Date.now()
          const timeSinceLastChange = now - lastChangeTime

          // Track pending changes for smarter batching
          if (changeId) {
            pendingChanges.add(`${changeType}:${changeId}`)
          }

          // Don't refresh too frequently, but batch meaningful changes
          if (timeSinceLastChange < MIN_REFRESH_INTERVAL) {
            const remainingTime = MIN_REFRESH_INTERVAL - timeSinceLastChange
            if (refreshTimeout) {
              clearTimeout(refreshTimeout)
            }
            refreshTimeout = setTimeout(() => {
              lastChangeTime = Date.now()
              pendingChanges.clear()
              invalidateAccountsCache('batched realtime changes')
              fetchAccounts(true)
            }, remainingTime)
            return
          }

          // Update last change time and refresh immediately for significant changes
          lastChangeTime = now
          pendingChanges.clear()
          invalidateAccountsCache('immediate realtime change')
          fetchAccounts(true)
        }

        // Subscribe to accounts table changes with better filtering
        const accountsSubscription = (supabase as any)
          .channel('accounts-realtime-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'Account'
            },
          (payload: any) => {
            const changeId = payload.new?.id || payload.old?.id
            // Refresh for all account changes - balance, status, etc.
            intelligentRefresh('account', changeId)
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[useAccounts] Error subscribing to account changes')
          }
        })

        // Subscribe to trades table changes with account impact detection
        const tradesSubscription = (supabase as any)
          .channel('trades-realtime-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'Trade'
            },
          (payload: any) => {
            const changeId = payload.new?.id || payload.old?.id
            // Trades affect account equity and trade counts
            intelligentRefresh('trade', changeId)
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[useAccounts] Error subscribing to trade changes')
          }
        })

        // Subscribe to prop firm master accounts and phases
        const propFirmSubscription = (supabase as any)
          .channel('propfirm-realtime-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'MasterAccount'
            },
          (payload: any) => {
            const changeId = payload.new?.id || payload.old?.id
            intelligentRefresh('prop-firm', changeId)
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'PhaseAccount'
          },
          (payload: any) => {
            const changeId = payload.new?.id || payload.old?.id
            intelligentRefresh('phase', changeId)
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR') {
            console.warn('[useAccounts] Error subscribing to prop firm changes')
          }
        })

        supabaseRef.current = { accountsSubscription, tradesSubscription, propFirmSubscription }

        // Enhanced cleanup function
        const cleanup = () => {
          if (refreshTimeout) {
            clearTimeout(refreshTimeout)
            refreshTimeout = null
          }
          pendingChanges.clear()
          accountsSubscription?.unsubscribe()
          tradesSubscription?.unsubscribe()
          propFirmSubscription?.unsubscribe()
        }

        // Store cleanup function
        supabaseRef.current.cleanup = cleanup
      } catch (error) {
        console.error('[useAccounts] Error setting up real-time subscriptions:', error)
        // Don't fail the hook if real-time setup fails
      }
    }

    setupRealtimeSubscriptions()

    return () => {
      // Cleanup: abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Unsubscribe from broadcast updates
      unsubscribeFromBroadcast()

      // Cleanup: unsubscribe from real-time channels with proper cleanup
      if (supabaseRef.current?.cleanup) {
        supabaseRef.current.cleanup()
      } else if (supabaseRef.current) {
        const { accountsSubscription, tradesSubscription, propFirmSubscription } = supabaseRef.current
        accountsSubscription?.unsubscribe()
        tradesSubscription?.unsubscribe()
        propFirmSubscription?.unsubscribe()
      }
    }
  }, []) // Remove fetchAccounts from dependencies to prevent infinite loops

  return {
    accounts,
    isLoading,
    error,
    refetch
  }
}
