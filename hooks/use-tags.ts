'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface TradeTag {
  id: string
  name: string
  color: string
}

export function useTags() {
  const queryClient = useQueryClient()

  const { data: tags = [], isLoading, error } = useQuery<TradeTag[]>({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await fetch('/api/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      return data.tags || []
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  const createTag = async (name: string, color: string): Promise<TradeTag> => {
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to create tag')
    }
    const data = await response.json()
    queryClient.setQueryData<TradeTag[]>(['tags'], (old) => [...(old || []), data.tag])
    return data.tag
  }

  const updateTag = async (id: string, name: string, color: string): Promise<TradeTag> => {
    const response = await fetch(`/api/tags/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), color }),
    })
    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error || 'Failed to update tag')
    }
    const data = await response.json()
    queryClient.setQueryData<TradeTag[]>(['tags'], (old) =>
      (old || []).map((t) => (t.id === id ? data.tag : t))
    )
    return data.tag
  }

  const deleteTag = async (id: string): Promise<void> => {
    const response = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    if (!response.ok) throw new Error('Failed to delete tag')
    queryClient.setQueryData<TradeTag[]>(['tags'], (old) =>
      (old || []).filter((t) => t.id !== id)
    )
  }

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['tags'] })

  return { tags, isLoading, error, createTag, updateTag, deleteTag, invalidate }
}
