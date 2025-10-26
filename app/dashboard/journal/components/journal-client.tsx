'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { TradeCard } from './trade-card'
import { Search, Filter, AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import { useModalStateStore } from '@/store/modal-state-store'
import EnhancedEditTrade from '@/app/dashboard/components/tables/enhanced-edit-trade'
import { TradeDetailView } from '@/app/dashboard/components/tables/trade-detail-view'
import { Trade } from '@prisma/client'

const ITEMS_PER_PAGE = 9 // Show 9 cards per page (3x3 grid on desktop)

export function JournalClient() {
  const router = useRouter()
  const { formattedTrades, refreshTrades, updateTrades } = useData() // Use filtered data from context
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses' | 'buys' | 'sells'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const filteredTrades = useMemo(() => {
    return formattedTrades.filter(trade => {
      const matchesSearch = searchTerm === '' ||
        trade.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.instrument?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'wins' && trade.pnl > 0) ||
        (filterBy === 'losses' && trade.pnl < 0) ||
        (filterBy === 'buys' && trade.side?.toUpperCase() === 'BUY') ||
        (filterBy === 'sells' && trade.side?.toUpperCase() === 'SELL')

      return matchesSearch && matchesFilter
    })
  }, [formattedTrades, searchTerm, filterBy])

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
  }, [searchTerm, filterBy])

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

  const handleDeleteTrade = async (trade: Trade) => {
    if (confirm(`Are you sure you want to delete this trade? This action cannot be undone.`)) {
      try {
        // Here you would implement the delete functionality
        toast.success('Trade deleted successfully')
        await refreshTrades()
      } catch (error) {
        toast.error('Failed to delete trade')
      }
    }
  }

  const handleSaveTrade = async (updatedTrade: Partial<Trade>) => {
    if (!selectedTrade) return
    
    try {
      await updateTrades([selectedTrade.id], updatedTrade)
      toast.success('Trade updated successfully')
      setIsEditDialogOpen(false)
      setSelectedTrade(null)
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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2 flex-shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol, notes, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
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
      </div>

      {filteredTrades.length === 0 ? (
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
    </div>
  )
}

