import React, { useState, useMemo } from 'react'
import { useData } from '@/context/data-provider'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
  sortingFns,
  VisibilityState,
  getExpandedRowModel,
  ExpandedState,
  OnChangeFn,
} from "@tanstack/react-table"
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronDown, ChevronLeft, Info, Search, Filter, X, BarChart3 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Trade, TradingModel } from '@prisma/client'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, parsePositionTime, formatCurrency, formatNumber, formatQuantity, formatTradeData } from '@/lib/utils'
import { Checkbox } from "@/components/ui/checkbox"
import { formatInTimeZone } from 'date-fns-tz'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { DataTableColumnHeader } from './column-header'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from '@/lib/supabase'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { useUserStore } from '@/store/user-store'
import { useTableConfigStore } from '@/store/table-config-store'
import { TradeImageEditor } from './trade-image-editor'
import { ColumnConfigDialog } from '@/components/ui/column-config-dialog'
import { Input } from '@/components/ui/input'
import EnhancedEditTrade from './enhanced-edit-trade'
import TradeDetailView from './trade-detail-view'
import TradeChartModal from './trade-chart-modal'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { TradeTableMobileCard } from './trade-table-mobile-card'
import { useMediaQuery } from '@/hooks/use-media-query'


export interface ExtendedTrade extends Trade {
  imageUrl?: string | undefined
  tags: string[]
  imageBase64: string | null
  imageBase64Second: string | null
  imageBase64Third: string | null
  imageBase64Fourth: string | null
  imageBase64Fifth: string | null
  imageBase64Sixth: string | null
  cardPreviewImage: string | null
  tradingModel: TradingModel | null
  comment: string | null
  trades: ExtendedTrade[]
  // phaseId field removed - use phaseAccountId in new system
  accountId: string | null
  stopLoss: string | null
  takeProfit: string | null
  entryTime: Date | null
  exitTime: Date | null
  closeReason: string | null
}

const supabase = createClient()

// Function to determine appropriate decimal places based on instrument type
const getDecimalPlaces = (instrument: string, price: number): number => {
  const instrumentUpper = instrument.toUpperCase()
  
  // Forex pairs typically need 4-5 decimal places
  if (instrumentUpper.includes('USD') || instrumentUpper.includes('EUR') || 
      instrumentUpper.includes('GBP') || instrumentUpper.includes('JPY') ||
      instrumentUpper.includes('AUD') || instrumentUpper.includes('CAD') ||
      instrumentUpper.includes('CHF') || instrumentUpper.includes('NZD')) {
    // For forex pairs, use 4-5 decimal places
    return 4
  }
  
  // Precious metals like gold/silver need more precision
  if (instrumentUpper.includes('XAU') || instrumentUpper.includes('XAG')) {
    return 2
  }
  
  // For indices and stocks, 2 decimal places is usually sufficient
  if (instrumentUpper.includes('US') || instrumentUpper.includes('SPX') || 
      instrumentUpper.includes('NAS') || instrumentUpper.includes('DOW')) {
    return 2
  }
  
  // Default to 2 decimal places for other instruments
  return 2
}

