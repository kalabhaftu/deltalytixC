'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { Trade } from '@prisma/client'
import { VirtualizedTable, Column } from '@/components/ui/virtualized-table'
import { useLargeDataset } from '@/hooks/use-large-dataset'
import { formatCurrency, formatNumber, cn } from '@/lib/utils'
import { formatInTimeZone } from 'date-fns-tz'
import { useUserStore } from '@/store/user-store'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface VirtualizedTradeTableProps {
  initialData?: Trade[]
  filters?: {
    dateRange?: { from: Date; to: Date }
    instruments?: string[]
    accountNumbers?: string[]
  }
  onTradeSelect?: (trade: Trade) => void
  className?: string
}

export function VirtualizedTradeTable({
  initialData = [],
  filters,
  onTradeSelect,
  className
}: VirtualizedTradeTableProps) {
  const timezone = useUserStore(state => state.timezone)
  const [sortColumn, setSortColumn] = useState<string>('entryTime')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Use the large dataset hook for progressive loading
  const {
    data,
    loading,
    error,
    hasMore,
    progress,
    total,
    loadMore,
    refresh,
    clearCache
  } = useLargeDataset<Trade>('/api/trades', {
    pageSize: 50,
    maxConcurrentRequests: 2,
    preloadPages: 1,
    enableStreaming: false
  })

  const handleLoadMore = useCallback(() => {
    loadMore(filters)
  }, [loadMore, filters])

  const handleRefresh = useCallback(() => {
    refresh(filters)
  }, [refresh, filters])

  const handleRowClick = useCallback((trade: Trade) => {
    onTradeSelect?.(trade)
  }, [onTradeSelect])

  const columns: Column<Trade>[] = useMemo(() => [
    {
      key: 'entryTime',
      header: 'Entry Time',
      width: 140,
      render: (value: string) => (
        <div className="text-sm">
          {formatInTimeZone(new Date(value), timezone, 'MMM dd, HH:mm')}
        </div>
      )
    },
    {
      key: 'exitTime',
      header: 'Exit Time',
      width: 140,
      render: (value: string | null) => (
        <div className="text-sm text-muted-foreground">
          {value ? formatInTimeZone(new Date(value), timezone, 'MMM dd, HH:mm') : '-'}
        </div>
      )
    },
    {
      key: 'instrument',
      header: 'Instrument',
      width: 100,
      render: (value: string) => (
        <Badge variant="outline" className="font-mono text-xs">
          {value}
        </Badge>
      )
    },
    {
      key: 'side',
      header: 'Side',
      width: 80,
      render: (value: string) => (
        <Badge
          variant={value === 'long' ? 'default' : 'secondary'}
          className={cn(
            'font-medium',
            value === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          )}
        >
          {value.toUpperCase()}
        </Badge>
      )
    },
    {
      key: 'quantity',
      header: 'Qty',
      width: 80,
      render: (value: number) => (
        <div className="text-sm font-mono">
          {formatNumber(value)}
        </div>
      )
    },
    {
      key: 'entryPrice',
      header: 'Entry',
      width: 100,
      render: (value: number) => (
        <div className="text-sm font-mono">
          {formatCurrency(value)}
        </div>
      )
    },
    {
      key: 'exitPrice',
      header: 'Exit',
      width: 100,
      render: (value: number | null) => (
        <div className="text-sm font-mono text-muted-foreground">
          {value ? formatCurrency(value) : '-'}
        </div>
      )
    },
    {
      key: 'pnl',
      header: 'P&L',
      width: 100,
      render: (value: number) => (
        <div className={cn(
          'text-sm font-mono font-medium',
          value >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          {formatCurrency(value)}
        </div>
      )
    },
    {
      key: 'commission',
      header: 'Commission',
      width: 100,
      render: (value: number) => (
        <div className="text-sm font-mono text-muted-foreground">
          {formatCurrency(value)}
        </div>
      )
    },
    {
      key: 'accountNumber',
      header: 'Account',
      width: 100,
      render: (value: string) => (
        <div className="text-sm font-mono">
          {value}
        </div>
      )
    }
  ], [timezone])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with stats and controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {total > 0 ? `${total.toLocaleString()} trades` : 'No trades'}
          </div>
          {loading && (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading... {Math.round(progress)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
          >
            Clear Cache
          </Button>
        </div>
      </div>

      {/* Progress bar for loading */}
      {loading && progress > 0 && (
        <Progress value={progress} className="w-full" />
      )}

      {/* Error message */}
      {error && (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <div className="text-sm text-red-600">
            Error loading trades: {error}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Virtualized table */}
      <VirtualizedTable
        data={data}
        columns={columns}
        height={600}
        rowHeight={56}
        overscan={10}
        onRowClick={handleRowClick}
        loading={loading && data.length === 0}
        emptyMessage="No trades found"
      />

      {/* Load more button */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={handleLoadMore}
            variant="outline"
          >
            Load More Trades
          </Button>
        </div>
      )}

      {/* Footer stats */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-4 border-t">
          <div>
            Showing {data.length.toLocaleString()} of {total.toLocaleString()} trades
          </div>
          <div>
            Scroll or click &quot;Load More&quot; to see additional trades
          </div>
        </div>
      )}
    </div>
  )
}

