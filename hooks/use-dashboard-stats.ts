import { useState, useEffect, useCallback } from 'react'

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

export function useDashboardStats(): UseDashboardStatsResult {
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

      const response = await fetch('/api/dashboard/stats', {
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
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

