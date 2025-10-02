'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TradeCard } from './components/trade-card'
import { Trade } from '@prisma/client'
import EnhancedEditTrade from '@/app/dashboard/components/tables/enhanced-edit-trade'
import TradeDetailView from '@/app/dashboard/components/tables/trade-detail-view'
import { useData } from '@/context/data-provider'
import { Search, Filter, SortDesc, Lightbulb } from 'lucide-react'
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
import { getCanonicalAssetName } from '@/lib/asset-aliases'


export default function JournalPage() {
  // Use main DataProvider for data management
  const {
    formattedTrades: allTrades,
    refreshTrades,
    updateTrades,
    isLoading: loading,
    error
  } = useData()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses' | 'buys' | 'sells'>('all')
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingTrade, setViewingTrade] = useState<Trade | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false)

  // Load trades when component mounts - only once
  useEffect(() => {
    console.log('JournalPage: Initial load check -', {
      allTradesLength: allTrades.length,
      loading,
      error,
      hasAttemptedInitialLoad
    })

    // Only load if we have no trades, not currently loading, and haven't attempted initial load yet
    if (allTrades.length === 0 && !loading && !hasAttemptedInitialLoad) {
      console.log('JournalPage: Starting initial trade load...')
      setHasAttemptedInitialLoad(true)
      refreshTrades()
    }
  }, [allTrades.length, loading, refreshTrades, hasAttemptedInitialLoad])

  // Show debug info about the data provider state
  const getDebugInfo = () => {
    return `DataProvider State:
- Loaded: ${allTrades.length} trades
- Loading: ${loading}
- Error: ${error || 'None'}
- Filtered: ${filteredTrades.length} trades`
  }

  // Function to refresh trades
  const manualRefresh = () => {
    console.log('Manual refresh triggered')
    setHasAttemptedInitialLoad(false) // Reset the flag so refresh will work
    refreshTrades()
    setDebugInfo('Refreshing trades...')
  }

  // Debug function to show current state
  const testApiConnection = () => {
    setDebugInfo(getDebugInfo())
  }


  // Handle trade deletion
  const handleDeleteTrade = async (tradeId: string) => {
    try {
      const response = await fetch(`/api/trades?id=${tradeId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        // Refresh trades from the server to get updated data
        await refreshTrades()
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
    if (!editingTrade) return
    
    try {
      // Use updateTrades from data provider
      await updateTrades([editingTrade.id], updatedTrade)
      
      setIsEditDialogOpen(false)
      setEditingTrade(null)
      console.log('Trade updated successfully')
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
    allTrades.forEach(trade => {
      if (trade?.instrument) {
        instruments.add(trade.instrument)
      }
    })
    return Array.from(instruments).sort()
  }, [allTrades])

  // Filter trades based on selected filter
  const filteredTrades = useMemo(() => {
    let filtered = allTrades

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      const canonicalAsset = getCanonicalAssetName(searchTerm)

      filtered = filtered.filter(trade => {
        // For asset searches (indices, commodities, forex, crypto)
        // Check if the trade's instrument matches the canonical name
        if (canonicalAsset !== searchTerm) {
          // This is an alias search (e.g., "nasdaq" → "NAS100")
          return trade?.instrument === canonicalAsset
        }

        // For direct searches (BUY/SELL, account numbers, exact instrument names)
        const instrumentMatch = trade?.instrument?.toLowerCase().includes(lowerSearchTerm)
        const sideMatch = trade?.side?.toLowerCase().includes(lowerSearchTerm)
        const accountMatch = trade?.accountNumber?.toLowerCase().includes(lowerSearchTerm)
        const modelMatch = (trade as any)?.tradingModel?.toLowerCase().includes(lowerSearchTerm)

        return instrumentMatch || sideMatch || accountMatch || modelMatch
      })
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
  }, [allTrades, searchTerm, filterBy])

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
            placeholder="Search instruments (NQ, USTECH, YM, GOLD, SILVER, buy, sell...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md p-2 text-xs text-muted-foreground z-50">
              <div className="flex items-center gap-1 mb-1">
                <Lightbulb className="w-3 h-3" />
                <span>Search suggestions:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="bg-muted px-2 py-1 rounded">NQ</span>
                <span className="bg-muted px-2 py-1 rounded">USTECH</span>
                <span className="bg-muted px-2 py-1 rounded">YM</span>
                <span className="bg-muted px-2 py-1 rounded">ES</span>
                <span className="bg-muted px-2 py-1 rounded">GOLD</span>
                <span className="bg-muted px-2 py-1 rounded">SILVER</span>
                <span className="bg-muted px-2 py-1 rounded">WTI</span>
                <span className="bg-muted px-2 py-1 rounded">BRENT</span>
                <span className="bg-muted px-2 py-1 rounded">buy</span>
                <span className="bg-muted px-2 py-1 rounded">sell</span>
              </div>
            </div>
          )}
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
             `${filteredTrades.length} trades loaded`}
          </span>
          {loading && (
            <span className="text-blue-600 text-xs">Loading trades...</span>
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
                  onClick={manualRefresh}
                  className="text-xs"
                >
                  Refresh Trades
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={testApiConnection}
                  className="text-xs"
                >
                  Show State
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
                onClick={() => {
                  refreshTrades()
                  window.location.reload()
                }}
                className="mt-4"
              >
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  refreshTrades()
                  window.location.reload()
                }}
                className="mt-4"
              >
                Dismiss & Reload
              </Button>
            </div>
          </div>
        ) : loading ? (
          // Show skeleton loading cards instead of empty state
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
                : allTrades.length > 0
                  ? `${allTrades.length} trades loaded - try clearing filters or refreshing`
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
