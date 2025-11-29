import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { fetchWithError, handleFetchError } from '@/lib/utils/fetch-with-error'
import { API_TIMEOUT, POLL_INTERVAL } from '@/lib/constants'
import { useRealtimeSubscription, type TableName } from '@/lib/realtime/realtime-manager'

interface PropFirmAccountLocal {
  id: string
  accountName: string
  propFirmName: string
  accountSize: number
  evaluationType: string
  currentPhase: {
    id: string
    phaseNumber: number
    phaseId: string | null
    status: 'active' | 'passed' | 'failed' | 'archived'
    profitTargetPercent: number
    dailyDrawdownPercent: number
    maxDrawdownPercent: number
    maxDrawdownType: string
    minTradingDays: number
    timeLimitDays: number | null
    consistencyRulePercent: number
    profitSplitPercent: number | null
    payoutCycleDays: number | null
    startDate: string
    endDate: string | null
  } | null
  status: 'active' | 'funded' | 'failed'
  phases: Array<{
    id: string
    phaseNumber: number
    phaseId: string | null
    status: 'active' | 'pending' | 'passed' | 'failed' | 'archived'
    profitTargetPercent: number
    dailyDrawdownPercent: number
    maxDrawdownPercent: number
    maxDrawdownType: string
    minTradingDays: number
    timeLimitDays: number | null
    consistencyRulePercent: number
    profitSplitPercent: number | null
    payoutCycleDays: number | null
    startDate: string
    endDate: string | null
  }>
  currentPnL?: number
  currentBalance?: number
  currentEquity?: number
  dailyDrawdownRemaining?: number
  maxDrawdownRemaining?: number
  profitTargetProgress?: number
  lastUpdated: string
}

interface DrawdownData {
  dailyDrawdownRemaining: number
  maxDrawdownRemaining: number
  dailyStartBalance: number
  highestEquity: number
  currentEquity: number
  isBreached: boolean
  breachType?: 'daily_drawdown' | 'max_drawdown'
}

interface UsePropFirmRealtimeOptions {
  accountId?: string
  pollInterval?: number // in milliseconds, default from constants
  enabled?: boolean
}

interface UsePropFirmRealtimeResult {
  account: PropFirmAccountLocal | null
  drawdown: DrawdownData | null
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
  refetch: () => Promise<void>
  isPolling: boolean
  isVisible: boolean
}

export function usePropFirmRealtime(options: UsePropFirmRealtimeOptions): UsePropFirmRealtimeResult {
  const { accountId, pollInterval = POLL_INTERVAL, enabled = true } = options
  
  const [account, setAccount] = useState<PropFirmAccountLocal | null>(null)
  const [drawdown, setDrawdown] = useState<DrawdownData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousAccountRef = useRef<PropFirmAccountLocal | null>(null)
  const previousDrawdownRef = useRef<DrawdownData | null>(null)
  const isFetchingRef = useRef(false)
  const hasFetchedRef = useRef(false)

  // Track tab visibility for smart polling
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const fetchAccountData = useCallback(async (showLoadingState = true) => {
    // Use ref to prevent duplicate calls - this avoids dependency issues
    if (!accountId || !enabled || isFetchingRef.current) return

    try {
      isFetchingRef.current = true
      setIsFetching(true)
      if (showLoadingState) {
        setIsLoading(true)
      }
      setError(null)

      const result = await fetchWithError<{ success: boolean; data: any }>(
        `/api/prop-firm/accounts/${accountId}`,
        { timeout: API_TIMEOUT }
      )

      if (!result.ok || !result.data?.success) {
        throw new Error(result.error?.message || 'Failed to fetch account data')
      }

      const { account: accountData, drawdown: drawdownData } = result.data.data

      if (!accountData || !drawdownData) {
        throw new Error('Invalid response format: missing account or drawdown data')
      }

      // Check for status changes and show notifications
      if (previousAccountRef.current && previousAccountRef.current.status !== accountData.status) {
        if (accountData.status === 'failed') {
          toast.error("Account Failed", {
            description: `Account ${accountData.accountName || accountData.number} has been marked as failed.`,
          })
        } else if (accountData.status === 'funded') {
          toast.success("Account Funded!", {
            description: `Congratulations! Account ${accountData.accountName || accountData.number} has been funded.`,
          })
        }
      }

      // Check for breach alerts
      if (drawdownData?.isBreached && (!previousDrawdownRef.current?.isBreached)) {
        toast.error("Drawdown Breach Alert!", {
          description: `Account ${accountData.accountName || accountData.number} has breached ${drawdownData.breachType?.replace('_', ' ')} limits.`,
        })
      }

      // Update refs for next comparison
      previousAccountRef.current = accountData
      previousDrawdownRef.current = drawdownData

      setAccount(accountData)
      setDrawdown(drawdownData)
      setLastUpdated(new Date())

    } catch (err) {
      setError(handleFetchError(err))
    } finally {
      isFetchingRef.current = false
      setIsFetching(false)
      if (showLoadingState) {
        setIsLoading(false)
      }
    }
  }, [accountId, enabled])

  const refetch = useCallback(async () => {
    await fetchAccountData(true)
  }, [fetchAccountData])

  // Use shared RealtimeManager for subscriptions
  useRealtimeSubscription(
    ['MasterAccount', 'PhaseAccount', 'Trade', 'BreachRecord', 'Payout'] as TableName[],
    (event) => {
      // Refetch on relevant changes
      if (enabled && accountId) {
        fetchAccountData(false)
      }
    },
    enabled && !!accountId
  )

  // Track previous accountId to detect changes and reset hasFetchedRef
  const prevAccountIdRef = useRef<string | undefined>(undefined)

  // Initial fetch - only once per accountId
  // The reset logic must happen BEFORE the fetch check, not in a separate effect
  useEffect(() => {
    if (!enabled || !accountId) return
    
    // Reset hasFetchedRef when accountId changes (must happen before the fetch check)
    if (prevAccountIdRef.current !== accountId) {
      hasFetchedRef.current = false
      prevAccountIdRef.current = accountId
    }
    
    // Only fetch once per accountId
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    
    fetchAccountData(true)
  }, [enabled, accountId, fetchAccountData])

  // Visibility-aware polling - separate effect to avoid infinite loops
  useEffect(() => {
    if (!enabled || !accountId) return

    // Set up visibility-aware polling
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (isVisible) {
      setIsPolling(true)
      intervalRef.current = setInterval(() => {
        fetchAccountData(false)
      }, pollInterval)
    } else {
      setIsPolling(false)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsPolling(false)
    }
  }, [enabled, accountId, isVisible, pollInterval, fetchAccountData])

  return {
    account,
    drawdown,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isPolling,
    isVisible
  }
}
