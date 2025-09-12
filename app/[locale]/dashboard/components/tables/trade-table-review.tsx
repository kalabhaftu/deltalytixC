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
import { ChevronRight, ChevronDown, ChevronLeft, Info, Search, Filter, X } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Trade } from '@prisma/client'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, parsePositionTime } from '@/lib/utils'
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n } from '@/locales/client'

// import { TradeTag } from './trade-tag' // Removed - journaling feature
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUserStore } from '@/store/user-store'
import { useTableConfigStore } from '@/store/table-config-store'
import { useTickDetailsStore } from '@/store/tick-details-store'
import { TradeImageEditor } from './trade-image-editor'
import { ColumnConfigDialog } from '@/components/ui/column-config-dialog'
import { calculateTicksAndPointsForTrades, calculateTicksAndPointsForGroupedTrade } from '@/lib/tick-calculations'
import { Input } from '@/components/ui/input'
import EnhancedEditTrade from './enhanced-edit-trade'
import TradeDetailView from './trade-detail-view'
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

// Custom Tags Header Component - Removed journaling feature
function TagsColumnHeaderRemoved() {
  // This function has been removed - journaling feature
  return null
}

interface ExtendedTrade extends Trade {
  imageUrl?: string | undefined
  tags: string[]
  imageBase64: string | null
  imageBase64Second: string | null
  comment: string | null
  videoUrl: string | null
  trades: ExtendedTrade[]
  phaseId: string | null
  accountId: string | null
  strategy: string | null
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
  const t = useI18n()
  const {
    formattedTrades: contextTrades,
    updateTrades,
  } = useData()
  // const tags = useUserStore(state => state.tags) // Removed - journaling feature
  const timezone = useUserStore(state => state.timezone)
  const tickDetails = useTickDetailsStore(state => state.tickDetails)

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
  const [sorting, setSorting] = useState<SortingState>(tableConfig?.sorting || [{ id: "entryDate", desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(tableConfig?.columnFilters || [])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(tableConfig?.columnVisibility || {})
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [pageSize, setPageSize] = useState(tableConfig?.pageSize || 10)
  const [pageIndex, setPageIndex] = useState(tableConfig?.pageIndex || 0)
  const [groupingGranularity, setGroupingGranularity] = useState<number>(tableConfig?.groupingGranularity || 0)
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])
  const [showPoints, setShowPoints] = useState(false)

  const [isEnhancedEditOpen, setIsEnhancedEditOpen] = useState(false)
  const [selectedTradeForEdit, setSelectedTradeForEdit] = useState<Trade | null>(null)
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false)
  const [selectedTradeForView, setSelectedTradeForView] = useState<ExtendedTrade | null>(null)

