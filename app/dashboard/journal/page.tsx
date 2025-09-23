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

// Fetch trades from API
async function fetchTrades() {
  try {
    console.log('Client: Fetching trades from API...')
    const response = await fetch('/api/trades', {
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
    return result.data || []
  } catch (error) {
    console.error('Client: Error fetching trades:', error)

    // If it's an authentication error, don't show error in UI - redirect handled above
    if (error instanceof Error && error.message === 'Authentication required') {
      return []
    }

    // For other errors, show user-friendly message
    throw error
  }
}

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses' | 'buys' | 'sells'>('all')
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  useEffect(() => {
    // Load trades from localStorage first for better performance
    const loadTrades = async () => {
      setLoading(true)
      try {
        // Try to load from localStorage first
        const cachedTrades = localStorage.getItem('journal-trades')
        const lastFetch = localStorage.getItem('journal-trades-timestamp')
        const now = Date.now()
        const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

        // Use cached data if it's less than 5 minutes old
        if (cachedTrades && lastFetch && (now - parseInt(lastFetch)) < CACHE_DURATION) {
          setTrades(JSON.parse(cachedTrades))
          setLoading(false)
        }

        // Always fetch fresh data in background
        const tradesData = await fetchTrades()

        // Update localStorage with fresh data
        localStorage.setItem('journal-trades', JSON.stringify(tradesData))
        localStorage.setItem('journal-trades-timestamp', now.toString())

        setTrades(tradesData)
      } catch (error) {
        console.error('Failed to load trades:', error)
        // Try to use cached data as fallback
        const cachedTrades = localStorage.getItem('journal-trades')
        if (cachedTrades) {
          setTrades(JSON.parse(cachedTrades))
        } else {
          setTrades([])
        }
      } finally {
        setLoading(false)
      }
    }

    loadTrades()
  }, [])

  // Handle trade deletion
  const handleDeleteTrade = async (tradeId: string) => {
    try {
      const response = await fetch(`/api/trades?id=${tradeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Remove trade from local state and cache
        const updatedTrades = trades.filter(t => t.id !== tradeId)
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
        const updatedTrades = trades.map(t =>
          t.id === updatedTrade.id ? { ...t, ...updatedTrade } : t
        )
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
    trades.forEach(trade => {
      if (trade.instrument) {
        instruments.add(trade.instrument)
      }
    })
    return Array.from(instruments).sort()
  }, [trades])

  // Filter trades based on selected filter
  const filteredTrades = useMemo(() => {
    let filtered = trades

    if (searchTerm) {
      filtered = filtered.filter(trade =>
        trade.instrument.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.side?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.accountNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply specific filters
    switch (filterBy) {
      case 'wins':
        filtered = filtered.filter(trade => {
          const netPnL = trade.pnl - (trade.commission || 0)
          return netPnL > 0
        })
        break
      case 'losses':
        filtered = filtered.filter(trade => {
          const netPnL = trade.pnl - (trade.commission || 0)
          return netPnL < 0
        })
        break
      case 'buys':
        filtered = filtered.filter(trade =>
          trade.side?.toUpperCase() === 'BUY'
        )
        break
      case 'sells':
        filtered = filtered.filter(trade =>
          trade.side?.toUpperCase() === 'SELL'
        )
        break
      default:
        // 'all' - no additional filtering
    }

    // Sort by newest first (entryDate descending)
    return filtered.sort((a, b) =>
      new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    )
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
          <Filter className="w-4 h-4" />
          <span>{filteredTrades.length} trades</span>
        </div>
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
