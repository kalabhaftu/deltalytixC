'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface UseCalendarNotesReturn {
  notes: Record<string, string>
  isLoading: boolean
  error: string | null
  refetchNotes: () => Promise<void>
  saveNote: (date: Date, note: string) => Promise<void>
  deleteNote: (date: Date) => Promise<void>
}

export function useCalendarNotes(): UseCalendarNotesReturn {
  const queryClient = useQueryClient()

  // React Query handles caching, dedup, and stale management
  const { data: notes = {}, isLoading, error: queryError, refetch } = useQuery<Record<string, string>>({
    queryKey: ['calendar-notes'],
    queryFn: async () => {
      // Check localStorage first for the init-loaded data
      try {
        const stored = localStorage.getItem('calendar-notes-cache')
        if (stored) return JSON.parse(stored)
      } catch {}
      
      // Fallback to API
      const response = await fetch('/api/calendar/notes', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to fetch notes')
      
      const data = await response.json()
      const notesMap: Record<string, string> = {}
      data.notes?.forEach((note: { date: Date | string; note: string }) => {
        const dateKey = new Date(note.date).toISOString().split('T')[0]
        notesMap[dateKey] = note.note
      })
      
      localStorage.setItem('calendar-notes-cache', JSON.stringify(notesMap))
      return notesMap
    },
    staleTime: 30 * 1000, // 30s
    gcTime: 5 * 60 * 1000,
  })

  const saveNote = useCallback(async (date: Date, note: string) => {
    const response = await fetch('/api/calendar/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: date.toISOString(), note })
    })
    if (!response.ok) throw new Error('Failed to save note')
    
    // Optimistic update
    const dateKey = date.toISOString().split('T')[0]
    queryClient.setQueryData<Record<string, string>>(['calendar-notes'], (old) => ({
      ...old,
      [dateKey]: note
    }))
    // Update localStorage
    try {
      const updated = { ...notes, [dateKey]: note }
      localStorage.setItem('calendar-notes-cache', JSON.stringify(updated))
    } catch {}
  }, [queryClient, notes])

  const deleteNote = useCallback(async (date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    const response = await fetch(`/api/calendar/notes?date=${date.toISOString()}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete note')
    
    // Optimistic update
    queryClient.setQueryData<Record<string, string>>(['calendar-notes'], (old) => {
      const updated = { ...old }
      delete updated[dateKey]
      return updated
    })
    // Update localStorage
    try {
      const updated = { ...notes }
      delete updated[dateKey]
      localStorage.setItem('calendar-notes-cache', JSON.stringify(updated))
    } catch {}
  }, [queryClient, notes])

  return {
    notes,
    isLoading,
    error: queryError?.message || null,
    refetchNotes: async () => { await refetch() },
    saveNote,
    deleteNote
  }
}
