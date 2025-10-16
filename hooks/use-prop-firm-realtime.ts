import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { PropFirmAccount } from '@/types/prop-firm'

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
  isActive: boolean
  status: string
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
  pollInterval?: number // in milliseconds, default 30 seconds
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
}

export function usePropFirmRealtime(options: UsePropFirmRealtimeOptions): UsePropFirmRealtimeResult {
  const { accountId, pollInterval = 30000, enabled = true } = options
  
  const [account, setAccount] = useState<PropFirmAccountLocal | null>(null)
  const [drawdown, setDrawdown] = useState<DrawdownData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAccountData = useCallback(async (showLoadingState = true) => {
    if (!accountId || !enabled || isFetching) return

    try {
      setIsFetching(true)
      if (showLoadingState) {
        setIsLoading(true)
      }
      setError(null)

      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller with timeout
      abortControllerRef.current = new AbortController()
      
      // Set timeout for request
      timeoutRef.current = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }, 10000) // 10 second timeout

      const response = await fetch(`/api/prop-firm-v2/accounts/${accountId}`, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      // Clear timeout on successful response
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch account data: ${response.status}`)
      }

      const responseData = await response.json()

      // Handle wrapped response format (from API)
      if (responseData.success && responseData.data) {
        const data = responseData.data

        // Check if the expected format is available
        if (data.account && data.drawdown) {
          const accountData = data.account
          const drawdownData = data.drawdown

          // Check for status changes and show notifications
          if (account && account.status !== accountData.status) {
            if (accountData.status === 'failed') {
              toast.error("Account Failed", {
                description: `Account ${accountData.accountName || accountData.number} has been marked as failed due to rule violations.`,
              })
            } else if (accountData.status === 'funded') {
              toast.success("Account Funded! 🎉", {
                description: `Congratulations! Account ${accountData.accountName || accountData.number} has been funded.`,
              })
            }
          }

          // Check for breach alerts
          if (drawdownData?.isBreached && (!drawdown || !drawdown.isBreached)) {
            toast.error("Drawdown Breach Alert!", {
              description: `Account ${accountData.accountName || accountData.number} has breached ${drawdownData.breachType?.replace('_', ' ')} limits.`,
            })
          }

          setAccount(accountData)
          setDrawdown(drawdownData)
          setLastUpdated(new Date())
        } else {
          throw new Error(data.error || 'Invalid response format: missing account or drawdown data')
        }
      } else if (responseData.account && responseData.drawdown) {
        // Handle direct response format (fallback)
        const accountData = responseData.account
        const drawdownData = responseData.drawdown

        setAccount(accountData)
        setDrawdown(drawdownData)
        setLastUpdated(new Date())
      } else {
        throw new Error(responseData.error || 'Failed to fetch account data - invalid response format')
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(errorMessage)
      
      console.error('Prop firm realtime fetch error:', error)
    } finally {
      setIsFetching(false)
      if (showLoadingState) {
        setIsLoading(false)
      }
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [accountId, enabled, toast, account, drawdown, isFetching])

  const startPolling = useCallback(() => {
    if (!enabled || !accountId || intervalRef.current) return

    setIsPolling(true)
    
    // Initial fetch
    fetchAccountData(true)
    
    // Set up polling interval
    intervalRef.current = setInterval(() => {
      fetchAccountData(false) // Don't show loading for background polls
    }, pollInterval)

  }, [enabled, accountId, pollInterval, fetchAccountData])

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    setIsPolling(false)
    setIsFetching(false)
  }, [])

  const refetch = useCallback(async () => {
    await fetchAccountData(true)
  }, [fetchAccountData])

  // PERFORMANCE FIX: Disable auto-polling that was causing performance issues
  // Fetch once on mount, then cleanup on unmount
  useEffect(() => {
    if (enabled && accountId) {
      // Only fetch once on mount, no polling
      fetchAccountData(true)
    }

    // Cleanup on unmount
    return () => {
      stopPolling()
    }
  }, [enabled, accountId, fetchAccountData, stopPolling])

  return {
    account,
    drawdown,
    isLoading,
    error,
    lastUpdated,
    refetch,
    isPolling
  }
}
