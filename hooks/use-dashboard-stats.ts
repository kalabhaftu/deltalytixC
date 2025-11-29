import { useState, useEffect, useCallback, useRef } from 'react'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'
import { fetchWithError, handleFetchError } from '@/lib/utils/fetch-with-error'
import { API_TIMEOUT, CACHE_DURATION_SHORT } from '@/lib/constants'

interface DashboardStats {
  totalAccounts: number
  totalTrades: number
  totalEquity: number
  totalPnL: number
  winRate: number
  profitFactor?: number
  grossProfits?: number
  grossLosses?: number
  winningTrades?: number
  losingTrades?: number
  breakEvenTrades?: number
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
  
  // Cache management
  const lastFetchRef = useRef<number>(0)
  const lastSettingsRef = useRef<string>('')

  const fetchStats = useCallback(async (force = false) => {
    // Build settings key for cache comparison
    const settingsKey = JSON.stringify({
      viewingSpecificPhase: settings.viewingSpecificPhase,
      selectedMasterAccountId: settings.selectedMasterAccountId,
      selectedPhaseId: settings.selectedPhaseId,
      selectedPhaseNumber: settings.selectedPhaseNumber
    })
    
    // Skip if recently fetched with same settings (unless forced)
    const now = Date.now()
    if (!force && stats && now - lastFetchRef.current < CACHE_DURATION_SHORT && lastSettingsRef.current === settingsKey) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build URL with phase filter params
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

      // Use centralized fetch wrapper with error handling
      const result = await fetchWithError<{ success: boolean; data: DashboardStats }>(url, {
        timeout: API_TIMEOUT
      })

      if (result.ok && result.data?.success) {
        setStats(result.data.data)
        lastFetchRef.current = now
        lastSettingsRef.current = settingsKey
      } else if (result.error) {
        setError(handleFetchError(result.error))
      }
    } catch (err) {
      setError(handleFetchError(err))
    } finally {
      setLoading(false)
    }
  }, [settings, stats])

  useEffect(() => {
    fetchStats()
  }, [settings.viewingSpecificPhase, settings.selectedMasterAccountId, settings.selectedPhaseId, settings.selectedPhaseNumber, fetchStats]) // ✅ NEW: Refetch when phase selection changes

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

