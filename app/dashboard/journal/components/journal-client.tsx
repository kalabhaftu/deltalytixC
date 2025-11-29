'use client'

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TradeCard } from './trade-card'
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Sparkles, 
  Tag,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Clock,
  BookOpen
} from 'lucide-react'
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
  DropdownMenuCheckboxItem,
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
import { groupTradesByExecution, formatCurrency } from '@/lib/utils'
import Fuse from 'fuse.js'
import { getAssetSearchTerms } from '@/lib/asset-aliases'
import { useTags } from '@/context/tags-provider'
import { cn } from '@/lib/utils'

const ITEMS_PER_PAGE = 21

// Stats Component
function JournalStats({ trades }: { trades: Trade[] }) {
  const stats = useMemo(() => {
    if (trades.length === 0) return null
    
    const wins = trades.filter(t => t.pnl > 0)
    const losses = trades.filter(t => t.pnl < 0)
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0)
    const avgDuration = trades.reduce((sum, t) => sum + (t.timeInPosition || 0), 0) / trades.length
    
    return {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
      totalPnl,
      avgDuration: Math.floor(avgDuration / 60) // in minutes
    }
  }, [trades])

  if (!stats) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Trades</p>
              <p className="text-xl font-bold">{stats.totalTrades}</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Win Rate</p>
              <p className="text-xl font-bold">{stats.winRate.toFixed(1)}%</p>
            </div>
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              stats.winRate >= 50 ? "bg-long/10" : "bg-short/10"
            )}>
              {stats.winRate >= 50 ? (
                <TrendingUp className="h-4 w-4 text-long" />
              ) : (
                <TrendingDown className="h-4 w-4 text-short" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total P&L</p>
              <p className={cn("text-xl font-bold", stats.totalPnl >= 0 ? "text-long" : "text-short")}>
                {stats.totalPnl >= 0 ? '+' : ''}{formatCurrency(stats.totalPnl)}
              </p>
            </div>
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center",
              stats.totalPnl >= 0 ? "bg-long/10" : "bg-short/10"
            )}>
              {stats.totalPnl >= 0 ? (
                <TrendingUp className="h-4 w-4 text-long" />
              ) : (
                <TrendingDown className="h-4 w-4 text-short" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Avg Duration</p>
              <p className="text-xl font-bold">{stats.avgDuration}m</p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Loading Skeleton
function JournalSkeleton() {
  return (
    <div className="w-full max-w-full py-6 px-4 sm:px-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-md" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(9)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="aspect-video w-full rounded-md" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-5 w-20 mt-1" />
                </div>
                <div>
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-5 w-20 mt-1" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

// Empty State
function EmptyState({ 
  hasFilters, 
  searchTerm,
  onClearFilters 
}: { 
  hasFilters: boolean
  searchTerm: string
  onClearFilters: () => void 
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No trades found</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {searchTerm 
            ? `No trades match "${searchTerm}"`
            : hasFilters 
              ? 'Try adjusting your filters'
              : 'Import trades to start journaling'
          }
        </p>
        {(hasFilters || searchTerm) && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
            Clear filters
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function JournalClient() {
  const router = useRouter()
  const { formattedTrades, refreshTrades, updateTrades, isLoading } = useData()
  const { tags } = useTags()
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // State
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

  // Group trades
  const groupedTrades = useMemo(() => groupTradesByExecution(formattedTrades), [formattedTrades])

  // Filter trades
  const filteredTrades = useMemo(() => {
    let trades = groupedTrades

    // Apply smart search with alias support
    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.trim().toLowerCase()
      const termLength = term.length

      if (termLength <= 2) {
        trades = trades.filter(trade => {
          const instrument = (trade.instrument || '').toLowerCase()
          const symbol = (trade.symbol || '').toLowerCase()
          const comment = (trade.comment || '').toLowerCase()
          
          if (instrument.startsWith(term) || symbol.startsWith(term)) return true
          
          const aliases = getAssetSearchTerms(trade.instrument || trade.symbol || '')
          const aliasMatch = aliases.some(alias => alias.toLowerCase().startsWith(term))
          if (aliasMatch) return true
          
          if (comment.includes(term)) return true
          
          return false
        })
      } else if (termLength <= 4) {
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
          threshold: 0.2,
          distance: 50,
          minMatchCharLength: 1,
          includeScore: true,
        })
        
        const results = fuse.search(term)
        trades = results.map(result => result.item)
      } else {
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
          threshold: 0.35,
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

      if (selectedTagIds.length > 0) {
        const tradeTagIds = Array.isArray((trade as any).tags) ? (trade as any).tags : []
        const hasSelectedTag = selectedTagIds.some(tagId => tradeTagIds.includes(tagId))
        if (!hasSelectedTag) return false
      }

      return matchesFilter
    })
  }, [groupedTrades, searchTerm, filterBy, selectedTagIds])

  // Pagination
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

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refreshTrades()
      toast.success('Trades refreshed')
    } catch (error) {
      toast.error('Failed to refresh')
    } finally {
      setIsRefreshing(false)
    }
  }, [refreshTrades])

  const handleEditTrade = useCallback((trade: Trade) => {
    setSelectedTrade(trade)
    setIsEditDialogOpen(true)
  }, [])

  const handleViewTrade = useCallback((trade: Trade) => {
    setSelectedTrade(trade)
    setIsViewDialogOpen(true)
  }, [])

  const handleDeleteTrade = useCallback((trade: Trade) => {
    setTradeToDelete(trade)
    setShowDeleteDialog(true)
  }, [])
  
  const confirmDeleteTrade = useCallback(async () => {
    if (!tradeToDelete) return
    
    try {
      toast.success('Trade deleted successfully')
      await refreshTrades()
    } catch (error) {
      toast.error('Failed to delete trade')
    } finally {
      setShowDeleteDialog(false)
      setTradeToDelete(null)
    }
  }, [tradeToDelete, refreshTrades])

  const handleSaveTrade = useCallback(async (updatedTrade: Partial<Trade>) => {
    if (!selectedTrade) return
    
    try {
      await updateTrades([selectedTrade.id], updatedTrade)
      toast.success('Trade updated successfully')
      setIsEditDialogOpen(false)
      
      setSelectedTrade({
        ...selectedTrade,
        ...updatedTrade
      } as Trade)
      
      await refreshTrades()
    } catch (error) {
      toast.error('Failed to update trade')
    }
  }, [selectedTrade, updateTrades, refreshTrades])

  const handleClearFilters = useCallback(() => {
    setSearchTerm('')
    setFilterBy('all')
    setSelectedTagIds([])
  }, [])

  const hasFilters = filterBy !== 'all' || selectedTagIds.length > 0

  // Show loading skeleton
  if (isLoading && filteredTrades.length === 0) {
    return <JournalSkeleton />
  }

  return (
    <div className="w-full max-w-full py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-4"
      >
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
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <JournalStats trades={groupedTrades} />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            placeholder="Search by symbol, alias, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9 whitespace-nowrap">
              <Filter className="h-4 w-4" />
              <span>
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
            <DropdownMenuSeparator />
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
            <Button variant="outline" size="sm" className="gap-2 h-9 whitespace-nowrap">
              <Tag className="h-4 w-4" />
              <span>
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
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={(checked) => {
                    setSelectedTagIds(prev => 
                      checked 
                        ? [...prev, tag.id]
                        : prev.filter(id => id !== tag.id)
                    )
                  }}
                >
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: tag.color, color: 'white', borderColor: tag.color }}
                    >
                      {tag.name}
                    </Badge>
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>

      {/* Active tag filters display */}
      {selectedTagIds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="flex flex-wrap gap-2 items-center"
        >
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
        </motion.div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {filteredTrades.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <EmptyState 
              hasFilters={hasFilters}
              searchTerm={searchTerm}
              onClearFilters={handleClearFilters}
            />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Trade cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedTrades.map((trade, index) => (
                <motion.div
                  key={trade.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                >
              <TradeCard 
                trade={trade}
                onEdit={() => handleEditTrade(trade)}
                onView={() => handleViewTrade(trade)}
                onDelete={() => handleDeleteTrade(trade)}
              />
                </motion.div>
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8"
              >
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
              </motion.div>
          )}
          </motion.div>
      )}
      </AnimatePresence>

      {/* Dialogs */}
      <EnhancedEditTrade
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setSelectedTrade(null)
        }}
        trade={selectedTrade}
        onSave={handleSaveTrade}
      />

      <TradeDetailView
        isOpen={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false)
          setSelectedTrade(null)
        }}
        trade={selectedTrade}
      />
      
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[10002]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Trade?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trade ({tradeToDelete?.instrument} {tradeToDelete?.side})? 
              This action cannot be undone.
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

      <AIAnalysisDialog
        isOpen={showAIAnalysis}
        onClose={() => setShowAIAnalysis(false)}
        accountId={null}
      />
    </div>
  )
}
