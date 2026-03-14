'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'

const QUERY_KEY = ['account-filter-settings'] as const

async function fetchAccountFilterSettings(): Promise<AccountFilterSettings> {
  const response = await fetch('/api/settings/account-filters', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch settings`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to fetch settings')
  return data.data || DEFAULT_FILTER_SETTINGS
}

async function saveAccountFilterSettings(settings: AccountFilterSettings): Promise<AccountFilterSettings> {
  const response = await fetch('/api/settings/account-filters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to save settings`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to save settings')
  return data.data
}

export interface UseAccountFilterSettingsResult {
  settings: AccountFilterSettings
  isLoading: boolean
  isSaving: boolean
  error: string | null
  refetch: () => void
  updateSettings: (newSettings: Partial<AccountFilterSettings>) => Promise<void>
  resetToDefaults: () => Promise<void>
}

export function useAccountFilterSettings(): UseAccountFilterSettingsResult {
  const queryClient = useQueryClient()

  const { data: settings = DEFAULT_FILTER_SETTINGS, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAccountFilterSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: () => {
      try {
        const cached = localStorage.getItem('settings-cache')
        if (cached) {
          const parsed = JSON.parse(cached)
          return parsed || DEFAULT_FILTER_SETTINGS
        }
      } catch {
        // ignore
      }
      return DEFAULT_FILTER_SETTINGS
    },
  })

  const mutation = useMutation({
    mutationFn: async (newSettings: Partial<AccountFilterSettings>) => {
      let current = queryClient.getQueryData<AccountFilterSettings>(QUERY_KEY)
      if (!current) {
        try {
          current = await fetchAccountFilterSettings()
        } catch {
          current = DEFAULT_FILTER_SETTINGS
        }
      }
      const merged = { ...current, ...newSettings, updatedAt: new Date().toISOString() }
      return saveAccountFilterSettings(merged)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data)
      try {
        localStorage.setItem('settings-cache', JSON.stringify(data))
      } catch {
        // ignore
      }
    },
  })

  const updateSettings = async (newSettings: Partial<AccountFilterSettings>) => {
    await mutation.mutateAsync(newSettings)
  }

  const resetToDefaults = async () => {
    await mutation.mutateAsync(DEFAULT_FILTER_SETTINGS)
  }

  return {
    settings,
    isLoading,
    isSaving: mutation.isPending,
    error: error instanceof Error ? error.message : mutation.error instanceof Error ? mutation.error.message : null,
    refetch,
    updateSettings,
    resetToDefaults,
  }
}
