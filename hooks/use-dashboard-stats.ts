'use client'

import { useQuery } from '@tanstack/react-query'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'

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
  
  // Build stable query key from settings
  const queryKey = [
    'dashboard-stats',
    settings.viewingSpecificPhase,
    settings.selectedMasterAccountId,
    settings.selectedPhaseId,
    settings.selectedPhaseNumber
  ]

  const { data, isLoading, error: queryError, refetch } = useQuery<DashboardStats>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch dashboard stats')
      const result = await response.json()
      if (!result.success) throw new Error('Dashboard stats returned unsuccessful')
      return result.data
    },
    staleTime: 30 * 1000, // 30s
    gcTime: 5 * 60 * 1000,
  })

  return {
    stats: data ?? null,
    loading: isLoading,
    error: queryError?.message || null,
    refetch: async () => { await refetch() }
  }
}
