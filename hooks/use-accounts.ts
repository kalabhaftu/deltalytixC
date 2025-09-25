import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { filterActiveAccounts } from '@/lib/utils/account-filters'
import { getAccountsAction, getCurrentActivePhase } from '@/server/accounts'

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
const CACHE_DURATION = 30000 // 30 seconds - balanced approach for performance and freshness
let isCurrentlyFetching = false // Prevent multiple simultaneous requests

// Function to clear cache when accounts are deleted
export function clearAccountsCache() {
  accountsCache = null
  accountsPromise = null
  lastFetchTime = 0
  isCurrentlyFetching = false // Also reset fetching flag
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
          
          // Debug: Log the account data from server
          console.log('[useAccounts] Raw account data from server:', accounts.map(a => ({
            id: a.id,
            name: a.name,
            tradeCount: a.tradeCount,
            propfirm: a.propfirm
          })))

          // Transform accounts to match the expected interface
          const transformedAccounts: UnifiedAccount[] = await Promise.all(
            accounts.map(async (account: any) => {
              let currentPhase = null
              let phaseAccountNumber = null

              if (account.propfirm) {
                try {
                  const phase = await getCurrentActivePhase(account.id)
                  if (phase) {
                    currentPhase = phase.phaseNumber
                    phaseAccountNumber = phase.phaseId
                  }
                } catch (phaseError) {
                  console.warn(`Failed to load phase for account ${account.id}:`, phaseError)
                }
              }

              return {
                id: account.id,
                number: account.number,
                name: account.name || account.number, // Ensure name is never null
                propfirm: account.propfirm,
                broker: account.broker || undefined, // Convert null to undefined
                startingBalance: account.startingBalance,
                currentBalance: account.startingBalance, // Add currentBalance field
                currentEquity: account.startingBalance,  // Add currentEquity field
                status: account.status || 'active',
                createdAt: account.createdAt instanceof Date ? account.createdAt.toISOString() : account.createdAt,
                userId: account.userId,
                groupId: account.groupId,
                group: account.groupId ? { id: account.groupId, name: 'Group' } : null, // Construct basic group info
                accountType: account.propfirm ? 'prop-firm' : 'live',
                displayName: account.name || account.number,
                tradeCount: account.tradeCount || 0, // Use actual trade count from server
                owner: null,
                isOwner: true,
                currentPhase,
                phaseAccountNumber
              }
            })
          )

          // Debug: Log the final transformed accounts
          console.log('[useAccounts] Final transformed accounts:', transformedAccounts.map(a => ({
            id: a.id,
            name: a.name,
            tradeCount: a.tradeCount,
            accountType: a.accountType
          })))

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
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
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
