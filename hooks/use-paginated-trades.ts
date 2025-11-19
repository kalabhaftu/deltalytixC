import { useState, useEffect, useCallback } from 'react'
import { Trade } from '@prisma/client'

interface PaginatedResult {
  trades: Trade[]
  page: number
  totalPages: number
  totalCount: number
  isLoading: boolean
  error: string | null
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  setPageSize: (size: number) => void
}

const PAGE_SIZES = [50, 100, 200, 500] as const
const DEFAULT_PAGE_SIZE = 50

export function usePaginatedTrades(initialPageSize: number = DEFAULT_PAGE_SIZE): PaginatedResult {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [trades, setTrades] = useState<Trade[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.ceil(totalCount / pageSize)

  const fetchTrades = useCallback(async (currentPage: number, limit: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/trades?page=${currentPage}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch trades')
      }

      const data = await response.json()
      
      if (data.success) {
        setTrades(data.data || [])
        setTotalCount(data.metadata?.count || 0)
      } else {
        throw new Error(data.message || 'Failed to fetch trades')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setTrades([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTrades(page, pageSize)
  }, [page, pageSize, fetchTrades])

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(p => p + 1)
    }
  }, [page, totalPages])

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(p => p - 1)
    }
  }, [page])

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }, [totalPages])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    setPage(1) // Reset to first page when changing page size
  }, [])

  return {
    trades,
    page,
    totalPages,
    totalCount,
    isLoading,
    error,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
  }
}

// Re-export page sizes for convenience
export { PAGE_SIZES, DEFAULT_PAGE_SIZE }

