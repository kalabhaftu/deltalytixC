import { useState, useEffect, useCallback } from 'react'
import { AccountFilterSettings, DEFAULT_FILTER_SETTINGS } from '@/types/account-filter-settings'

interface UseAccountFilterSettingsResult {
  settings: AccountFilterSettings
  isLoading: boolean
  isSaving: boolean
  error: string | null
  updateSettings: (newSettings: Partial<AccountFilterSettings>) => Promise<void>
  resetToDefaults: () => Promise<void>
}

export function useAccountFilterSettings(): UseAccountFilterSettingsResult {
  const [settings, setSettings] = useState<AccountFilterSettings>(DEFAULT_FILTER_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/settings/account-filters', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch settings`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch settings')
      }

      setSettings(data.data)
    } catch (err) {
      console.error('Error fetching account filter settings:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSettings(DEFAULT_FILTER_SETTINGS)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = useCallback(async (newSettings: Partial<AccountFilterSettings>) => {
    try {
      setIsSaving(true)
      setError(null)

      const updatedSettings = {
        ...settings,
        ...newSettings,
        updatedAt: new Date().toISOString()
      }

      const response = await fetch('/api/settings/account-filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to save settings`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSettings(data.data)
    } catch (err) {
      console.error('Error updating account filter settings:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [settings])

  const resetToDefaults = useCallback(async () => {
    try {
      await updateSettings(DEFAULT_FILTER_SETTINGS)
    } catch (err) {
      console.error('Error resetting settings to defaults:', err)
      throw err
    }
  }, [updateSettings])

  // PERFORMANCE: Don't fetch on mount - use defaults and fetch lazily
  // This prevents blocking the main data load
  useEffect(() => {
    // Defer fetch to not block initial page load
    const timer = setTimeout(() => {
      fetchSettings()
    }, 1000) // Wait 1 second after mount
    
    return () => clearTimeout(timer)
  }, [fetchSettings])

  return {
    settings,
    isLoading,
    isSaving,
    error,
    updateSettings,
    resetToDefaults
  }
}
