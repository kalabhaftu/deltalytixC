'use client'

import { useState, useMemo } from 'react'
import { Trade } from '@prisma/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, Trash, ChevronLeft, ChevronRight, Edit, Loader2 } from "lucide-react"
import { saveTradesAction } from '@/server/database'
import { useToast } from "@/hooks/use-toast"
import { deleteTradesByIdsAction } from '@/server/accounts'
import { useData } from '@/context/data-provider'
import EnhancedEditTrade from '@/app/dashboard/components/tables/enhanced-edit-trade'
import TradeDetailView from '@/app/dashboard/components/tables/trade-detail-view'

type SortConfig = {
  key: keyof Trade
  direction: 'asc' | 'desc'
}

export default function TradeTable() {
  const { refreshTrades, formattedTrades } = useData()
  const [filterValue, setFilterValue] = useState('')
  const [filterKey, setFilterKey] = useState<keyof Trade>('instrument')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'entryDate', direction: 'desc' })
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const [selectAll, setSelectAll] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [tradesPerPage, setTradesPerPage] = useState(50) // Increased default from 10 to 50
  const [selectedTradeForEdit, setSelectedTradeForEdit] = useState<Trade | null>(null)
  const [isEnhancedEditOpen, setIsEnhancedEditOpen] = useState(false)
  const [selectedTradeForView, setSelectedTradeForView] = useState<Trade | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showCovered, setShowCovered] = useState(true)

  const filteredAndSortedTrades = useMemo(() => {
    return formattedTrades
      .filter(trade => 
        String(trade[filterKey] ?? '').toLowerCase().includes(filterValue.toLowerCase())
      )
      .sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return sortConfig.direction === 'asc' ? 1 : -1
        if (bValue == null) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
  }, [formattedTrades, filterValue, filterKey, sortConfig])

  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * tradesPerPage
    return filteredAndSortedTrades.slice(startIndex, startIndex + tradesPerPage)
  }, [filteredAndSortedTrades, currentPage, tradesPerPage])

  const totalPages = Math.ceil(filteredAndSortedTrades.length / tradesPerPage)

  const handleSort = (key: keyof Trade) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return
    
    setIsDeleting(true)
    
    // Clear selection immediately for responsive UI
    setSelectedTrades(new Set())
    setSelectAll(false)
    
    try {
      // Show loading toast
      toast({
        title: "Deleting Trades",
        description: `Deleting ${ids.length} trade(s)...`,
      })
      
      // Perform deletion
      await deleteTradesByIdsAction(ids)
      
      // Refresh trades data immediately
      refreshTrades()
      
      // Show success toast
      toast({
        title: "Trades Deleted",
        description: `Successfully deleted ${ids.length} trade(s).`,
      })
    } catch (error) {
      console.error('Error deleting trades:', error)
      toast({
        title: "Error",
        description: "Failed to delete trades. Please try again.",
        variant: "destructive"
      })
      // Refresh data even on error to ensure UI is in sync
      refreshTrades()
    } finally {
      setIsDeleting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedTrades(new Set())
    } else {
      const allTradeIds = new Set(filteredAndSortedTrades.map(trade => trade.id))
      setSelectedTrades(allTradeIds)
    }
    setSelectAll(!selectAll)
  }

  const toggleTradeSelection = (id: string) => {
    const newSelected = new Set(selectedTrades)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTrades(newSelected)
    setSelectAll(newSelected.size === filteredAndSortedTrades.length)
  }

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  const handleSaveTrade = async (updatedTrade: Partial<Trade>) => {
    if (!selectedTradeForEdit) return
    
    try {
      // Update the trade with new data
      await saveTradesAction([{
        ...selectedTradeForEdit,
        ...updatedTrade
      }])
      
      // Refresh trades data
      await refreshTrades()
      
      toast({
        title: "Trade Updated",
        description: "Trade has been successfully updated.",
      })
    } catch (error) {
      console.error('Error updating trade:', error)
      toast({
        title: "Error",
        description: "Failed to update trade. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col lg:flex-row gap-4 lg:justify-between lg:items-center">
        <div className="flex flex-col lg:flex-row gap-2">
          <Select value={filterKey} onValueChange={(value) => setFilterKey(value as keyof Trade)}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="Filter by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instrument">Instrument</SelectItem>
              <SelectItem value="side">Side</SelectItem>
              <SelectItem value="accountNumber">Account Number</SelectItem>
              <SelectItem value="comment">Comments</SelectItem>
              <SelectItem value="closeReason">Close Reason</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Input
              placeholder={`Search ${filterKey.replace(/([A-Z])/g, ' $1').toLowerCase()}...`}
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="w-full lg:max-w-sm pr-8"
            />
            {filterValue && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => setFilterValue('')}
              >
                ×
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="text-sm text-muted-foreground">
            {filteredAndSortedTrades.length} of {formattedTrades.length}
          </div>
          <Button
            variant={showCovered ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCovered(!showCovered)}
          >
            {showCovered ? "Hide Covered" : "Show Covered"}
          </Button>
          {selectedTrades.size > 0 && (
            <Button 
              onClick={() => handleDelete(Array.from(selectedTrades))} 
              disabled={isDeleting}
              variant="destructive"
              size="sm"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
              {isDeleting ? 'Deleting...' : `Delete (${selectedTrades.size})`}
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-md border overflow-auto shadow-sm">
        <Table className="w-full" style={{ minWidth: '1000px' }}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
            <TableHead className="w-[100px]">
              <Button variant="ghost" onClick={() => handleSor"Instruments"}>
                Instrument
                {sortConfig.key === 'instrument' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSor"Loading..."}>
                Account
                {sortConfig.key === 'accountNumber' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSor"Side"}>
                Side
                {sortConfig.key === 'side' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSor"Quantity"}>
                Quantity
                {sortConfig.key === 'quantity' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSor"Loading..."}>
                Entry Price
                {sortConfig.key === 'entryPrice' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSor"Loading..."}>
                Close Price
                {sortConfig.key === 'closePrice' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSor"Loading..."}>
                Entry Date
                {sortConfig.key === 'entryDate' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSor"Loading..."}>
                Close Date
                {sortConfig.key === 'closeDate' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>
              <Button variant="ghost" onClick={() => handleSor"PnL"}>
                PNL
                {sortConfig.key === 'pnl' && <ArrowUpDown className="ml-2 h-4 w-4" />}
              </Button>
            </TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTrades.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell>
                <Checkbox
                  checked={selectedTrades.has(trade.id)}
                  onCheckedChange={() => toggleTradeSelection(trade.id)}
                />
              </TableCell>
              <TableCell>{trade.instrument}</TableCell>
              <TableCell>{trade.accountNumber}</TableCell>
              <TableCell>{trade.side}</TableCell>
              <TableCell>{trade.quantity}</TableCell>
              <TableCell>{trade.entryPrice}</TableCell>
              <TableCell>{trade.closePrice}</TableCell>
              <TableCell>{new Date(trade.entryDate).toLocaleString()}</TableCell>
              <TableCell>{new Date(trade.closeDate).toLocaleString()}</TableCell>
              <TableCell>{trade.pnl.toFixed(2)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTradeForView(trade)
                      setIsDetailViewOpen(true)
                    }}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTradeForEdit(trade)
                      setIsEnhancedEditOpen(true)
                    }}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <p className="text-sm text-gray-500">
            Showing {((currentPage - 1) * tradesPerPage) + 1} to {Math.min(currentPage * tradesPerPage, filteredAndSortedTrades.length)} of {filteredAndSortedTrades.length} trades
          </p>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Show:</span>
            <select 
              value={tradesPerPage} 
              onChange={(e) => {
                setTradesPerPage(Number(e.target.value))
                setCurrentPage(1) // Reset to first page when changing page size
              }}
              className="text-sm border rounded px-2 py-1"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={filteredAndSortedTrades.length}>All ({filteredAndSortedTrades.length})</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Trade Detail View Dialog */}
      <TradeDetailView
        isOpen={isDetailViewOpen}
        onClose={() => {
          setIsDetailViewOpen(false)
          setSelectedTradeForView(null)
        }}
        trade={selectedTradeForView}
      />
      
      {/* Enhanced Edit Trade Dialog */}
      <EnhancedEditTrade
        isOpen={isEnhancedEditOpen}
        onClose={() => {
          setIsEnhancedEditOpen(false)
          setSelectedTradeForEdit(null)
        }}
        trade={selectedTradeForEdit}
        onSave={handleSaveTrade}
      />
    </div>
  )
}
