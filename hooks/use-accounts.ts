/**
 * Shared accounts hook to prevent duplicate API calls
 * Centralizes account fetching and provides request deduplication
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/context/auth-provider'
import { apiRequest } from '@/lib/api-request-manager'

interface Account {
  id: string
  number: string
  name: string
  propfirm?: string
  accountType: 'live' | 'prop-firm'
  startingBalance: number
  createdAt: string
  tradeCount?: number
  hasActivePhase?: boolean
  isOwner?: boolean
}

interface UseAccountsResult {
  accounts: Account[]
  propFirmAccounts: Account[]
  allAccounts: Account[]
  isLoading: boolean
  isPropFirmLoading: boolean
  error: string | null
  propFirmError: string | null
  refetch: () => Promise<void>
  refetchPropFirm: () => Promise<void>
}

// Global state to prevent duplicate requests
let globalAccountsCache: Account[] | null = null
let globalPropFirmCache: Account[] | null = null
let globalAccountsPromise: Promise<Account[]> | null = null
let globalPropFirmPromise: Promise<Account[]> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30000 // 30 seconds

export function useAccounts(): UseAccountsResult {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [propFirmAccounts, setPropFirmAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPropFirmLoading, setIsPropFirmLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [propFirmError, setPropFirmError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  // Check if cache is still valid
  const isCacheValid = () => {
    return Date.now() - cacheTimestamp < CACHE_TTL
  }

  // Fetch live accounts with deduplication
  const fetchAccounts = useCallback(async (): Promise<Account[]> => {
    // Return cached data if valid
    if (globalAccountsCache && isCacheValid()) {
      return globalAccountsCache
    }

    // Return existing promise if one is in flight
    if (globalAccountsPromise) {
      return globalAccountsPromise
    }

    // Create new request
    globalAccountsPromise = (async () => {
      try {
        const response = await apiRequest('/api/accounts', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }, 15000) // 15 second cache

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Server error (${response.status})`)
        }

        const data = await response.json()
        if (data.success) {
          const liveAccounts = data.data.filter((account: Account) => account.accountType === 'live')
          
          // Update global cache
          globalAccountsCache = liveAccounts
          cacheTimestamp = Date.now()
          
          return liveAccounts
        } else {
          throw new Error(data.error || 'Failed to fetch accounts')
        }
      } catch (error) {
        globalAccountsCache = null
        throw error
      } finally {
        globalAccountsPromise = null
      }
    })()

    return globalAccountsPromise
  }, [])

  // Fetch prop firm accounts with deduplication
  const fetchPropFirmAccounts = useCallback(async (): Promise<Account[]> => {
    // Return cached data if valid
    if (globalPropFirmCache && isCacheValid()) {
      return globalPropFirmCache
    }

    // Return existing promise if one is in flight
    if (globalPropFirmPromise) {
      return globalPropFirmPromise
    }

    // Create new request
    globalPropFirmPromise = (async () => {
      try {
        const response = await apiRequest('/api/prop-firm/accounts', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }, 15000) // 15 second cache

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          
          // Map error codes to user-friendly messages
          let errorMessage = errorData.error || `Server error (${response.status})`
          if (errorData.code === 'DB_CONNECTION_ERROR') {
            errorMessage = 'Database temporarily unavailable. Please try again in a few minutes.'
          } else if (errorData.code === 'AUTH_TIMEOUT') {
            errorMessage = 'Authentication service temporarily unavailable. Please refresh the page.'
          } else if (errorData.code === 'REQUEST_TIMEOUT') {
            errorMessage = 'Request timed out. Please check your internet connection and try again.'
          }
          
          throw new Error(errorMessage)
        }

        const data = await response.json()
        if (data.success) {
          // Update global cache
          globalPropFirmCache = data.data
          cacheTimestamp = Date.now()
          
          return data.data
        } else {
          throw new Error(data.error || 'Failed to fetch prop firm accounts')
        }
      } catch (error) {
        globalPropFirmCache = null
        throw error
      } finally {
        globalPropFirmPromise = null
      }
    })()

    return globalPropFirmPromise
  }, [])

  // Load accounts when user changes
  useEffect(() => {
    if (!user || !mountedRef.current) return

    const loadAccounts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const accountsData = await fetchAccounts()
        if (mountedRef.current) {
          setAccounts(accountsData)
        }
      } catch (error) {
        if (mountedRef.current) {
          setError(error instanceof Error ? error.message : 'Failed to fetch accounts')
          console.error('Error fetching accounts:', error)
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    const loadPropFirmAccounts = async () => {
      try {
        setIsPropFirmLoading(true)
        setPropFirmError(null)
        
        const propFirmData = await fetchPropFirmAccounts()
        if (mountedRef.current) {
          setPropFirmAccounts(propFirmData)
        }
      } catch (error) {
        if (mountedRef.current) {
          setPropFirmError(error instanceof Error ? error.message : 'Failed to fetch prop firm accounts')
          console.error('Error fetching prop firm accounts:', error)
        }
      } finally {
        if (mountedRef.current) {
          setIsPropFirmLoading(false)
        }
      }
    }

    loadAccounts()
    loadPropFirmAccounts()
  }, [user, fetchAccounts, fetchPropFirmAccounts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Manual refetch functions
  const refetch = useCallback(async () => {
    if (!user) return
    
    // Clear cache for fresh data
    globalAccountsCache = null
    
    try {
      setIsLoading(true)
      setError(null)
      const accountsData = await fetchAccounts()
      if (mountedRef.current) {
        setAccounts(accountsData)
      }
    } catch (error) {
      if (mountedRef.current) {
        setError(error instanceof Error ? error.message : 'Failed to fetch accounts')
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [user, fetchAccounts])

  const refetchPropFirm = useCallback(async () => {
    if (!user) return
    
    // Clear cache for fresh data
    globalPropFirmCache = null
    
    try {
      setIsPropFirmLoading(true)
      setPropFirmError(null)
      const propFirmData = await fetchPropFirmAccounts()
      if (mountedRef.current) {
        setPropFirmAccounts(propFirmData)
      }
    } catch (error) {
      if (mountedRef.current) {
        setPropFirmError(error instanceof Error ? error.message : 'Failed to fetch prop firm accounts')
      }
    } finally {
      if (mountedRef.current) {
        setIsPropFirmLoading(false)
      }
    }
  }, [user, fetchPropFirmAccounts])

  return {
    accounts,
    propFirmAccounts,
    allAccounts: [...accounts, ...propFirmAccounts],
    isLoading,
    isPropFirmLoading,
    error,
    propFirmError,
    refetch,
    refetchPropFirm
  }
}

// Clear cache function for manual cache invalidation
export function clearAccountsCache() {
  globalAccountsCache = null
  globalPropFirmCache = null
  globalAccountsPromise = null
  globalPropFirmPromise = null
  cacheTimestamp = 0
}

