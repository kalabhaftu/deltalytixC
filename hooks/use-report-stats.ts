/**
 * React Query hook for report statistics
 * 
 * Replaces the 4 useMemo blocks in reports/page.tsx with a single
 * server-side computed response via /api/v1/reports/stats
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys, postFetcher } from '@/lib/query/fetcher'
import type { ReportStatsResponse } from '@/lib/statistics/report-statistics'

export interface UseReportStatsFilters {
  accountId?: string
  dateFrom?: string
  dateTo?: string
  symbol?: string
  session?: string
  outcome?: string
  strategy?: string
  ruleBroken?: string
}

export function useReportStats(filters: UseReportStatsFilters, enabled = true) {
  const cleanedFilters = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '')
  ) as Record<string, unknown>

  const stableKey = JSON.stringify(cleanedFilters, Object.keys(cleanedFilters).sort())

  return useQuery<ReportStatsResponse>({
    // IMPORTANT: stable key (string), not object reference
    queryKey: ['report-stats', stableKey],
    queryFn: () => postFetcher<ReportStatsResponse>('/api/v1/reports/stats', cleanedFilters),
    enabled,
    staleTime: 60 * 1000, // Reports data is less volatile, 1 min stale
    gcTime: 5 * 60 * 1000,
  })
}
