import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { filterActiveAccounts } from '@/lib/utils/account-filters'
import { getAccountsAction } from '@/server/accounts'

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

// Global cache to prevent multiple simultaneous requests
let accountsCache: UnifiedAccount[] | null = null
let accountsPromise: Promise<UnifiedAccount[]> | null = null
let lastFetchTime = 0
const CACHE_DURATION = 300000 // 5 minutes - much longer cache for better performance
let isCurrentlyFetching = false // Prevent multiple simultaneous requests

// Function to clear cache when accounts are deleted
export function clearAccountsCache() {
  accountsCache = null
  accountsPromise = null
  lastFetchTime = 0
}

export function useAccounts(options: UseAccountsOptions = {}): UseAccountsResult {
  const { includeFailed = false } = options
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  const fetchAccounts = useCallback(async (forceRefresh = false) => {
    // Check cache first - much more aggressive caching
    const now = Date.now()
    if (!forceRefresh && accountsCache && (now - lastFetchTime) < CACHE_DURATION) {
      setAccounts(accountsCache)
      setIsLoading(false)
      setError(null)
      console.log('[useAccounts] Using cached accounts, skipping fetch')
      return
    }

    // Prevent multiple simultaneous requests
    if (isCurrentlyFetching && !forceRefresh) {
      console.log('[useAccounts] Request already in progress, waiting...')
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
        console.log('[useAccounts] Fetching accounts using server action')
        
        try {
          const accounts = await getAccountsAction()
          console.log('[useAccounts] Server action returned:', accounts?.length || 0, 'accounts')

          // Safety check - if accounts is undefined, treat as empty array
          if (!accounts) {
            console.warn('[useAccounts] Server action returned undefined, treating as empty array')
            return []
          }
          
          // Transform accounts to match the expected interface
          const transformedAccounts: UnifiedAccount[] = accounts.map(account => ({
            id: account.id,
            number: account.number,
            name: account.name || account.number, // Ensure name is never null
            propfirm: account.propfirm,
            broker: account.broker || undefined, // Convert null to undefined
            startingBalance: account.startingBalance,
            currentBalance: account.startingBalance, // Add currentBalance field
            currentEquity: account.startingBalance,  // Add currentEquity field
            status: account.status || 'active',
            createdAt: account.createdAt.toISOString(),
            userId: account.userId,
            groupId: account.groupId,
            group: account.groupId ? { id: account.groupId, name: 'Group' } : null, // Construct basic group info
            accountType: account.propfirm ? 'prop-firm' : 'live',
            displayName: account.name || account.number,
            tradeCount: 0, // Will be calculated separately if needed
            owner: null,
            isOwner: true,
            currentPhase: null
          }))
          
          console.log('[useAccounts] Transformed accounts:', transformedAccounts.length, 'accounts')
          return transformedAccounts
        } catch (error) {
          console.error('[useAccounts] Server action error:', error)
          throw error
        }
      })()

      const fetchedAccounts = await accountsPromise

      if (fetchedAccounts) {
        // Update cache
        accountsCache = fetchedAccounts
        lastFetchTime = now

        setAccounts(fetchedAccounts)
        setError(null)
        console.log('[useAccounts] Successfully cached', fetchedAccounts.length, 'accounts')
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          console.log('[useAccounts] Request was cancelled')
          return
        }
        console.error('[useAccounts] Fetch error:', err.message)
        setError(err.message)
        toast({
          title: 'Error',
          description: 'Failed to fetch accounts. Please try again.',
          variant: 'destructive'
        })
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setIsLoading(false)
      accountsPromise = null
      isCurrentlyFetching = false
    }
  }, [toast])

  const refetch = useCallback(() => fetchAccounts(true), [fetchAccounts])

  useEffect(() => {
    fetchAccounts()

    return () => {
      // Cleanup: abort any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
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
