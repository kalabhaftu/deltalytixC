'use client'

import { useQuery } from '@tanstack/react-query'

export interface TradingModel {
  id: string
  name: string
  description?: string
  [key: string]: any
}

export function useTradingModels() {
  const { data, isLoading, error } = useQuery<TradingModel[] | null>({
    queryKey: ['trading-models'],
    queryFn: async () => {
      const response = await fetch('/api/user/trading-models')
      if (!response.ok) throw new Error('Failed to fetch trading models')
      const data = await response.json()
      // API shape: { success: true, models: [...] }
      if (Array.isArray(data)) return data
      if (Array.isArray(data?.models)) return data.models
      if (Array.isArray(data?.tradingModels)) return data.tradingModels
      return []
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  const tradingModels = Array.isArray(data) ? data : []

  return { tradingModels, isLoading, error }
}
