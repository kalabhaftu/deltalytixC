"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig } from "@/components/ui/chart"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { WidgetSize } from '@/app/[locale]/dashboard/types/dashboard'
import { Info } from 'lucide-react'
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useI18n } from "@/locales/client"
import { Button } from "@/components/ui/button"
import { useTickDetailsStore } from "../../../../../store/tick-details-store"
import { useUserStore } from "../../../../../store/user-store"

interface TickDistributionProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  ticks: string;
  count: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
  }>;
  label?: string;
}

const chartConfig = {
  count: {
    label: "Count",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const CustomTooltip = ({ active, payload }: TooltipProps) => {
  const t = useI18n()
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tickDistribution.tooltip.ticks')}
            </span>
            <span className="font-bold text-muted-foreground">
              {data.displayTick} {Math.abs(data.tick) !== 1 ? t('tickDistribution.tooltip.ticks_plural') : t('tickDistribution.tooltip.tick')}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tickDistribution.tooltip.trades')}
            </span>
            <span className="font-bold">
              {data.count} {data.count !== 1 ? t('tickDistribution.tooltip.trades_plural') : t('tickDistribution.tooltip.trade')}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const formatCount = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toString()
}

export default function TickDistributionChart({ size = 'medium' }: TickDistributionProps) {
  const { formattedTrades: trades, tickFilter, setTickFilter } = useData()
  const tickDetails = useTickDetailsStore(state => state.tickDetails)
  const t = useI18n()

  const chartData = React.useMemo(() => {
    if (!trades.length) return []

    // Create a map to store tick counts
    const tickCounts: Record<number, number> = {}

    // Count trades for each tick value
    trades.forEach(trade => {
      // Skip trades with zero quantity to avoid division by zero
      if (Number(trade.quantity) === 0) {
        return
      }

      // Fix ticker matching logic - sort by length descending to match longer tickers first
      // This prevents "ES" from matching "MES" trades
      const matchingTicker = Object.keys(tickDetails)
        .sort((a, b) => b.length - a.length) // Sort by length descending
        .find(ticker => trade.instrument.includes(ticker))
      
      // Use tickValue (monetary value per tick) instead of tickSize (minimum price increment)
      const tickValue = matchingTicker ? tickDetails[matchingTicker].tickValue : 1
      
      // Skip if tickValue is zero to avoid division by zero
      if (tickValue === 0) {
        return
      }
      
      // Calculate PnL per contract first
      const pnlPerContract = Number(trade.pnl) / Number(trade.quantity)
      const ticks = Math.round(pnlPerContract / tickValue)
      
      // Skip if ticks is not finite (handles NaN, Infinity, -Infinity)
      if (!isFinite(ticks)) {
        return
      }
      
      tickCounts[ticks] = (tickCounts[ticks] || 0) + 1
    })

    // Only show tick values that actually have trades (non-zero counts)
    const chartData = Object.entries(tickCounts)
      .filter(([_, count]) => count > 0) // Only include ticks with actual trades
      .map(([tick, count]) => ({
        tick: Number(tick),
        count,
        displayTick: tick === '0' ? '0' : Number(tick) > 0 ? `+${tick}` : `${tick}`,
        // For waterfall-style: negative ticks go down (negative count), positive go up
        barHeight: Number(tick) < 0 ? -count : count
      }))
      .sort((a, b) => a.tick - b.tick) // Sort by tick value

    return chartData
  }, [trades, tickDetails])

  const handleBarClick = (data: any) => {
    if (!data || !trades.length) return
    const clickedTicks = data.displayTick
    if (tickFilter.value === clickedTicks) {
      setTickFilter({ value: null })
    } else {
      setTickFilter({ value: clickedTicks })
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader 
        className={cn(
          "flex flex-row items-center justify-between space-y-0 border-b shrink-0",
          size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'small-long' ? "text-sm" : "text-base"
              )}
            >
              {t('tickDistribution.title')}
            </CardTitle>
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className={cn(
                    "text-muted-foreground hover:text-foreground transition-colors cursor-help",
                    size === 'small-long' ? "h-3.5 w-3.5" : "h-4 w-4"
                  )} />
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('tickDistribution.description')}</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          {tickFilter.value && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={() => setTickFilter({ value: null })}
            >
              {t('tickDistribution.clearFilter')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "flex-1 min-h-0",
          size === 'small-long' ? "p-1" : "p-2 sm:p-4"
        )}
      >
        <div className={cn("w-full h-full")}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={
                  size === 'small-long'
                    ? { left: 0, right: 4, top: 4, bottom: 20 }
                    : { left: 0, right: 8, top: 8, bottom: 24 }
                }
                onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0].payload)}
              >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="displayTick"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                interval={0} // Show all tick labels
                allowDataOverflow={true}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={45}
                tickMargin={4}
                tickFormatter={(value) => Math.abs(value).toString()}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                domain={['dataMin', 'dataMax']}
                allowDecimals={false}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ 
                  fontSize: size === 'small-long' ? '10px' : '12px',
                  zIndex: 1000
                }} 
              />
              <Bar
                dataKey="barHeight"
                fill={chartConfig.count.color}
                radius={[3, 3, 0, 0]}
                maxBarSize={(() => {
                  const dataPoints = chartData.length
                  const baseWidth = size === 'small-long' ? 25 : 40
                  
                  // Calculate responsive bar width based on number of data points
                  if (dataPoints <= 10) {
                    return baseWidth // Full width for few data points
                  } else if (dataPoints <= 20) {
                    return Math.max(baseWidth * 0.8, 20) // Slightly smaller
                  } else if (dataPoints <= 30) {
                    return Math.max(baseWidth * 0.6, 15) // Medium width
                  } else {
                    return Math.max(baseWidth * 0.4, 10) // Narrow bars for many data points
                  }
                })()}
                className="transition-all duration-300 ease-in-out"
                opacity={tickFilter.value ? 0.3 : 1}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={`cell-${entry.tick}`}
                    opacity={tickFilter.value === entry.displayTick ? 1 : (tickFilter.value ? 0.3 : 1)}
                    fill={entry.count === 0 ? 'transparent' : (entry.tick < 0 ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-3))')}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No valid tick data to display</p>
                <p className="text-xs mt-1">Trades with zero quantity are excluded</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
