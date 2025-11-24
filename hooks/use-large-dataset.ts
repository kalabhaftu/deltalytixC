import { useState, useCallback } from 'react'
import { DataSerializer } from '@/lib/data-serialization'
import { Trade } from '@prisma/client'

export interface LargeDatasetConfig {
  pageSize: number
  maxConcurrentRequests: number
  preloadPages: number
  enableStreaming: boolean
}

export interface LargeDatasetState<T> {
  data: T[]
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
  progress: number
  currentPage: number
}

const defaultConfig: LargeDatasetConfig = {
  pageSize: 50,
  maxConcurrentRequests: 3,
  preloadPages: 2,
  enableStreaming: true
}

export const useLargeDataset = <T>(
  fetchUrl: string,
  config: Partial<LargeDatasetConfig> = {}
) => {
  const finalConfig = { ...defaultConfig, ...config }

  const [state, setState] = useState<LargeDatasetState<T>>({
    data: [],
    loading: false,
    error: null,
    hasMore: true,
    total: 0,
    progress: 0,
    currentPage: 1
  })

  const [activeRequests, setActiveRequests] = useState<Set<number>>(new Set())
  const [cache, setCache] = useState<Map<number, T[]>>(new Map())

  const loadPage = useCallback(async (page: number, filters?: any): Promise<T[]> => {
    if (cache.has(page)) {
      return cache.get(page)!
    }

    const response = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'getBatch',
        batchSize: finalConfig.pageSize,
        offset: (page - 1) * finalConfig.pageSize,
        filters
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch page ${page}`)
    }

    const result = await response.json()

    if (result.success) {
      let data = result.data

      // Handle compressed data
      if (result.compressed && typeof result.data === 'string') {
        try {
          const decompressed = DataSerializer.deserializeData(result) as { data: any[] }
          data = decompressed.data
        } catch (decompressError) {
          // Fallback to raw data if decompression fails
        }
      }

      // Ensure data is an array
      if (!Array.isArray(data)) {
        data = []
      }

      // Ensure each item in the array has the expected structure
      data = data.filter((item: any) => item && typeof item === 'object')

      setCache(prev => new Map(prev.set(page, data)))
      return data
    } else {
      throw new Error(result.error || 'Failed to load data')
    }
  }, [fetchUrl, finalConfig.pageSize, cache])

  const loadMore = useCallback(async (filters?: any) => {
    if (state.loading || !state.hasMore || activeRequests.size >= finalConfig.maxConcurrentRequests) {
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const nextPage = state.currentPage
      setActiveRequests(prev => new Set([...prev, nextPage]))

      const newData = await loadPage(nextPage, filters)

      setState(prev => ({
        ...prev,
        data: [...prev.data, ...newData],
        currentPage: nextPage + 1,
        hasMore: newData.length === finalConfig.pageSize,
        total: prev.total || finalConfig.pageSize * nextPage,
        progress: Math.min((nextPage * finalConfig.pageSize / (prev.total || 10000)) * 100, 100),
        loading: false
      }))

      setActiveRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(nextPage)
        return newSet
      })

      // Preload next pages
      preloadPages(nextPage + 1, filters)
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load data'
      }))
      setActiveRequests(prev => {
        const newSet = new Set(prev)
        newSet.delete(state.currentPage)
        return newSet
      })
    }
  }, [state.loading, state.hasMore, state.currentPage, activeRequests.size, finalConfig.maxConcurrentRequests, finalConfig.pageSize, loadPage])

  const preloadPages = useCallback(async (startPage: number, filters?: any) => {
    if (activeRequests.size >= finalConfig.maxConcurrentRequests) {
      return
    }

    const pagesToLoad = []
    for (let i = 0; i < finalConfig.preloadPages; i++) {
      const page = startPage + i
      if (!cache.has(page) && !activeRequests.has(page)) {
        pagesToLoad.push(page)
      }
    }

    for (const page of pagesToLoad.slice(0, finalConfig.maxConcurrentRequests - activeRequests.size)) {
      setActiveRequests(prev => new Set([...prev, page]))
      try {
        await loadPage(page, filters)
      } catch (error) {
        // Ignore preload errors
      } finally {
        setActiveRequests(prev => {
          const newSet = new Set(prev)
          newSet.delete(page)
          return newSet
        })
      }
    }
  }, [activeRequests, finalConfig.maxConcurrentRequests, finalConfig.preloadPages, cache, loadPage])

  const refresh = useCallback(async (filters?: any) => {
    setCache(new Map())
    setActiveRequests(new Set())
    setState(prev => ({
      ...prev,
      data: [],
      currentPage: 1,
      hasMore: true,
      total: 0,
      progress: 0,
      loading: false,
      error: null
    }))

    // Load first page
    await loadMore(filters)
  }, [loadMore])

  const clearCache = useCallback(() => {
    setCache(new Map())
    setState(prev => ({ ...prev, data: [] }))
  }, [])

  return {
    ...state,
    config: finalConfig,
    loadMore,
    refresh,
    clearCache
  }
}

// Shared trades data hook for dashboard and journal
export const useSharedTrades = () => {
  const [allTrades, setAllTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const pageSize = 200 // Load 200 trades at a time

  // Simplified helper function for fetching trades
  const fetchTrades = useCallback(async (limit: number = pageSize): Promise<Trade[]> => {
    try {

      const response = await fetch(`/api/trades?limit=${limit}&page=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.status}`)
      }

      const result = await response.json()

      if (result && result.success && result.data) {
        const tradesArray = Array.isArray(result.data) ? result.data : []
        return tradesArray
      }

      throw new Error('Invalid response format')
    } catch (error) {
      throw error
    }
  }, [])

  const loadAllTrades = useCallback(async () => {
    if (loading) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Clear existing trades and start fresh
      setAllTrades([])

      // Load all trades at once using the simplified helper
      const tradesArray = await fetchTrades(5000) // Load up to 5000 trades at once

      setAllTrades(tradesArray)
      setTotalCount(tradesArray.length)

      setLoading(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load trades')
      setLoading(false)
    }
  }, [loading, fetchTrades])

  const loadMoreTrades = useCallback(async () => {
    if (loading) return


    setLoading(true)

    try {
      // Load additional trades using the simplified helper
      const moreTrades = await fetchTrades(pageSize)

      if (moreTrades.length === 0) {
      } else {
        // Append to existing trades
        setAllTrades(prev => [...prev, ...moreTrades])
      }

      setLoading(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load more trades')
      setLoading(false)
    }
  }, [loading, fetchTrades, pageSize])

  const clearTrades = useCallback(() => {
    setAllTrades([])
    setTotalCount(0)
    setError(null)
  }, [])

  return {
    allTrades,
    loading,
    error,
    totalCount,
    loadAllTrades,
    loadMoreTrades,
    clearTrades
  }
}
