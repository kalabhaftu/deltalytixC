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
  const [notes, setNotes] = useState<Record<string, string>>(notesCache)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotes = useCallback(async () => {
    // Check cache first
    const now = Date.now()
    if (notesCache && Object.keys(notesCache).length > 0 && (now - cacheTimestamp) < CACHE_DURATION) {
      setNotes(notesCache)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/calendar/notes', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        // Add cache control to help browser caching
        cache: 'no-cache'
      })
      
      if (response.ok) {
        const data = await response.json()
        const notesMap = data.notes.reduce((acc: Record<string, string>, note: DailyNote) => {
          const dateKey = new Date(note.date).toISOString().split('T')[0]
          acc[dateKey] = note.note
          return acc
        }, {})
        
        // Update cache
        notesCache = notesMap
        cacheTimestamp = Date.now()
        setNotes(notesMap)
      } else {
        setError('Failed to fetch notes')
      }
    } catch (err) {
      console.error('Error fetching calendar notes:', err)
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
      console.error('Error saving note:', err)
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
      console.error('Error deleting note:', err)
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

