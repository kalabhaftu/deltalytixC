/**
 * Standard Card Component
 * 
 * Professionally styled card with consistent dimensions and styling
 * matching TradeZella's design system.
 */

'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info, TrendingUp, TrendingDown } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { WidgetSize } from '@/app/dashboard/types/dashboard'
import { CARD_HEADER_HEIGHT } from '@/app/dashboard/config/widget-dimensions'

interface StandardCardProps {
  title: string
  children: React.ReactNode
  tooltip?: string
  size?: WidgetSize
  className?: string
  headerAction?: React.ReactNode
  trend?: 'up' | 'down' | null
  trendValue?: string
}

/**
 * Standard Card with consistent header height and styling
 */
export function StandardCard({
  title,
  children,
  tooltip,
  size = 'medium',
  className,
  headerAction,
  trend,
  trendValue,
}: StandardCardProps) {
  const isKPI = size === 'kpi'
  
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader
        className={cn(
          "flex flex-row items-center justify-between shrink-0 border-b",
          isKPI ? "p-3 h-auto" : "p-4",
          !isKPI && `h-[${CARD_HEADER_HEIGHT}]`
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CardTitle
            className={cn(
              "line-clamp-1",
              isKPI ? "text-sm font-medium" : "text-base font-semibold"
            )}
          >
            {title}
          </CardTitle>
          
          {tooltip && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    className={cn(
                      "text-muted-foreground hover:text-foreground transition-colors cursor-help shrink-0",
                      isKPI ? "h-3.5 w-3.5" : "h-4 w-4"
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {trend && trendValue && (
            <div className={cn(
              "flex items-center gap-1 ml-2 shrink-0",
              trend === 'up' ? "text-success" : "text-destructive"
            )}>
              {trend === 'up' ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-medium">{trendValue}</span>
            </div>
          )}
        </div>
        
        {headerAction && (
          <div className="ml-2 shrink-0">
            {headerAction}
          </div>
        )}
      </CardHeader>
      
      <CardContent className={cn(
        "flex-1 overflow-hidden",
        isKPI ? "p-3" : "p-4"
      )}>
        {children}
      </CardContent>
    </Card>
  )
}

/**
 * KPI Card - Specialized card for metrics
 */
interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  tooltip?: string
  trend?: 'up' | 'down' | null
  trendValue?: string
  icon?: React.ReactNode
  className?: string
}

export function KPICard({
  title,
  value,
  subtitle,
  tooltip,
  trend,
  trendValue,
  icon,
  className,
}: KPICardProps) {
  return (
    <Card className={cn("h-[120px] flex flex-col", className)}>
      <div className="p-4 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <h3 className="text-sm font-medium text-muted-foreground line-clamp-1">
              {title}
            </h3>
            {tooltip && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>{tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {icon && (
            <div className="text-muted-foreground shrink-0">
              {icon}
            </div>
          )}
        </div>
        
        {/* Value */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="text-2xl font-bold line-clamp-1">
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground mt-1">
              {subtitle}
            </div>
          )}
        </div>
        
        {/* Trend */}
        {trend && trendValue && (
          <div className={cn(
            "flex items-center gap-1 mt-2",
            trend === 'up' ? "text-success" : "text-destructive"
          )}>
            {trend === 'up' ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span className="text-xs font-medium">{trendValue}</span>
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Loading Card - Skeleton state
 */
interface LoadingCardProps {
  size?: WidgetSize
  className?: string
}

export function LoadingCard({ size = 'medium', className }: LoadingCardProps) {
  const isKPI = size === 'kpi'
  
  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <CardHeader className={cn(
        "shrink-0 border-b",
        isKPI ? "p-3" : `p-4 h-[${CARD_HEADER_HEIGHT}]`
      )}>
        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
      </CardHeader>
      
      <CardContent className={cn(
        "flex-1",
        isKPI ? "p-3" : "p-4"
      )}>
        <div className="space-y-3">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-1/2 bg-muted animate-pulse rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

