/**
 * Unified Chart Component
 * 
 * Standardized wrapper for Recharts with consistent theming
 * matching TradeZella's professional aesthetic.
 */

'use client'

import * as React from 'react'
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  TooltipProps,
  Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { chartColors } from '@/lib/design-tokens'

// Helper functions for chart colors
const getChartColor = (type: 'positive' | 'negative' | 'neutral' | 'info' | 'warning') => {
  const colorMap = {
    positive: chartColors.profit,
    negative: chartColors.loss,
    neutral: '#6B7280',
    info: '#3B82F6',
    warning: '#F59E0B'
  }
  return colorMap[type]
}

const getPnLChartColor = (value: number) => value >= 0 ? chartColors.profit : chartColors.loss

/**
 * Unified Chart Configuration
 */
export const CHART_CONFIG = {
  grid: {
    strokeDasharray: '3 3',
    stroke: 'hsl(var(--border))',
    opacity: 0.5,
  },
  axis: {
    tick: {
      fill: 'hsl(var(--muted-foreground))',
      fontSize: 11,
      fontFamily: 'var(--font-inter, Inter, sans-serif)',
    },
    axisLine: {
      stroke: 'hsl(var(--border))',
    },
  },
  tooltip: {
    contentStyle: {
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: 'var(--radius)',
      padding: '0.75rem',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
    labelStyle: {
      color: 'hsl(var(--foreground))',
      fontWeight: 600,
      marginBottom: '0.5rem',
    },
    itemStyle: {
      color: 'hsl(var(--muted-foreground))',
      fontSize: '0.875rem',
    },
  },
  colors: {
    positive: getChartColor('positive'),
    negative: getChartColor('negative'),
    neutral: getChartColor('neutral'),
    info: getChartColor('info'),
    warning: getChartColor('warning'),
  },
} as const

/**
 * Unified Cartesian Grid
 */
export function UnifiedCartesianGrid() {
  return (
    <CartesianGrid
      {...CHART_CONFIG.grid}
      vertical={false}
    />
  )
}

/**
 * Unified X Axis
 */
export function UnifiedXAxis(props: React.ComponentProps<typeof XAxis>) {
  return (
    <XAxis
      {...props}
      tick={CHART_CONFIG.axis.tick}
      axisLine={false}
      tickLine={false}
    />
  )
}

/**
 * Unified Y Axis
 */
export function UnifiedYAxis(props: React.ComponentProps<typeof YAxis>) {
  return (
    <YAxis
      {...props}
      tick={CHART_CONFIG.axis.tick}
      axisLine={false}
      tickLine={false}
    />
  )
}

/**
 * Custom Tooltip Component
 */
interface CustomTooltipProps extends TooltipProps<any, any> {
  formatter?: (value: any, name: string, props: any) => React.ReactNode
  labelFormatter?: (label: any) => React.ReactNode
}

export function UnifiedTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      className="rounded-lg border bg-card p-3 shadow-lg"
      style={CHART_CONFIG.tooltip.contentStyle}
    >
      {label && (
        <div className="font-semibold text-sm mb-2 text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const value = entry.value
          const name = entry.name
          const color = entry.color || getChartColor('neutral')
          
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{name}:</span>
              </div>
              <span className="font-medium text-foreground">
                {formatter ? formatter(value, name, entry) : value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * P&L-aware Tooltip (for financial charts)
 */
export function PnLTooltip({
  active,
  payload,
  label,
  labelFormatter,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div
      className="rounded-lg border bg-card p-3 shadow-lg"
      style={CHART_CONFIG.tooltip.contentStyle}
    >
      {label && (
        <div className="font-semibold text-sm mb-2 text-foreground">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const value = typeof entry.value === 'number' ? entry.value : 0
          const name = entry.name
          const color = getPnLChartColor(value)
          
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-muted-foreground">{name}:</span>
              </div>
              <span
                className={cn(
                  "font-medium font-mono",
                  value > 0 && "text-success",
                  value < 0 && "text-destructive",
                  value === 0 && "text-muted-foreground"
                )}
              >
                ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Unified Chart Container
 */
interface UnifiedChartContainerProps {
  children: React.ReactElement
  className?: string
  height?: number | string
}

export function UnifiedChartContainer({
  children,
  className,
  height = 300,
}: UnifiedChartContainerProps) {
  return (
    <ResponsiveContainer
      width="100%"
      height={height}
      className={cn("text-sm", className)}
    >
      {children}
    </ResponsiveContainer>
  )
}

/**
 * Get color based on data value (for P&L)
 */
export function getDataColor(value: number): string {
  return getPnLChartColor(value)
}

/**
 * Get color array for multiple data points
 */
export function getDataColors(data: any[], key: string): string[] {
  return data.map(d => getPnLChartColor(d[key]))
}

/**
 * Format currency for charts
 */
export function formatChartCurrency(value: number): string {
  const absValue = Math.abs(value)
  if (absValue >= 1000000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000000).toFixed(1)}M`
  }
  if (absValue >= 1000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}K`
  }
  return `${value < 0 ? '-' : ''}$${absValue.toFixed(0)}`
}

/**
 * Format number with K/M suffixes
 */
export function formatChartNumber(value: number): string {
  const absValue = Math.abs(value)
  if (absValue >= 1000000) {
    return `${value < 0 ? '-' : ''}${(absValue / 1000000).toFixed(1)}M`
  }
  if (absValue >= 1000) {
    return `${value < 0 ? '-' : ''}${(absValue / 1000).toFixed(1)}K`
  }
  return value.toString()
}

