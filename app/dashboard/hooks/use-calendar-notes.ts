'use client'

import { useState, useEffect, useCallback } from 'react'

interface DailyNote {
  id: string
  date: Date
  note: string
  userId: string
}

interface UseCalendarNotesReturn {
  notes: Record<string, string>
  isLoading: boolean
  error: string | null
  refetchNotes: () => Promise<void>
  saveNote: (date: Date, note: string) => Promise<void>
  deleteNote: (date: Date) => Promise<void>
}

// Global cache for notes - shared across all components
let notesCache: Record<string, string> = {}
let cacheTimestamp: number = 0
const CACHE_DURATION = 30000 // 30 seconds cache

export function useCalendarNotes(): UseCalendarNotesReturn {
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    // Try to load from bundled data in localStorage first
    try {
      const storedNotes = localStorage.getItem('calendar-notes-cache')
      if (storedNotes) {
        const parsed = JSON.parse(storedNotes)
        notesCache = parsed
        cacheTimestamp = Date.now()
        return parsed
      }
    } catch (error) {
      // Ignore parsing errors
    }
    return notesCache
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    // Check cache first (skip API call if recently fetched)
    const now = Date.now()
    if (notesCache && Object.keys(notesCache).length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
      setNotes(notesCache)
      return
    }

    // Only fetch from API if cache is stale or empty
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/calendar/notes', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-cache'
      })
      
      if (response.ok) {
        const data = await response.json()
        const notesMap = data.notes.reduce((acc: Record<string, string>, note: DailyNote) => {
          const dateKey = new Date(note.date).toISOString().split('T')[0]
          acc[dateKey] = note.note
          return acc
        }, {})
        
        notesCache = notesMap
        cacheTimestamp = Date.now()
        localStorage.setItem('calendar-notes-cache', JSON.stringify(notesMap))
        setNotes(notesMap)
      } else {
        setError('Failed to fetch notes')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const saveNote = useCallback(async (date: Date, note: string) => {
    try {
      const response = await fetch('/api/calendar/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.toISOString(),
          note: note
        })
      })
      
      if (response.ok) {
        // Update local cache immediately
        const dateKey = date.toISOString().split('T')[0]
        const updatedNotes = { ...notesCache, [dateKey]: note }
        notesCache = updatedNotes
        cacheTimestamp = Date.now()
        setNotes(updatedNotes)
      } else {
        throw new Error('Failed to save note')
      }
    } catch (err) {
      throw err
    }
  }, [])

  const deleteNote = useCallback(async (date: Date) => {
    try {
      const dateKey = date.toISOString().split('T')[0]
      const response = await fetch(`/api/calendar/notes?date=${date.toISOString()}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        // Update local cache immediately
        const updatedNotes = { ...notesCache }
        delete updatedNotes[dateKey]
        notesCache = updatedNotes
        cacheTimestamp = Date.now()
        setNotes(updatedNotes)
      } else {
        throw new Error('Failed to delete note')
      }
    } catch (err) {
      throw err
    }
  }, [])

  // DON'T fetch automatically - let the calendar component call refetchNotes when it's ready
  // This prevents blocking the main data load

  return {
    notes,
    isLoading,
    error,
    refetchNotes: fetchNotes,
    saveNote,
    deleteNote
  }
}

