import { useState, useEffect, useCallback } from 'react'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'

interface DashboardStats {
  totalAccounts: number
  totalTrades: number
  totalEquity: number
  totalPnL: number
  winRate: number
  chartData: Array<{ date: string; pnl: number }>
  isAuthenticated: boolean
  lastUpdated: string
}

interface UseDashboardStatsResult {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDashboardStats(settings: AccountFilterSettings = DEFAULT_FILTER_SETTINGS): UseDashboardStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Add timeout to the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      // ✅ NEW: Build URL with phase filter params
      const params = new URLSearchParams()
      if (settings.viewingSpecificPhase && settings.selectedMasterAccountId) {
        params.append('masterAccountId', settings.selectedMasterAccountId)
        if (settings.selectedPhaseId) {
          params.append('phaseId', settings.selectedPhaseId)
        }
        if (settings.selectedPhaseNumber) {
          params.append('phaseNumber', settings.selectedPhaseNumber.toString())
        }
      }

      const url = `/api/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 408) {
          throw new Error('Request timeout - please try again')
        }
        throw new Error('Failed to fetch dashboard statistics')
      }

      const data = await response.json()
      
      if (data.success) {
        setStats(data.data)
      } else {
        throw new Error(data.error || 'Failed to load dashboard data')
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Request timeout - please try again')
        } else {
          setError(error.message)
        }
      } else {
        setError('An unexpected error occurred')
      }
    } finally {
      setLoading(false)
    }
  }, [settings])

  useEffect(() => {
    fetchStats()
  }, [settings.viewingSpecificPhase, settings.selectedMasterAccountId, settings.selectedPhaseId, settings.selectedPhaseNumber]) // ✅ NEW: Refetch when phase selection changes

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

