'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Trade } from '@prisma/client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowUpDown, Trash, ChevronLeft, ChevronRight, Edit, Loader2, X, Filter, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { deleteTradesByIdsAction } from '@/server/accounts'
import { useData } from '@/context/data-provider'
import TradeEditDialog from '@/app/dashboard/components/tables/trade-edit-dialog'
import { TradeDetailView } from '@/app/dashboard/components/tables/trade-detail-view'
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { formatQuantity, formatTradeData, BREAK_EVEN_THRESHOLD } from '@/lib/utils'

type SortConfig = {
  key: keyof Trade
  direction: 'asc' | 'desc'
}

type SideFilter = 'all' | 'buy' | 'sell'
type PnlFilter = 'all' | 'wins' | 'losses'

export default function TradeTable() {
  const router = useRouter()
  const { refreshTrades, formattedTrades, updateTrades } = useData()
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'entryDate', direction: 'desc' })
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [tradesPerPage, setTradesPerPage] = useState(50)
  const [selectedTradeForEdit, setSelectedTradeForEdit] = useState<Trade | null>(null)
  const [isEnhancedEditOpen, setIsEnhancedEditOpen] = useState(false)
  const [selectedTradeForView, setSelectedTradeForView] = useState<Trade | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Modern Filters
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [sideFilter, setSideFilter] = useState<SideFilter>('all')
  const [pnlFilter, setPnlFilter] = useState<PnlFilter>('all')
  const [instrumentSearchOpen, setInstrumentSearchOpen] = useState(false)
  const [accountSearchOpen, setAccountSearchOpen] = useState(false)

  // Get unique instruments and accounts for filter options
  const availableInstruments = useMemo(() => {
    return Array.from(new Set(formattedTrades.map(t => t.instrument).filter(Boolean)))
  }, [formattedTrades])

  const availableAccounts = useMemo(() => {
    return Array.from(new Set(formattedTrades.map(t => t.accountNumber).filter(Boolean)))
  }, [formattedTrades])

  const filteredAndSortedTrades = useMemo(() => {
    return formattedTrades
      .filter(trade => {
        // Instrument filter
        if (selectedInstruments.length > 0 && !selectedInstruments.includes(trade.instrument)) {
          return false
        }

        // Account filter
        if (selectedAccounts.length > 0 && !selectedAccounts.includes(trade.accountNumber)) {
          return false
        }

        // Side filter
        if (sideFilter !== 'all') {
          const tradeSide = trade.side?.toLowerCase()
          if (sideFilter === 'buy' && tradeSide !== 'buy') return false
          if (sideFilter === 'sell' && tradeSide !== 'sell') return false
        }

        // PnL filter
        if (pnlFilter !== 'all') {
          const netPnl = trade.pnl - (trade.commission || 0)
          if (pnlFilter === 'wins' && netPnl <= BREAK_EVEN_THRESHOLD) return false
          if (pnlFilter === 'losses' && netPnl >= -BREAK_EVEN_THRESHOLD) return false
        }

        return true
      })
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
  }, [formattedTrades, selectedInstruments, selectedAccounts, sideFilter, pnlFilter, sortConfig])

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

    let loadingToastId: string | number | null = null

    try {
      // Show loading toast and store the ID
      loadingToastId = toast.info("Deleting Trades", {
        description: `Deleting ${ids.length} trade(s)...`,
        duration: Infinity
      })

      // Perform deletion
      await deleteTradesByIdsAction(ids)

      // Refresh trades data immediately
      refreshTrades()

      // CRITICAL: Force router refresh to update UI everywhere
      router.refresh()

      // Dismiss loading toast before showing success
      if (loadingToastId) {
        toast.dismiss(loadingToastId)
      }

      // Show success toast
      toast.success("Trades Deleted", {
        description: `Successfully deleted ${ids.length} trade(s).`,
      })
    } catch (error) {

      // Dismiss loading toast before showing error
      if (loadingToastId) {
        toast.dismiss(loadingToastId)
      }

      toast.error("Error", {
        description: "Failed to delete trades. Please try again.",
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
      await updateTrades([selectedTradeForEdit.id], updatedTrade)

      toast.success("Trade Updated", {
        description: "Trade has been successfully updated.",
      })
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update trade. Please try again.",
      })
    }
  }

  const clearAllFilters = () => {
    setSelectedInstruments([])
    setSelectedAccounts([])
    setSideFilter('all')
    setPnlFilter('all')
  }

  const activeFiltersCount = [
    selectedInstruments.length > 0,
    selectedAccounts.length > 0,
    sideFilter !== 'all',
    pnlFilter !== 'all'
  ].filter(Boolean).length

  return (
    <div className="w-full space-y-4">
      {/* Modern Filter Panel */}
      <div className="space-y-4">
        {/* Quick Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {activeFiltersCount}
              </Badge>
            )}
          </div>

          {/* Side Filter */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={sideFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSideFilter('all')}
              className="h-7 px-3"
            >
              All Sides
            </Button>
            <Button
              variant={sideFilter === 'buy' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSideFilter('buy')}
              className="h-7 px-3"
            >
              Buy
            </Button>
            <Button
              variant={sideFilter === 'sell' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSideFilter('sell')}
              className="h-7 px-3"
            >
              Sell
            </Button>
          </div>

          {/* PnL Filter */}
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={pnlFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPnlFilter('all')}
              className="h-7 px-3"
            >
              All
            </Button>
            <Button
              variant={pnlFilter === 'wins' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPnlFilter('wins')}
              className="h-7 px-3 text-green-600"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Wins
            </Button>
            <Button
              variant={pnlFilter === 'losses' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPnlFilter('losses')}
              className="h-7 px-3 text-red-600"
            >
              <TrendingDown className="h-3 w-3 mr-1" />
              Losses
            </Button>
          </div>

          {/* Instrument Filter */}
          <Popover open={instrumentSearchOpen} onOpenChange={setInstrumentSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-dashed">
                Instruments
                {selectedInstruments.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {selectedInstruments.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search instruments..." />
                <CommandEmpty>No instruments found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {availableInstruments.map((instrument) => (
                    <CommandItem
                      key={instrument}
                      onSelect={() => {
                        setSelectedInstruments(prev =>
                          prev.includes(instrument)
                            ? prev.filter(i => i !== instrument)
                            : [...prev, instrument]
                        )
                      }}
                    >
                      <Checkbox
                        checked={selectedInstruments.includes(instrument)}
                        className="mr-2"
                      />
                      {instrument}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Account Filter */}
          <Popover open={accountSearchOpen} onOpenChange={setAccountSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 border-dashed">
                Accounts
                {selectedAccounts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                    {selectedAccounts.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Search accounts..." />
                <CommandEmpty>No accounts found.</CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {availableAccounts.map((account) => (
                    <CommandItem
                      key={account}
                      onSelect={() => {
                        setSelectedAccounts(prev =>
                          prev.includes(account)
                            ? prev.filter(a => a !== account)
                            : [...prev, account]
                        )
                      }}
                    >
                      <Checkbox
                        checked={selectedAccounts.includes(account)}
                        className="mr-2"
                      />
                      {account}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-9"
            >
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}

          <div className="flex-1" />

          <div className="text-sm text-muted-foreground">
            {filteredAndSortedTrades.length} of {formattedTrades.length} trades
          </div>

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

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedInstruments.map(instrument => (
              <Badge key={instrument} variant="secondary" className="gap-1">
                {instrument}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSelectedInstruments(prev => prev.filter(i => i !== instrument))}
                />
              </Badge>
            ))}
            {selectedAccounts.map(account => (
              <Badge key={account} variant="secondary" className="gap-1">
                {account}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => setSelectedAccounts(prev => prev.filter(a => a !== account))}
                />
              </Badge>
            ))}
          </div>
        )}
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
                <Button variant="ghost" onClick={() => handleSort('instrument')}>
                  Instrument
                  {sortConfig.key === 'instrument' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('accountNumber')}>
                  Account
                  {sortConfig.key === 'accountNumber' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('side')}>
                  Side
                  {sortConfig.key === 'side' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('quantity')}>
                  Quantity
                  {sortConfig.key === 'quantity' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('entryPrice')}>
                  Entry Price
                  {sortConfig.key === 'entryPrice' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('closePrice')}>
                  Close Price
                  {sortConfig.key === 'closePrice' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('entryDate')}>
                  Entry Date
                  {sortConfig.key === 'entryDate' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('closeDate')}>
                  Close Date
                  {sortConfig.key === 'closeDate' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort('pnl')}>
                  PNL
                  {sortConfig.key === 'pnl' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTrades.map((trade) => {
              const formatted = formatTradeData(trade)
              return (
                <TableRow key={trade.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedTrades.has(trade.id)}
                      onCheckedChange={() => toggleTradeSelection(trade.id)}
                    />
                  </TableCell>
                  <TableCell>{formatted.instrument}</TableCell>
                  <TableCell>{formatted.accountNumber}</TableCell>
                  <TableCell>{formatted.side}</TableCell>
                  <TableCell>{formatted.quantity}</TableCell>
                  <TableCell>{formatted.entryPrice}</TableCell>
                  <TableCell>{formatted.closePrice}</TableCell>
                  <TableCell>{formatted.entryDateFormatted}</TableCell>
                  <TableCell>{formatted.closeDateFormatted}</TableCell>
                  <TableCell>{formatted.pnlFormatted}</TableCell>
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
              )
            })}
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
      <TradeEditDialog
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