  // Sync local state with store
  React.useEffect(() => {
    if (tableConfig) {
      setSorting(tableConfig.sorting)
      setColumnFilters(tableConfig.columnFilters)
      setColumnVisibility(tableConfig.columnVisibility)
      setPageSize(tableConfig.pageSize)
      setPageIndex(tableConfig.pageIndex)
      setGroupingGranularity(tableConfig.groupingGranularity)
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

  const handleGroupingGranularityChange = (newGranularity: number) => {
    setGroupingGranularity(newGranularity)
    updateGroupingGranularity('trade-table', newGranularity)
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

      // Round dates based on granularity
      const roundDate = (date: Date) => {
        if (groupingGranularity === 0) return date
        const roundedDate = new Date(date)
        roundedDate.setSeconds(Math.floor(date.getSeconds() / groupingGranularity) * groupingGranularity)
        roundedDate.setMilliseconds(0)
        return roundedDate
      }

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
          tags: trade.tags,
          imageBase64: trade.imageBase64,
          imageBase64Second: trade.imageBase64Second,
          phaseId: trade.phaseId ?? null,
          accountId: trade.accountId ?? null,
          strategy: trade.strategy ?? null,
          imageBase64Third: trade.imageBase64Third ?? null,
          imageBase64Fourth: trade.imageBase64Fourth ?? null,
          comment: trade.comment,
          videoUrl: null,
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
          fees: 0,
          realizedPnl: null,
          equityAtOpen: null,
          equityAtClose: null,
          rawBrokerId: null,
          closeReason: trade.closeReason,
          trades: [{
            ...trade,
            trades: []
          }],
          createdAt: new Date(),
          groupId: trade.groupId || null,
        })
      }
      else {
        const group = groups.get(key)!
        group.trades.push({
          ...trade,
          trades: []
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
  }, [trades, groupingGranularity])

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
          {t('trade-table.accounts')}
        </Button>
      ),
      cell: ({ row }) => {
        const trade = row.original
        const accounts = trade.accountNumber.split(':')
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    className="flex items-center justify-center w-fit min-w-6 px-2 h-6 rounded-full bg-primary/10 text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors"
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
        <DataTableColumnHeader column={column} title={t('trade-table.entryDate')} tableId="trade-table" />
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
        <DataTableColumnHeader column={column} title={t('trade-table.instrument')} tableId="trade-table" />
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
        <DataTableColumnHeader column={column} title={t('trade-table.direction')} tableId="trade-table" />
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
        <DataTableColumnHeader column={column} title={t('trade-table.entryPrice')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const entryPrice = parseFloat(row.original.entryPrice)
        const decimalPlaces = getDecimalPlaces(row.original.instrument, entryPrice)
        return (
          <div className="text-right font-medium">
            ${entryPrice.toFixed(decimalPlaces)}
          </div>
        )
      },
    },
    {
      accessorKey: "closePrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.exitPrice')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const exitPrice = parseFloat(row.original.closePrice)
        const decimalPlaces = getDecimalPlaces(row.original.instrument, exitPrice)
        return (
          <div className="text-right font-medium">
            ${exitPrice.toFixed(decimalPlaces)}
          </div>
        )
      },
    },
    {
      accessorKey: "timeInPosition",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.positionTime')} tableId="trade-table" />
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
        <DataTableColumnHeader column={column} title={t('trade-table.entryTime')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.entryDate
        return <div>{formatInTimeZone(new Date(dateStr), timezone, 'HH:mm:ss')}</div>
      },
    },
    {
      accessorKey: "closeDate",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.exitTime')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.closeDate
        return <div>{formatInTimeZone(new Date(dateStr), timezone, 'HH:mm:ss')}</div>
      },
    },
    {
      accessorKey: "pnl",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.pnl')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const pnl = row.original.pnl
        return (
          <div className="text-right font-medium">
            <span className={cn(
              pnl >= 0 ? 'text-green-600' : 'text-red-600'
            )}>
              {pnl.toFixed(2)}
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
            ${commission.toFixed(2)}
          </div>
        )
      },
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t('trade-table.quantity')} tableId="trade-table" />
      ),
      cell: ({ row }) => {
        const quantity = row.original.quantity
        // Use toFixed to preserve decimal places for fractional quantities
        const formattedQuantity = quantity < 1 ? quantity.toFixed(4) : quantity.toLocaleString()
        return (
          <div className="text-right font-medium">
            {formattedQuantity}
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
          </div>
        )
      },
      enableSorting: false,
      enableHiding: false,
    }
  ], [t, timezone])

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
    <Card className="w-full max-w-none sm:max-w-[calc(100vw-14rem)] mx-auto">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-4 h-auto min-h-[56px]"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full gap-4">
          <div className="flex items-center gap-1.5">
            <CardTitle className="line-clamp-1 text-base">
              {t('trade-table.title')}
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('trade-table.description')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant={showPoints ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPoints(!showPoints)}
            >
              {showPoints ? "Show Currency" : "Show Points"}
            </Button>
            {selectedTrades.length >= 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGroupTrades}
              >
                {t('trade-table.groupTrades')}
              </Button>
            )}
            {selectedTrades.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUngroupTrades}
              >
                {t('trade-table.ungroupTrades')}
              </Button>
            )}
            <Select
              value={groupingGranularity.toString()}
              onValueChange={(value) => handleGroupingGranularityChange(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-[180px] min-w-[140px]">
                <div className="flex items-center w-full">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info 
                          className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help mr-2" 
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="z-50">
                        <p>{t('trade-table.granularity.tooltip')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <SelectValue placeholder={t('trade-table.granularity.label')} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">{t('trade-table.granularity.exact')}</SelectItem>
                <SelectItem value="5">{t('trade-table.granularity.fiveSeconds')}</SelectItem>
                <SelectItem value="10">{t('trade-table.granularity.tenSeconds')}</SelectItem>
                <SelectItem value="30">{t('trade-table.granularity.thirtySeconds')}</SelectItem>
                <SelectItem value="60">{t('trade-table.granularity.oneMinute')}</SelectItem>
              </SelectContent>
            </Select>
            <ColumnConfigDialog tableId="trade-table" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* 
          Container with fixed height and internal horizontal scroll:
          - The card container now has a constrained width
          - This container handles the horizontal overflow with proper scrolling
          - Table maintains its natural width without being compressed
          - Sticky header works within the scrollable container
        */}
        <div className="relative">
          <div className="overflow-x-auto overflow-y-visible border-t">
            <table className="w-max min-w-full caption-bottom text-sm">
              <thead className="sticky top-0 z-20 bg-background border-b">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className={cn(
                          "h-12 px-4 text-left align-middle font-medium text-muted-foreground whitespace-nowrap bg-background",
                          "[&:has([role=checkbox])]:pr-2"
                        )}
                        style={{ 
                          minWidth: header.column.id === 'select' || header.column.id === 'expand' 
                            ? '50px' 
                            : header.column.id === 'accounts' 
                            ? '140px'
                            : header.column.id === 'instrument'
                            ? '120px'
                            : header.column.id === 'entryDate' || header.column.id === 'closeDate'
                            ? '160px'
                            : header.column.id === 'timeInPosition'
                            ? '120px'
                            : header.column.id === 'tags'
                            ? '200px'
                            : '110px'
                        }}
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
                              "px-4 py-3 align-middle text-sm whitespace-nowrap",
                              "[&:has([role=checkbox])]:pr-2"
                            )}
                            style={{ 
                              minWidth: cell.column.id === 'select' || cell.column.id === 'expand' 
                                ? '50px' 
                                : cell.column.id === 'accounts' 
                                ? '140px'
                                : cell.column.id === 'instrument'
                                ? '120px'
                                : cell.column.id === 'entryDate' || cell.column.id === 'closeDate'
                                ? '160px'
                                : cell.column.id === 'timeInPosition'
                                ? '120px'
                                : cell.column.id === 'tags'
                                ? '200px'
                                : '110px'
                            }}
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
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-t bg-background px-4 py-3 gap-4">
        <div className="text-sm text-muted-foreground">
          {t('trade-table.totalTrades', { count: groupedTrades.length })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('trade-table.previous')}
          </Button>
          <span className="text-sm">
            {t('trade-table.pageInfo', {
              current: table.getState().pagination.pageIndex + 1,
              total: table.getPageCount()
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t('trade-table.next')}
            <ChevronRight className="h-4 w-4" />
          </Button>
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
    </Card>
  )
}
