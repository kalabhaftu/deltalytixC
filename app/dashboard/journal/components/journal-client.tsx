'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { TradeCard } from './trade-card'
import { Search, Filter, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight, X, Sparkles, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { AIAnalysisDialog } from '@/app/dashboard/components/journal/ai-analysis-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import { useModalStateStore } from '@/store/modal-state-store'
import EnhancedEditTrade from '@/app/dashboard/components/tables/enhanced-edit-trade'
import { TradeDetailView } from '@/app/dashboard/components/tables/trade-detail-view'
import { Trade } from '@prisma/client'
import { groupTradesByExecution } from '@/lib/utils'
import Fuse from 'fuse.js'
import { getAssetSearchTerms, getCanonicalAssetName } from '@/lib/asset-aliases'
import { useTags } from '@/context/tags-provider'

const ITEMS_PER_PAGE = 21 // Show 21 cards per page (3 columns × 7 rows = perfect grid)

export function JournalClient() {
  const router = useRouter()
  const { formattedTrades, refreshTrades, updateTrades, isLoading } = useData()
  const { tags } = useTags()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses' | 'buys' | 'sells'>('all')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [tradeToDelete, setTradeToDelete] = useState<Trade | null>(null)
  const [showAIAnalysis, setShowAIAnalysis] = useState(false)

  // CRITICAL: Group trades first to show correct counts
  const groupedTrades = useMemo(() => groupTradesByExecution(formattedTrades), [formattedTrades])

  const filteredTrades = useMemo(() => {
    let trades = groupedTrades

    // Apply smart search with alias support
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.trim().toLowerCase()
      const termLength = term.length

      // For very short queries (1-2 chars): Use strict prefix matching only
      if (termLength <= 2) {
        trades = trades.filter(trade => {
          const instrument = (trade.instrument || '').toLowerCase()
          const symbol = (trade.symbol || '').toLowerCase()
          const comment = (trade.comment || '').toLowerCase()
          
          // Check if instrument or symbol starts with the term
          if (instrument.startsWith(term) || symbol.startsWith(term)) return true
          
          // Check all aliases for prefix match
          const aliases = getAssetSearchTerms(trade.instrument || trade.symbol || '')
          const aliasMatch = aliases.some(alias => alias.toLowerCase().startsWith(term))
          if (aliasMatch) return true
          
          // Check comment for exact substring (not prefix for comments)
          if (comment.includes(term)) return true
          
          return false
        })
      }
      // For short queries (3-4 chars): Use strict fuzzy search
      else if (termLength <= 4) {
        const tradesWithAliases = trades.map(trade => ({
          ...trade,
          searchableInstrument: getAssetSearchTerms(trade.instrument || trade.symbol || '').join(' '),
        }))

        const fuse = new Fuse(tradesWithAliases, {
          keys: [
            { name: 'instrument', weight: 0.4 },
            { name: 'symbol', weight: 0.3 },
            { name: 'searchableInstrument', weight: 0.4 },
            { name: 'comment', weight: 0.1 },
          ],
          threshold: 0.2, // Very strict for short queries
          distance: 50,
          minMatchCharLength: 1,
          includeScore: true,
        })
        
        const results = fuse.search(term)
        trades = results.map(result => result.item)
      }
      // For longer queries (5+ chars): Use normal fuzzy search
      else {
        const tradesWithAliases = trades.map(trade => ({
          ...trade,
          searchableInstrument: getAssetSearchTerms(trade.instrument || trade.symbol || '').join(' '),
        }))

        const fuse = new Fuse(tradesWithAliases, {
          keys: [
            { name: 'instrument', weight: 0.3 },
            { name: 'symbol', weight: 0.3 },
            { name: 'searchableInstrument', weight: 0.3 },
            { name: 'comment', weight: 0.2 },
          ],
          threshold: 0.35, // More lenient for longer queries
          distance: 100,
          minMatchCharLength: 1,
          includeScore: true,
        })
        
        const results = fuse.search(term)
        trades = results.map(result => result.item)
      }
    }

    // Apply additional filters
    return trades.filter(trade => {
      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'wins' && trade.pnl > 0) ||
        (filterBy === 'losses' && trade.pnl < 0) ||
        (filterBy === 'buys' && trade.side?.toUpperCase() === 'BUY') ||
        (filterBy === 'sells' && trade.side?.toUpperCase() === 'SELL')

      // Tag filter
      if (selectedTagIds.length > 0) {
        const tradeTagIds = (trade as any).tags ? (trade as any).tags.split(',').filter(Boolean) : []
        const hasSelectedTag = selectedTagIds.some(tagId => tradeTagIds.includes(tagId))
        if (!hasSelectedTag) return false
      }

      return matchesFilter
    })
  }, [groupedTrades, searchTerm, filterBy, selectedTagIds])

  // Pagination calculations
  const totalPages = Math.ceil(filteredTrades.length / ITEMS_PER_PAGE)
  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredTrades.slice(startIndex, endIndex)
  }, [filteredTrades, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterBy, selectedTagIds])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshTrades()
      toast.success('Refreshed trades')
    } catch (error) {
      toast.error('Failed to refresh')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleEditTrade = (trade: Trade) => {
    setSelectedTrade(trade)
    setIsEditDialogOpen(true)
  }

  const handleViewTrade = (trade: Trade) => {
    setSelectedTrade(trade)
    setIsViewDialogOpen(true)
  }

  const handleDeleteTrade = (trade: Trade) => {
    setTradeToDelete(trade)
    setShowDeleteDialog(true)
  }
  
  const confirmDeleteTrade = async () => {
    if (!tradeToDelete) return
    
    try {
      // Here you would implement the delete functionality
      toast.success('Trade deleted successfully')
      await refreshTrades()
    } catch (error) {
      toast.error('Failed to delete trade')
    } finally {
      setShowDeleteDialog(false)
      setTradeToDelete(null)
    }
  }

  const handleSaveTrade = async (updatedTrade: Partial<Trade>) => {
    if (!selectedTrade) return
    
    try {
      await updateTrades([selectedTrade.id], updatedTrade)
      toast.success('Trade updated successfully')
      setIsEditDialogOpen(false)
      
      // Update selectedTrade with the new data so TradeDetailView shows latest
      setSelectedTrade({
        ...selectedTrade,
        ...updatedTrade
      } as Trade)
      
      await refreshTrades()
    } catch (error) {
      toast.error('Failed to update trade')
    }
  }

  return (
    <div className="w-full max-w-full py-6 px-4 sm:px-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Trading Journal</h1>
          <p className="text-muted-foreground mt-1 text-sm truncate">
            Review and analyze your trade history
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => setShowAIAnalysis(true)}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI Analysis</span>
            <span className="sm:hidden">AI</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol, alias (e.g. NAS, NQ, US100), or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 whitespace-nowrap">
              <Filter className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {filterBy === 'all' ? 'All' : filterBy === 'wins' ? 'Wins' : filterBy === 'losses' ? 'Losses' : filterBy === 'buys' ? 'Buys' : 'Sells'}
              </span>
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 whitespace-nowrap">
              <Tag className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {selectedTagIds.length === 0 ? 'Tags' : `${selectedTagIds.length} Selected`}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Filter by Tags</span>
              {selectedTagIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTagIds([])
                  }}
                >
                  Clear
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tags.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No tags created yet
              </div>
            ) : (
              tags.map((tag) => (
                <DropdownMenuItem
                  key={tag.id}
                  onClick={() => {
                    setSelectedTagIds(prev => 
                      prev.includes(tag.id) 
                        ? prev.filter(id => id !== tag.id)
                        : [...prev, tag.id]
                    )
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => {}}
                      className="h-4 w-4 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: tag.color, color: 'white', borderColor: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Active tag filters display */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtering by:</span>
          {selectedTagIds.map(tagId => {
            const tag = tags.find(t => t.id === tagId)
            return tag ? (
              <Badge
                key={tag.id}
                variant="secondary"
                className="gap-1 cursor-pointer"
                style={{ backgroundColor: tag.color, color: 'white', borderColor: tag.color }}
                onClick={() => setSelectedTagIds(prev => prev.filter(id => id !== tagId))}
              >
                {tag.name}
                <X className="h-3 w-3" />
              </Badge>
            ) : null
          })}
        </div>
      )}

      {isLoading && filteredTrades.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-28" />
                <div className="space-y-2 pt-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-32 w-full rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredTrades.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No trades found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterBy !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Import trades to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Trade cards grid - 3 columns max for better card preview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedTrades.map((trade) => (
              <TradeCard 
                key={trade.id} 
                trade={trade}
                onEdit={() => handleEditTrade(trade)}
                onView={() => handleViewTrade(trade)}
                onDelete={() => handleDeleteTrade(trade)}
              />
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
              <div className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredTrades.length)} of {filteredTrades.length} trades
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs sm:text-sm"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Trade Dialog */}
      <EnhancedEditTrade
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedTrade(null)
        }}
        trade={selectedTrade}
        onSave={handleSaveTrade}
      />

      {/* View Trade Dialog */}
      <TradeDetailView
        isOpen={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false)
          setSelectedTrade(null)
        }}
        trade={selectedTrade}
      />
      
      {/* Delete Trade Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[10002]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Delete Trade?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade ({tradeToDelete?.instrument} {tradeToDelete?.side})? 
              This action cannot be undone and will permanently remove the trade and all its data including screenshots and notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false)
              setTradeToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTrade} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Trade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Analysis Dialog */}
      <AIAnalysisDialog
        isOpen={showAIAnalysis}
        onClose={() => setShowAIAnalysis(false)}
        accountId={null}
      />
    </div>
  )
}

