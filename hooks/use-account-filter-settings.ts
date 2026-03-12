import { useState, useEffect, useCallback } from 'react'
import { AccountFilterGear, DEFAULT_FILTER_Gear } from '@/types/account-filter-Gear'

interface UseAccountFilterGearResult {
  Gear: AccountFilterGear
  isLoading: boolean
  isSaving: boolean
  error: string | null
  updateGear: (newGear: Partial<AccountFilterGear>) => Promise<void>
  resetToDefaults: () => Promise<void>
}

export function useAccountFilterGear(): UseAccountFilterGearResult {
  const [Gear, setGear] = useState<AccountFilterGear>(() => {
    // Try to load from bundled data in localStorage first (from getUserData)
    try {
      const bundled = localStorage.getItem('account-filter-Gear-cache')
      if (bundled) {
        const parsed = JSON.parse(bundled)
        return parsed || DEFAULT_FILTER_Gear
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return DEFAULT_FILTER_Gear
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGear = useCallback(async () => {
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
        throw new Error(`HTTP ${response.status}: Failed to fetch Gear`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch Gear')
      }

      setGear(data.data)
      localStorage.setItem('account-filter-Gear-cache', JSON.stringify(data.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setGear(DEFAULT_FILTER_Gear)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateGear = useCallback(async (newGear: Partial<AccountFilterGear>) => {
    try {
      setIsSaving(true)
      setError(null)

      const updatedGear = {
        ...Gear,
        ...newGear,
        updatedAt: new Date().toISOString()
      }

      const response = await fetch('/api/settings/account-filters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGear)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to save Gear`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to save Gear')
      }

      setGear(data.data)
      localStorage.setItem('account-filter-Gear-cache', JSON.stringify(data.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [Gear])

  const resetToDefaults = useCallback(async () => {
    try {
      await updateGear(DEFAULT_FILTER_Gear)
    } catch (err) {
      throw err
    }
  }, [updateGear])

  // Don't fetch automatically - Gear are bundled with getUserData
  // Only fetch if explicitly needed (e.g., after long session)
  // This prevents blocking the main data load

  return {
    Gear,
    isLoading,
    isSaving,
    error,
    updateGear,
    resetToDefaults
  }
}
