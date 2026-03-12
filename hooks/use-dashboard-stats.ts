import { useState, useEffect, useCallback, useRef } from 'react'
import { AccountFilterGear, DEFAULT_FILTER_Gear } from '@/types/account-filter-Gear'
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

export function useDashboardStats(Gear: AccountFilterGear = DEFAULT_FILTER_Gear): UseDashboardStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Cache management
  const lastFetchRef = useRef<number>(0)
  const lastGearRef = useRef<string>('')

  const fetchStats = useCallback(async (force = false) => {
    // Build Gear key for cache comparison
    const GearKey = JSON.stringify({
      viewingSpecificPhase: Gear.viewingSpecificPhase,
      selectedMasterAccountId: Gear.selectedMasterAccountId,
      selectedPhaseId: Gear.selectedPhaseId,
      selectedPhaseNumber: Gear.selectedPhaseNumber
    })
    
    // Skip if recently fetched with same Gear (unless forced)
    const now = Date.now()
    if (!force && stats && now - lastFetchRef.current < CACHE_DURATION_SHORT && lastGearRef.current === GearKey) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build URL with phase filter params
      const params = new URLSearchParams()
      if (Gear.viewingSpecificPhase && Gear.selectedMasterAccountId) {
        params.append('masterAccountId', Gear.selectedMasterAccountId)
        if (Gear.selectedPhaseId) {
          params.append('phaseId', Gear.selectedPhaseId)
        }
        if (Gear.selectedPhaseNumber) {
          params.append('phaseNumber', Gear.selectedPhaseNumber.toString())
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
        lastGearRef.current = GearKey
      } else if (result.error) {
        setError(handleFetchError(result.error))
      }
    } catch (err) {
      setError(handleFetchError(err))
    } finally {
      setLoading(false)
    }
  }, [Gear, stats])

  useEffect(() => {
    fetchStats()
  }, [Gear.viewingSpecificPhase, Gear.selectedMasterAccountId, Gear.selectedPhaseId, Gear.selectedPhaseNumber, fetchStats]) // ✅ NEW: Refetch when phase selection changes

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