export function TradeTableReview() {
  const {
    formattedTrades: contextTrades,
    updateTrades,
  } = useData()
  const timezone = useUserStore(state => state.timezone)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Tick details are available for calculations

  // Get table configuration from store
  const {
    tables,
    updateSorting,
    updateColumnFilters,
    updateColumnVisibilityState,
    updatePageSize,
    updatePageIndex,
    updateGroupingGranularity,
  } = useTableConfigStore()

  const tableConfig = tables['trade-table']
  const [sorting, setSorting] = useState<SortingState>(tableConfig?.sorting || [{ id: "closeDate", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(tableConfig?.columnFilters || [])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(tableConfig?.columnVisibility || {})
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [pageSize, setPageSize] = useState(tableConfig?.pageSize || 10)
  const [pageIndex, setPageIndex] = useState(tableConfig?.pageIndex || 0)
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])

  const [isEnhancedEditOpen, setIsEnhancedEditOpen] = useState(false)
  const [selectedTradeForEdit, setSelectedTradeForEdit] = useState<Trade | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [selectedTradeForView, setSelectedTradeForView] = useState<ExtendedTrade | null>(null)
  const [isChartModalOpen, setIsChartModalOpen] = useState(false)
  const [selectedTradeForChart, setSelectedTradeForChart] = useState<ExtendedTrade | null>(null)

  // Sync local state with store
  React.useEffect(() => {
    if (tableConfig) {
      setSorting(tableConfig.sorting)
      setColumnFilters(tableConfig.columnFilters)
      setColumnVisibility(tableConfig.columnVisibility)
      setPageSize(tableConfig.pageSize)
      setPageIndex(tableConfig.pageIndex)
    }
  }, [tableConfig])

  // Update store when local state changes
  const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
    const newSorting = typeof updaterOrValue === 'function' ? updaterOrValue(sorting) : updaterOrValue
    setSorting(newSorting)
    updateSorting('trade-table', newSorting)
  }

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updaterOrValue) => {
    const newFilters = typeof updaterOrValue === 'function' ? updaterOrValue(columnFilters) : updaterOrValue
    setColumnFilters(newFilters)
    updateColumnFilters('trade-table', newFilters)
  }

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (updaterOrValue) => {
    const newVisibility = typeof updaterOrValue === 'function' ? updaterOrValue(columnVisibility) : updaterOrValue
    setColumnVisibility(newVisibility)
    updateColumnVisibilityState('trade-table', newVisibility)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    updatePageSize('trade-table', newPageSize)
  }

  const handlePageIndexChange = (newPageIndex: number) => {
    setPageIndex(newPageIndex)
    updatePageIndex('trade-table', newPageIndex)
  }

  const trades = contextTrades

  const handleGroupTrades = async () => {
    if (selectedTrades.length < 2) return

    // Generate a temporary groupId using timestamp + random number
    const tempGroupId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Update local state immediately
    await updateTrades(selectedTrades, { groupId: tempGroupId })

    // Reset table selection
    table.resetRowSelection()
    setSelectedTrades([])
  }

  const handleUngroupTrades = async () => {
    if (selectedTrades.length === 0) return

    // Update local state immediately
    await updateTrades(selectedTrades, { groupId: null })

    // Reset table selection
    table.resetRowSelection()
    setSelectedTrades([])
  }

  const handleEnhancedEditSave = async (updatedData: Partial<Trade>) => {
    if (!selectedTradeForEdit) return

    await updateTrades([selectedTradeForEdit.id], updatedData)
  }

  // Group trades by instrument, entry date, and close date with granularity
  const groupedTrades = useMemo(() => {
    const groups = new Map<string, ExtendedTrade>()

    trades.forEach(trade => {
      // Create a key that accounts for granularity
      const entryDate = new Date(trade.entryDate)

      // No date rounding - use exact dates
      const roundDate = (date: Date) => date

      const roundedEntryDate = roundDate(entryDate)

      const key = trade.groupId ? `${trade.groupId}` : `${trade.instrument}-${roundedEntryDate.toISOString()}`

      if (!groups.has(key)) {
        groups.set(key, {
          instrument: trade.instrument,
          entryDate: roundedEntryDate.toISOString(),
          closeDate: trade.closeDate,
          symbol: trade.symbol ?? null,
          entryTime: null,
          exitTime: null,
          imageBase64: trade.imageBase64,
          imageBase64Second: trade.imageBase64Second,
          // phaseId field removed - use phaseAccountId in new system
          accountId: trade.accountId ?? null,
          imageBase64Third: trade.imageBase64Third ?? null,
          imageBase64Fourth: trade.imageBase64Fourth ?? null,
          imageBase64Fifth: (trade as any).imageBase64Fifth ?? null,
          imageBase64Sixth: (trade as any).imageBase64Sixth ?? null,
          cardPreviewImage: (trade as any).cardPreviewImage ?? null,
          tradingModel: (trade as any).tradingModel as TradingModel | null,
          comment: trade.comment,
          id: '',
          accountNumber: trade.accountNumber,
          quantity: trade.quantity,
          entryId: null,
          closeId: null,
          entryPrice: trade.entryPrice,
          closePrice: trade.closePrice,
          pnl: trade.pnl,
          timeInPosition: trade.timeInPosition,
          userId: '',
          side: trade.side,
          commission: trade.commission,
          closeReason: trade.closeReason,
          tags: [],
          stopLoss: trade.stopLoss || null,
          takeProfit: trade.takeProfit || null,
          trades: [{
            ...trade,
            trades: [],
            tags: [],
            imageBase64Fifth: (trade as any).imageBase64Fifth ?? null,
            imageBase64Sixth: (trade as any).imageBase64Sixth ?? null,
            cardPreviewImage: (trade as any).cardPreviewImage ?? null,
            tradingModel: (trade as any).tradingModel as TradingModel | null,
          }],
          createdAt: new Date(),
          groupId: trade.groupId || null,
          phaseAccountId: trade.phaseAccountId || null,
        })
      }
      else {
        const group = groups.get(key)!
        group.trades.push({
          ...trade,
          trades: [],
          tags: [],
          imageBase64Fifth: (trade as any).imageBase64Fifth ?? null,
          imageBase64Sixth: (trade as any).imageBase64Sixth ?? null,
          cardPreviewImage: (trade as any).cardPreviewImage ?? null,
          tradingModel: (trade as any).tradingModel as TradingModel | null,
        })
        group.pnl += trade.pnl || 0
        group.commission += trade.commission || 0
        group.quantity += trade.quantity || 0
        // Update closeDate to the latest one
        if (new Date(trade.closeDate) > new Date(group.closeDate)) {
          group.closeDate = trade.closeDate
        }
        // Update timeInPosition to the longest one
        if ((trade.timeInPosition || 0) > (group.timeInPosition || 0)) {
          group.timeInPosition = trade.timeInPosition
        }
        if (!group.accountNumber.includes(trade.accountNumber)) {
          group.accountNumber += ':' + trade.accountNumber;
        }
      }
    })

    return Array.from(groups.values())
  }, [trades])

  const columns = useMemo<ColumnDef<ExtendedTrade>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value)
            // Get all trade IDs including subrows
            const allTradeIds = table.getRowModel().rows.flatMap(row => {
              const subTradeIds = row.original.trades.map(t => t.id)
              return [row.original.id, ...subTradeIds]
            })
            setSelectedTrades(value ? allTradeIds : [])
          }}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value)
            // Get all trade IDs for this row including subrows
            const tradeIds = [
              row.original.id,
              ...row.original.trades.map(t => t.id)
            ]
            setSelectedTrades(prev =>
              value
                ? [...prev, ...tradeIds]
                : prev.filter(id => !tradeIds.includes(id))
            )
          }}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "expand",
      header: () => null,
      cell: ({ row }) => {
        const trade = row.original
        if (trade.trades.length <= 1) return null

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={row.getToggleExpandedHandler()}
            className="hover:bg-transparent"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )
      },
    },
    {
      id: "accounts",
      header: () => (
        <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
          Total
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.original
        const accounts = trade.accountNumber.split(',')
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    className="flex items-center justify-center w-fit min-w-6 px-2 h-6 rounded-full bg-muted text-xs font-medium cursor-pointer hover:bg-muted/80 transition-colors"
                    title={accounts.length === 1 ? accounts[0] : accounts.join(', ')}
                  >
                    {accounts.length === 1 
                      ? (accounts[0].length > 6 
                          ? `${accounts[0].slice(0, 3)}...${accounts[0].slice(-3)}` 
                          : accounts[0]
                        )
                      : `+${accounts.length}`
                    }
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-fit p-0"
                  align="start"
                  side="right"
                >
                  <ScrollArea className="h-36 rounded-md border">
                    {accounts.map((account) => (
                      <div
                        key={`account-${account}`}
                        className="px-3 py-2 text-sm hover:bg-muted/50 cursor-default"
                      >
                        {account}
                      </div>
                    ))}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
            {trade.trades.length > 0 && (
              <span className="text-xs text-muted-foreground">
                ({trade.trades.length})
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Entry Date" tableId="trade-table" />
      ),
      cell: ({ row }) => formatInTimeZone(new Date(row.original.entryDate), timezone, 'yyyy-MM-dd'),
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(rowA.getValue(columnId)).getTime();
        const b = new Date(rowB.getValue(columnId)).getTime();
        return a < b ? -1 : a > b ? 1 : 0;
      },
    },
    {
      accessorKey: "instrument",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Instrument" tableId="trade-table" />
      ),
      size: 140,
      cell: ({ row }) => {
        const instrument = row.original.instrument
        return (
          <div className="text-right font-medium">
            {instrument}
          </div>
        )
      },
    },
    {
      accessorKey: "direction",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Direction" tableId="trade-table" />
      ),
      size: 120,
      cell: ({ row }) => {
        return (
          <div className="text-right font-medium">
            {row.original.side?.toUpperCase()}
          </div>
        )
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.original.side?.toUpperCase() || ""
        const b = rowB.original.side?.toUpperCase() || ""

        // Sort LONG before SHORT
        if (a === "LONG" && b === "SHORT") return -1
        if (a === "SHORT" && b === "LONG") return 1

        // Alphabetical fallback for any other values
        return a < b ? -1 : a > b ? 1 : 0
      },
    },
    {
      accessorKey: "entryPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Entry Price" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const entryPrice = parseFloat(row.original.entryPrice)
        const decimalPlaces = getDecimalPlaces(row.original.instrument, entryPrice)
        return (
          <div className="text-right font-medium">
            {formatCurrency(entryPrice, decimalPlaces)}
          </div>
        )
      },
    },
    {
      accessorKey: "closePrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Close Price" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const exitPrice = parseFloat(row.original.closePrice)
        const decimalPlaces = getDecimalPlaces(row.original.instrument, exitPrice)
        return (
          <div className="text-right font-medium">
            {formatCurrency(exitPrice, decimalPlaces)}
          </div>
        )
      },
    },
    {
      accessorKey: "timeInPosition",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Time in Position" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const timeInPosition = row.original.timeInPosition || 0
        return <div>{parsePositionTime(timeInPosition)}</div>
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = rowA.original.timeInPosition || 0
        const b = rowB.original.timeInPosition || 0
        return a - b
      },
    },
    {
      accessorKey: "entryTime",
      accessorFn: (row) => row.entryDate,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Entry Time" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.entryDate
        return <div>{formatInTimeZone(new Date(dateStr), timezone, 'HH:mm:ss')}</div>
      },
    },
    {
      accessorKey: "closeDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Close Date" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.closeDate
        return <div>{formatInTimeZone(new Date(dateStr), timezone, 'HH:mm:ss')}</div>
      },
      sortingFn: (rowA, rowB, columnId) => {
        const a = new Date(rowA.getValue(columnId)).getTime();
        const b = new Date(rowB.getValue(columnId)).getTime();
        return a < b ? -1 : a > b ? 1 : 0;
      },
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="PnL" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const pnl = row.original.pnl
        return (
          <div className="text-right font-medium">
            <span className={cn(
              pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'
            )}>
              {formatCurrency(pnl)}
            </span>
          </div>
        )
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "commission",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Commission" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const commission = row.original.commission
        return (
          <div className="text-right font-medium">
            {formatCurrency(commission)}
          </div>
        )
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quantity" tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const quantity = row.original.quantity
        return (
          <div className="text-right font-medium">
            {formatQuantity(quantity)}
          </div>
        )
      },
      sortingFn: "basic",
    },




    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const trade = row.original
        // For grouped trades, edit the first trade only (or allow editing any)
        const tradeToEdit = trade.trades.length > 0 ? trade.trades[0] : trade
        
        return (
          <div className="flex items-center space-x-2">
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
                setSelectedTradeForEdit(tradeToEdit)
                setIsEnhancedEditOpen(true)
              }}
            >
              Edit
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!trade.entryDate || !trade.closeDate || !trade.entryPrice || !trade.closePrice}
                    onClick={() => {
                      setSelectedTradeForChart(trade)
                      setIsChartModalOpen(true)
                    }}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>
                    {!trade.entryDate || !trade.closeDate || !trade.entryPrice || !trade.closePrice
                      ? 'Trade data incomplete'
                      : 'View on Chart'
                    }
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    }
  ], [timezone])

  const table = useReactTable({
    data: groupedTrades,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      expanded,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    paginateExpandedRows: false,
    onExpandedChange: setExpanded,
    onPaginationChange: (updaterOrValue) => {
      const newPagination = typeof updaterOrValue === 'function' 
        ? updaterOrValue({ pageIndex, pageSize })
        : updaterOrValue
      handlePageIndexChange(newPagination.pageIndex)
      handlePageSizeChange(newPagination.pageSize)
    },
    getSubRows: (row) => row.trades,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand: (row) => row.original.trades.length > 0,
    getExpandedRowModel: getExpandedRowModel(),
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    defaultColumn: {
      minSize: 100,
      maxSize: 300,
    },
  })

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="border-b p-4 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">Trade History</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>View detailed trade information</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {selectedTrades.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGroupTrades}
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Group Trades</span>
                <span className="sm:hidden">Group ({selectedTrades.length})</span>
              </Button>
            )}
            {selectedTrades.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUngroupTrades}
                className="flex-1 sm:flex-none"
              >
                <span className="hidden sm:inline">Ungroup Trades</span>
                <span className="sm:hidden">Ungroup</span>
              </Button>
            )}
            <ColumnConfigDialog tableId="trade-table" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isMobile ? (
          /* Mobile Card View */
          <div className="p-4 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const trade = row.original
                return (
                  <TradeTableMobileCard
                    key={row.id}
                    trade={trade}
                    timezone={timezone}
                    isSelected={row.getIsSelected()}
                    isExpanded={row.getIsExpanded()}
                    canExpand={row.getCanExpand()}
                    onToggleSelect={() => row.toggleSelected()}
                    onToggleExpand={() => row.toggleExpanded()}
                    onViewDetails={() => {
                      setSelectedTradeForView(trade)
                      setIsDetailViewOpen(true)
                    }}
                    onEdit={() => {
                      setSelectedTradeForEdit(trade)
                      setIsEnhancedEditOpen(true)
                    }}
                    onViewChart={() => {
                      setSelectedTradeForChart(trade)
                      setIsChartModalOpen(true)
                    }}
                  />
                )
              })
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No trades found
              </div>
            )}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="relative w-full overflow-x-auto">
            <table className="min-w-[1400px] caption-bottom text-sm">
              <thead className="sticky top-0 z-20 bg-background border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          "h-10 px-3 text-left align-middle font-medium text-muted-foreground bg-background text-xs lg:text-sm whitespace-nowrap",
                          "[&:has([role=checkbox])]:pr-2"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <React.Fragment key={row.id}>
                      <tr
                        data-state={row.getIsSelected() && "selected"}
                        className={cn(
                          "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
                          row.getIsExpanded()
                            ? "bg-muted"
                            : row.getCanExpand()
                              ? ""
                              : "bg-muted/50"
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={cn(
                              "px-3 py-2.5 align-middle text-xs lg:text-sm whitespace-nowrap",
                              "[&:has([role=checkbox])]:pr-2"
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="h-24 text-center px-4 py-3 align-middle"
                    >
                      No results.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4 border-t bg-background px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} of {table.getCoreRowModel().rows.length} trades
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-16">
                    {pageSize}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {[10, 25, 50, 100, 250].map((size) => (
                    <DropdownMenuItem
                      key={size}
                      onClick={() => handlePageSizeChange(size)}
                    >
                      {size}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8"
            >
              <ChevronLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            <span className="text-sm px-2">
              {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
        </div>
      </CardFooter>
      
      <TradeDetailView
        isOpen={isDetailViewOpen}
        onClose={() => {
          setIsDetailViewOpen(false)
          setSelectedTradeForView(null)
        }}
        trade={selectedTradeForView}
      />
      
      <EnhancedEditTrade
        isOpen={isEnhancedEditOpen}
        onClose={() => {
          setIsEnhancedEditOpen(false)
          setSelectedTradeForEdit(null)
        }}
        trade={selectedTradeForEdit}
        onSave={handleEnhancedEditSave}
      />

      <TradeChartModal
        isOpen={isChartModalOpen}
        onClose={() => {
          setIsChartModalOpen(false)
          setSelectedTradeForChart(null)
        }}
        trade={selectedTradeForChart}
      />
    </Card>
  )
}
