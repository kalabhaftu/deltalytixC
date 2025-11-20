'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface TradeTag {
  id: string
  name: string
  color: string
}

interface TagsContextType {
  tags: TradeTag[]
  isLoading: boolean
  error: string | null
  getTagById: (tagId: string) => TradeTag | undefined
  getTagsByIds: (tagIds: string[]) => TradeTag[]
  refetchTags: () => Promise<void>
}

const TagsContext = createContext<TagsContextType | undefined>(undefined)

export function TagsProvider({ children }: { children: React.ReactNode }) {
  const [tags, setTags] = useState<TradeTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTags = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/tags')
      if (response.ok) {
        const data = await response.json()
        setTags(data.tags || [])
      } else if (response.status === 401 || response.status === 403) {
        // User not authenticated - silently fail, auth will handle redirect
        setTags([])
      } else {
        setError('Failed to fetch tags')
      }
    } catch (err) {
      // Silently fail on network errors during auth
      setTags([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTags()
  }, [])

  const getTagById = (tagId: string): TradeTag | undefined => {
    return tags.find(tag => tag.id === tagId)
  }

  const getTagsByIds = (tagIds: string[]): TradeTag[] => {
    return tagIds.map(id => getTagById(id)).filter((tag): tag is TradeTag => tag !== undefined)
  }

  return (
    <TagsContext.Provider value={{ tags, isLoading, error, getTagById, getTagsByIds, refetchTags: fetchTags }}>
      {children}
    </TagsContext.Provider>
  )
}

export function useTags() {
  const context = useContext(TagsContext)
  if (context === undefined) {
    throw new Error('useTags must be used within a TagsProvider')
  }
  return context
}

