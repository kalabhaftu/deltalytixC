import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

interface UnifiedAccount {
  id: string
  number: string
  name: string
  propfirm: string
  startingBalance: number
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

// Global cache to prevent multiple simultaneous requests
let accountsCache: UnifiedAccount[] | null = null
let accountsPromise: Promise<UnifiedAccount[]> | null = null
let lastFetchTime = 0
const CACHE_DURATION = 30000 // 30 seconds

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { toast } = useToast()

  const fetchAccounts = useCallback(async (forceRefresh = false) => {
    // Check cache first
    const now = Date.now()
    if (!forceRefresh && accountsCache && (now - lastFetchTime) < CACHE_DURATION) {
      setAccounts(accountsCache)
      setIsLoading(false)
      setError(null)
      return
    }

    // If there's already a request in progress, wait for it
    if (accountsPromise && !forceRefresh) {
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

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      setIsLoading(true)
      setError(null)

      // Create the promise and store it globally
      accountsPromise = (async () => {
        const response = await fetch('/api/accounts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: abortControllerRef.current?.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch accounts`)
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch accounts')
        }

        return data.data || []
      })()

      const fetchedAccounts = await accountsPromise

      // Update cache
      accountsCache = fetchedAccounts
      lastFetchTime = now

      setAccounts(fetchedAccounts)
      setError(null)
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // Request was cancelled, don't update state
          return
        }
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
  }, [fetchAccounts])

  return {
    accounts,
    isLoading,
    error,
    refetch
  }
}
