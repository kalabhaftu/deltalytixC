'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useUserStore } from '@/store/user-store'
import { format } from 'date-fns'

interface JournalEntry {
  id: string
  userId: string
  accountId: string | null
  date: string
  note: string
  emotion: string | null
  createdAt: string
  updatedAt: string
}

// Simple cache to prevent duplicate fetches
const cache = new Map<string, { data: Record<string, JournalEntry>, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export function useJournalData(startDate?: Date, endDate?: Date, accountId?: string | null) {
  const [journals, setJournals] = useState<Record<string, JournalEntry>>({})
  const [isLoading, setIsLoading] = useState(false)
  const user = useUserStore(state => state.supabaseUser)
  const fetchedRef = useRef(false)

  // Create stable cache key
  const cacheKey = useMemo(() => {
    if (!user || !startDate || !endDate) return null
    return `journals-${user.id}-${format(startDate, 'yyyy-MM-dd')}-${format(endDate, 'yyyy-MM-dd')}-${accountId || 'all'}`
  }, [user, startDate, endDate, accountId])

  const fetchJournals = useCallback(async () => {
    if (!user || !startDate || !endDate || !cacheKey) return

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setJournals(cached.data)
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      })

      if (accountId) {
        params.append('accountId', accountId)
      }

      const response = await fetch(`/api/journal/list?${params}`)
      if (!response.ok) throw new Error('Failed to fetch journals')

      const data = await response.json()
      
      // Convert to date-keyed object for easy lookup
      const journalMap: Record<string, JournalEntry> = {}
      data.journals?.forEach((journal: JournalEntry) => {
        // Use format from date-fns to ensure consistent date formatting
        const dateKey = format(new Date(journal.date), 'yyyy-MM-dd')
        journalMap[dateKey] = journal
      })

      setJournals(journalMap)
      
      // Update cache
      cache.set(cacheKey, { data: journalMap, timestamp: Date.now() })
    } catch (error) {
      // Failed to fetch journals
    } finally {
      setIsLoading(false)
    }
  }, [user, startDate, endDate, accountId, cacheKey])

  useEffect(() => {
    // Only fetch once per cache key
    if (cacheKey && !fetchedRef.current) {
      fetchedRef.current = true
      fetchJournals()
    }
    
    // Reset when cache key changes
    return () => {
      fetchedRef.current = false
    }
  }, [cacheKey, fetchJournals])

  const hasJournalForDate = useCallback((date: Date): boolean => {
    // Use format from date-fns to ensure consistent date formatting
    const dateKey = format(date, 'yyyy-MM-dd')
    return !!journals[dateKey]
  }, [journals])

  const getJournalForDate = useCallback((date: Date): JournalEntry | null => {
    // Use format from date-fns to ensure consistent date formatting
    const dateKey = format(date, 'yyyy-MM-dd')
    return journals[dateKey] || null
  }, [journals])

  const refetch = useCallback(() => {
    // Clear cache and refetch
    if (cacheKey) {
      cache.delete(cacheKey)
    }
    return fetchJournals()
  }, [cacheKey, fetchJournals])

  return {
    journals,
    isLoading,
    hasJournalForDate,
    getJournalForDate,
    refetch
  }
}

