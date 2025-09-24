'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table'
import { ScrollArea } from './scroll-area'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: keyof T | string
  header: string
  width?: number
  render?: (value: any, row: T) => React.ReactNode
  sortable?: boolean
}

interface VirtualizedTableProps<T> {
  data: T[]
  columns: Column<T>[]
  height?: number
  rowHeight?: number
  overscan?: number
  className?: string
  onRowClick?: (row: T, index: number) => void
  loading?: boolean
  emptyMessage?: string
}

export function VirtualizedTable<T>({
  data,
  columns,
  height = 400,
  rowHeight = 48,
  overscan = 5,
  className,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available'
}: VirtualizedTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(height)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / rowHeight)
    const end = Math.min(
      start + Math.ceil(containerHeight / rowHeight),
      data.length
    )

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(data.length, end + overscan)
    }
  }, [scrollTop, containerHeight, rowHeight, data.length, overscan])

  // Get visible items
  const visibleItems = useMemo(() => {
    return data.slice(visibleRange.start, visibleRange.end)
  }, [data, visibleRange.start, visibleRange.end])

  // Calculate total height
  const totalHeight = data.length * rowHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const handleContainerResize = useCallback(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight)
    }
  }, [])

  useEffect(() => {
    handleContainerResize()
    window.addEventListener('resize', handleContainerResize)
    return () => window.removeEventListener('resize', handleContainerResize)
  }, [handleContainerResize])

  const renderRow = (item: T, index: number) => {
    const actualIndex = visibleRange.start + index

    return (
      <TableRow
        key={actualIndex}
        className={cn(
          'absolute left-0 right-0',
          onRowClick && 'cursor-pointer hover:bg-muted/50'
        )}
        style={{
          top: actualIndex * rowHeight,
          height: rowHeight
        }}
        onClick={() => onRowClick?.(item, actualIndex)}
      >
        {columns.map((column) => {
          const value = (item as any)[column.key]
          const content = column.render ? column.render(value, item) : String(value || '')

          return (
            <TableCell
              key={String(column.key)}
              className="p-2 border-b"
              style={{ width: column.width }}
            >
              {content}
            </TableCell>
          )
        })}
      </TableRow>
    )
  }

  if (loading) {
    return (
      <div
        ref={containerRef}
        className={cn('flex items-center justify-center', className)}
        style={{ height }}
      >
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn('flex items-center justify-center', className)}
        style={{ height }}
      >
        <div className="text-muted-foreground">{emptyMessage}</div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden border rounded-md', className)}
      style={{ height }}
    >
      <ScrollArea
        ref={scrollElementRef}
        className="h-full w-full"
        onScroll={handleScroll}
      >
        <div
          style={{
            height: totalHeight,
            position: 'relative'
          }}
        >
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {columns.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className="p-2 font-semibold"
                    style={{ width: column.width }}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody className="relative">
              {visibleItems.map(renderRow)}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  )
}

// Performance optimized version with memoization
export const MemoizedVirtualizedTable = React.memo(VirtualizedTable) as typeof VirtualizedTable
