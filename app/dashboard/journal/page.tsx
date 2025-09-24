'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TradeCard } from './components/trade-card'
import { Trade } from '@prisma/client'
import EnhancedEditTrade from '@/app/dashboard/components/tables/enhanced-edit-trade'
import TradeDetailView from '@/app/dashboard/components/tables/trade-detail-view'
import { Search, Filter, SortDesc } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataSerializer } from '@/lib/data-serialization'

// Fetch trades from API
// Fetch trades with pagination
async function fetchTrades(page: number = 1, limit: number = 200) {
  try {
    console.log(`Client: Fetching trades page ${page} with limit ${limit}...`)
    const response = await fetch(`/api/trades?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    console.log('Client: Response status:', response.status)

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Client: Authentication required - redirecting to login')
        window.location.href = '/authentication?next=/dashboard/journal'
        throw new Error('Authentication required')
      }

      const errorText = await response.text()
      console.error('Client: Response error text:', errorText)
      throw new Error(`Failed to fetch trades: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('Client: Response data:', result)

    // Handle paginated response
    if (result && typeof result === 'object' && 'data' in result) {
      const tradesArray = Array.isArray(result.data) ? result.data : []
      console.log(`Client: Received trades data, count: ${tradesArray.length}, page: ${result.page || page}, hasMore: ${result.hasMore || false}`)

      return {
        trades: tradesArray,
        page: result.page || page,
        hasMore: result.hasMore || false,
        total: result.total || tradesArray.length
      }
    }

    // Fallback for backward compatibility
    if (Array.isArray(result)) {
      console.log('Client: Received array response, count:', result.length)
      return {
        trades: result,
        page: page,
        hasMore: false,
        total: result.length
      }
    }

    console.warn('Client: Unexpected response format:', result)
    return {
      trades: [],
      page: page,
      hasMore: false,
      total: 0
    }
  } catch (error) {
    console.error('Client: Error fetching trades:', error)

    // If it's an authentication error, don't show error in UI - redirect handled above
    if (error instanceof Error && error.message === 'Authentication required') {
      return {
        trades: [],
        page: page,
        hasMore: false,
        total: 0
      }
    }

    // For other errors, show user-friendly message
    throw error
  }
}

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses' | 'buys' | 'sells'>('all')
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTrades, setTotalTrades] = useState(0)
  const tradesPerPage = 200 // Load 200 trades at a time for better performance

  useEffect(() => {
    loadTradesPage(1)
  }, [])

  // Load trades for a specific page
  const loadTradesPage = async (page: number) => {
    if (page === 1) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const result = await fetchTrades(page, tradesPerPage)

      if (page === 1) {
        setTrades(result.trades)
        setTotalTrades(result.total)
      } else {
        setTrades(prevTrades => [...prevTrades, ...result.trades])
      }

      setCurrentPage(page)
      setHasMore(result.hasMore)

      // Cache the first page for faster subsequent loads
      if (page === 1 && result.trades.length > 0) {
        try {
          safeLocalStorageSet('journal-trades-page-1', result.trades)
          safeLocalStorageSet('journal-trades-timestamp', Date.now().toString())
          safeLocalStorageSet('journal-trades-total', result.total.toString())
        } catch (error) {
          console.warn('Failed to cache trades:', error)
        }
      }

      console.log(`Loaded page ${page} with ${result.trades.length} trades. Total: ${result.total}`)
    } catch (error) {
      console.error('Failed to load trades page:', error)
      setError(error instanceof Error ? error.message : 'Failed to load trades')

      // Try to load from cache on error
      if (page === 1) {
        try {
          const cachedTrades = localStorage.getItem('journal-trades-page-1')
          const cachedTotal = localStorage.getItem('journal-trades-total')

          if (cachedTrades) {
            setTrades(JSON.parse(cachedTrades))
            setTotalTrades(parseInt(cachedTotal || '0'))
            console.log('Loaded from cache due to error')
          }
        } catch (cacheError) {
          console.warn('Failed to load from cache:', cacheError)
        }
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Load more trades when user scrolls to bottom
  const loadMoreTrades = () => {
    if (!loading && !loadingMore && hasMore) {
      loadTradesPage(currentPage + 1)
    }
  }

  // Utility function to safely save to localStorage with quota checking
  const safeLocalStorageSet = (key: string, value: any): boolean => {
    try {
      const dataString = JSON.stringify(value)
      const estimatedSize = new Blob([dataString]).size
      const MAX_STORAGE_SIZE = 4 * 1024 * 1024 // 4MB safety limit

      if (estimatedSize > MAX_STORAGE_SIZE) {
        console.warn(`Cannot save ${key}: Data size (${(estimatedSize / 1024 / 1024).toFixed(2)}MB) exceeds localStorage limit`)
        return false
      }

      localStorage.setItem(key, dataString)
      return true
    } catch (error) {
      console.error(`Failed to save ${key} to localStorage:`, error)
      return false
    }
  }

  // Function to clear cached data and reload
  const clearCacheAndReload = () => {
    const keysToRemove = [
      'journal-trades-page-1',
      'journal-trades-timestamp',
      'journal-trades-total'
    ]

    keysToRemove.forEach(key => localStorage.removeItem(key))
    setDebugInfo('Cache cleared. Reloading trades...')
    window.location.reload()
  }

  // Debug function to test API connection
  const testApiConnection = async () => {
    setDebugInfo('Testing API connection...')
    try {
      const response = await fetch('/api/trades?test=1', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      setDebugInfo(`API Status: ${response.status}\nResponse: ${JSON.stringify(result, null, 2)}`)
    } catch (error) {
      setDebugInfo(`API Error: ${error}`)
    }
  }

  // Handle trade deletion
  const handleDeleteTrade = async (tradeId: string) => {
    try {
      const response = await fetch(`/api/trades?id=${tradeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove trade from local state and cache
        const updatedTrades = Array.isArray(trades) ? trades.filter(t => t?.id !== tradeId) : []
        setTrades(updatedTrades)
        localStorage.setItem('journal-trades', JSON.stringify(updatedTrades))
        localStorage.setItem('journal-trades-timestamp', Date.now().toString())
        console.log('Trade deleted successfully')
      } else {
        console.error('Failed to delete trade')
      }
    } catch (error) {
      console.error('Error deleting trade:', error)
    }
  }

  // Handle trade edit
  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade)
    setIsEditDialogOpen(true)
  }

  // Handle trade save after edit
  const handleSaveTrade = async (updatedTrade: Partial<Trade>) => {
    try {
      const response = await fetch('/api/trades', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTrade),
      })

      if (response.ok) {
        // Update trade in local state and cache
        const updatedTrades = Array.isArray(trades) ? trades.map(t =>
          t?.id === updatedTrade.id ? { ...t, ...updatedTrade } : t
        ) : []
        setTrades(updatedTrades)
        localStorage.setItem('journal-trades', JSON.stringify(updatedTrades))
        localStorage.setItem('journal-trades-timestamp', Date.now().toString())
        setIsEditDialogOpen(false)
        setEditingTrade(null)
        console.log('Trade updated successfully')
      } else {
        console.error('Failed to update trade')
      }
    } catch (error) {
      console.error('Error updating trade:', error)
    }
  }

  // Handle view trade details
  const handleViewTrade = (trade: Trade) => {
    setViewingTrade(trade)
    setIsViewDialogOpen(true)
  }

  // Get unique journaled instruments for filtering
  const journaledInstruments = useMemo(() => {
    const instruments = new Set<string>()
    if (Array.isArray(trades)) {
      trades.forEach(trade => {
        if (trade?.instrument) {
          instruments.add(trade.instrument)
        }
      })
    }
    return Array.from(instruments).sort()
  }, [trades])

  // Filter trades based on selected filter
  const filteredTrades = useMemo(() => {
    let filtered = Array.isArray(trades) ? trades : []

    if (searchTerm) {
      filtered = filtered.filter(trade =>
        trade?.instrument?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade?.side?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade?.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply specific filters
    switch (filterBy) {
      case 'wins':
        filtered = filtered.filter(trade => {
          if (!trade || typeof trade.pnl !== 'number') return false
          const netPnL = trade.pnl - (trade.commission || 0)
          return netPnL > 0
        })
        break
      case 'losses':
        filtered = filtered.filter(trade => {
          if (!trade || typeof trade.pnl !== 'number') return false
          const netPnL = trade.pnl - (trade.commission || 0)
          return netPnL < 0
        })
        break
      case 'buys':
        filtered = filtered.filter(trade =>
          trade?.side?.toUpperCase() === 'BUY'
        )
        break
      case 'sells':
        filtered = filtered.filter(trade =>
          trade?.side?.toUpperCase() === 'SELL'
        )
        break
      default:
        // 'all' - no additional filtering
    }

    // Sort by newest first (entryDate descending)
    return filtered.sort((a, b) => {
      const dateA = new Date(a?.entryDate || 0).getTime()
      const dateB = new Date(b?.entryDate || 0).getTime()
      return dateB - dateA
    })
  }, [trades, searchTerm, filterBy])

  return (
    <motion.div
      className="w-full p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Trading Journal</h1>
          <p className="text-muted-foreground mt-1">
            Track and analyze your trading performance
          </p>
        </div>

      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search trades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter: {filterBy === 'all' ? 'All Trades' : filterBy === 'wins' ? 'Wins Only' : filterBy === 'losses' ? 'Losses Only' : filterBy === 'buys' ? 'Buys Only' : 'Sells Only'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterBy('all')}>
              All Trades
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy('wins')}>
              Wins Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy('losses')}>
              Losses Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy('buys')}>
              Buys Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy('sells')}>
              Sells Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>


        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>
            {loading ? 'Loading...' :
             filteredTrades.length === 0 ? '0 trades' :
             `${filteredTrades.length} of ${totalTrades} trades`}
          </span>
          {loadingMore && (
            <span className="text-blue-600 text-xs">Loading more...</span>
          )}
          {hasMore && !loading && !loadingMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadMoreTrades}
              className="text-xs"
            >
              Load More ({tradesPerPage} more)
            </Button>
          )}
          {debugInfo && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDebugInfo('')}
              className="text-xs"
            >
              Hide Debug
            </Button>
          )}
        </div>

        {/* Debug Panel */}
        {debugInfo && (
          <div className="bg-muted/50 p-3 rounded-lg text-xs font-mono">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground">Debug Info:</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCacheAndReload}
                  className="text-xs"
                >
                  Clear Cache
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={testApiConnection}
                  className="text-xs"
                >
                  Test API
                </Button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-xs">{debugInfo}</pre>
          </div>
        )}
      </div>

      {/* Trades Grid */}
      <div className="space-y-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-video w-full" />
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-destructive text-xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to Load Trades</h3>
            <p className="text-muted-foreground">{error}</p>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => loadTradesPage(1)}
                className="mt-4"
              >
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => setError(null)}
                className="mt-4"
              >
                Dismiss
              </Button>
            </div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
              <SortDesc className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm ? 'No trades found' : 'No trades yet'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm
                ? 'Try adjusting your search terms'
                : totalTrades > 0
                  ? `${totalTrades} trades available - try clearing filters or loading more`
                  : 'Your trading journal will appear here once you have trades'
              }
            </p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            layout
          >
            <AnimatePresence>
              {filteredTrades.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onView={() => handleViewTrade(trade)}
                onEdit={() => handleEditTrade(trade)}
                onDelete={() => handleDeleteTrade(trade.id)}
              />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>


      {/* Trade Detail View Dialog */}
      <TradeDetailView
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        trade={viewingTrade}
      />

      {/* Edit Trade Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto z-[10000]">
          <DialogHeader>
            <DialogTitle>Edit Trade</DialogTitle>
          </DialogHeader>
          {editingTrade && (
            <EnhancedEditTrade
              trade={editingTrade}
              isOpen={isEditDialogOpen}
              onSave={handleSaveTrade}
              onClose={() => {
                setIsEditDialogOpen(false)
                setEditingTrade(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

    </motion.div>
  )
}
