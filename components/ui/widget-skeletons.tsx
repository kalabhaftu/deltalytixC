'use client'

/**
 * Contextual Widget Skeletons
 * 
 * This file provides detailed, contextual loading skeletons for dashboard widgets
 * that accurately mimic the layout and structure of their final content.
 * 
 * Key Design Principles:
 * - Uses consistent styling with the reference skeleton from Accounts page
 * - Different skeleton types for different widget categories (charts, statistics, tables, etc.)
 * - Responsive sizing based on widget size configuration
 * - Visual cues that suggest the type of content that will load
 */

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { WidgetSize, WidgetType } from '@/app/[locale]/dashboard/types/dashboard'

interface WidgetSkeletonProps {
  type: WidgetType
  size?: WidgetSize
  className?: string
}

/**
 * Chart skeleton that mimics the structure of chart widgets
 */
function ChartSkeleton({ size = 'medium', className }: { size?: WidgetSize; className?: string }) {
  const getChartHeight = () => {
    switch (size) {
      case 'small':
        return 'h-24'
      case 'small-long':
        return 'h-20'
      case 'medium':
        return 'h-32'
      case 'large':
        return 'h-48'
      case 'extra-large':
        return 'h-64'
      default:
        return 'h-32'
    }
  }

  const getHeaderSize = () => {
    switch (size) {
      case 'small':
      case 'small-long':
        return 'p-2'
      default:
        return 'p-3 sm:p-4'
    }
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className={cn('flex flex-col items-stretch space-y-0 border-b shrink-0', getHeaderSize())}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          {size !== 'small' && size !== 'small-long' && (
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-8" />
              <Skeleton className="h-4 w-12" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 sm:p-4">
        <div className="space-y-3">
          {/* Chart area with grid lines suggesting chart structure */}
          <div className={cn('w-full bg-muted/30 rounded-lg flex flex-col justify-between p-2', getChartHeight())}>
            {/* Grid lines to suggest chart structure */}
            <div className="flex justify-between items-start">
              <Skeleton className="h-2 w-8" />
              <Skeleton className="h-2 w-8" />
              <Skeleton className="h-2 w-8" />
              <Skeleton className="h-2 w-8" />
            </div>
            {/* Simulated chart line/bars */}
            <div className="flex items-end justify-between gap-1 h-16">
              {Array.from({ length: size === 'small-long' ? 12 : 8 }).map((_, i) => {
                // Create more realistic varied heights that simulate actual chart data
                const heights = ['h-3', 'h-6', 'h-4', 'h-10', 'h-8', 'h-5', 'h-12', 'h-7']
                const height = heights[i % heights.length]
                return (
                  <Skeleton 
                    key={i} 
                    className={`w-full ${height}`} 
                  />
                )
              })}
            </div>
            <div className="flex justify-between items-end">
              <Skeleton className="h-2 w-6" />
              <Skeleton className="h-2 w-6" />
              <Skeleton className="h-2 w-6" />
              <Skeleton className="h-2 w-6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Statistics card skeleton for metric widgets
 */
function StatisticsSkeleton({ size = 'tiny', className }: { size?: WidgetSize; className?: string }) {
  return (
    <Card className={cn('flex items-center justify-center h-full', className)}>
      <div className="flex items-center gap-2 p-2">
        {/* Icon placeholder */}
        <Skeleton className="h-4 w-4 rounded" />
        {/* Main metric value */}
        <Skeleton className="h-5 w-16 font-semibold" />
        {/* Help icon */}
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
    </Card>
  )
}

/**
 * Calendar skeleton that shows calendar grid structure
 */
function CalendarSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-7 rounded" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-8" />
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1 h-[calc(100%-40px)]">
          {Array.from({ length: 35 }).map((_, i) => (
            <div 
              key={i} 
              className="flex flex-col items-center justify-center p-1 rounded border border-border"
            >
              <Skeleton className="h-3 w-full mb-0.5" />
              <Skeleton className="h-2 w-3/4" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Table skeleton that shows rows and columns structure
 */
function TableSkeleton({ size = 'extra-large', className }: { size?: WidgetSize; className?: string }) {
  const getRowCount = () => {
    switch (size) {
      case 'large':
        return 8
      case 'extra-large':
        return 12
      default:
        return 6
    }
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="p-3 sm:p-4 border-b shrink-0">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="space-y-0">
          {/* Table header */}
          <div className="flex items-center gap-4 p-3 border-b bg-muted/30">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-8" />
          </div>
          
          {/* Table rows */}
          {Array.from({ length: getRowCount() }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border-b border-border/50">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Complex statistics widget skeleton with multiple metrics
 */
function ComplexStatisticsSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="p-3 sm:p-4 border-b">
        <Skeleton className="h-5 w-24" />
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Line chart skeleton for equity and performance charts
 */
function LineChartSkeleton({ size = 'medium', className }: { size?: WidgetSize; className?: string }) {
  const getChartHeight = () => {
    switch (size) {
      case 'small':
        return 'h-24'
      case 'small-long':
        return 'h-20'
      case 'medium':
        return 'h-32'
      case 'large':
        return 'h-48'
      case 'extra-large':
        return 'h-64'
      default:
        return 'h-32'
    }
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="p-3 sm:p-4 border-b shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-3 rounded-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 sm:p-4">
        <div className="space-y-3">
          <div className={cn('w-full bg-muted/30 rounded-lg flex flex-col justify-between p-2', getChartHeight())}>
            {/* Y-axis labels */}
            <div className="flex justify-between items-start">
              <Skeleton className="h-2 w-8" />
              <Skeleton className="h-2 w-8" />
            </div>
            {/* Simulated line chart path */}
            <div className="relative h-16 flex items-center">
              <svg className="w-full h-full" viewBox="0 0 200 50">
                <path 
                  d="M 0,40 Q 25,20 50,30 T 100,25 T 150,35 T 200,15" 
                  stroke="hsl(var(--muted-foreground))" 
                  strokeWidth="2" 
                  fill="none" 
                  opacity="0.3"
                />
              </svg>
            </div>
            {/* X-axis labels */}
            <div className="flex justify-between items-end">
              <Skeleton className="h-2 w-6" />
              <Skeleton className="h-2 w-6" />
              <Skeleton className="h-2 w-6" />
              <Skeleton className="h-2 w-6" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Main widget skeleton component that selects appropriate skeleton based on widget type
 */
export function WidgetSkeleton({ type, size = 'medium', className }: WidgetSkeletonProps) {
  // Line chart widgets (equity, time-based performance)
  if ([
    'equityChart',
    'timeRangePerformance'
  ].includes(type)) {
    return <LineChartSkeleton size={size} className={className} />
  }

  // Bar chart widgets
  if ([
    'pnlChart',
    'weekdayPnlChart',
    'timeOfDayChart',
    'timeInPositionChart',
    'pnlBySideChart',
    'tickDistribution',
    'commissionsPnl',
    'tradeDistribution'
  ].includes(type)) {
    return <ChartSkeleton size={size} className={className} />
  }

  // Statistics cards
  if ([
    'averagePositionTime',
    'cumulativePnl',
    'longShortPerformance',
    'tradePerformance',
    'winningStreak',
    'profitFactor',
    'riskRewardRatio'
  ].includes(type)) {
    return <StatisticsSkeleton size={size} className={className} />
  }

  // Complex statistics widget
  if (type === 'statisticsWidget') {
    return <ComplexStatisticsSkeleton className={className} />
  }

  // Calendar widget
  if (type === 'calendarWidget') {
    return <CalendarSkeleton className={className} />
  }

  // Table widgets
  if (type === 'tradeTableReview') {
    return <TableSkeleton size={size} className={className} />
  }

  // Default fallback to chart skeleton for other widgets
  return <ChartSkeleton size={size} className={className} />
}

export default WidgetSkeleton
