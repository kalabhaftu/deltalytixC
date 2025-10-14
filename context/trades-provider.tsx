'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { Trade as PrismaTrade } from '@prisma/client'
import { getTradesAction } from '@/server/database'
import { useUserStore } from '@/store/user-store'
import { handleServerActionError } from '@/lib/utils/server-action-error-handler'

interface TradesContextType {
  trades: PrismaTrade[]
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
  loadMore: () => Promise<void>
  refetch: () => Promise<void>
  setTrades: (trades: PrismaTrade[]) => void
}

const TradesContext = createContext<TradesContextType | null>(null)

const PAGE_SIZE = 1000 // Load 1000 trades at a time

export function TradesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore()
  const [trades, setTrades] = useState<PrismaTrade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)

  const fetchTrades = useCallback(async (pageNum: number, append: boolean = false) => {
    if (!user?.id || loading) return

    try {
      setLoading(true)
      setError(null)

      const offset = (pageNum - 1) * PAGE_SIZE
      const newTrades = await getTradesAction(null, { 
        limit: PAGE_SIZE,
        offset 
      })

      if (Array.isArray(newTrades)) {
        if (append) {
          setTrades(prev => [...prev, ...newTrades])
        } else {
          setTrades(newTrades)
        }
        
        setHasMore(newTrades.length === PAGE_SIZE)
      } else {
        setTrades([])
        setHasMore(false)
      }
    } catch (err) {
      console.error('Error fetching trades:', err)
      if (handleServerActionError(err, { context: 'Fetch Trades' })) {
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to fetch trades')
    } finally {
      setLoading(false)
    }
  }, [user?.id, loading])

  // Initial load
  useEffect(() => {
    if (user?.id) {
      fetchTrades(1, false)
    }
  }, [user?.id]) // Only depend on user ID, not fetchTrades

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    
    const nextPage = page + 1
    setPage(nextPage)
    await fetchTrades(nextPage, true)
  }, [hasMore, loading, page, fetchTrades])

  const refetch = useCallback(async () => {
    setPage(1)
    setHasMore(true)
    await fetchTrades(1, false)
  }, [fetchTrades])

  const value: TradesContextType = {
    trades,
    loading,
    error,
    hasMore,
    page,
    loadMore,
    refetch,
    setTrades,
  }

  return (
    <TradesContext.Provider value={value}>
      {children}
    </TradesContext.Provider>
  )
}

export function useTrades() {
  const context = useContext(TradesContext)
  if (!context) {
    throw new Error('useTrades must be used within TradesProvider')
  }
  return context
}


