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
import { 
  classifyAsset, 
  getDisplayUnit, 
  CountingUnit 
} from "@/lib/asset-classification"

interface TickDistributionProps {
  size?: WidgetSize
}

interface ChartDataPoint {
  asset: string;
  winValue: number;
  lossValue: number;
  winDisplay: string;
  lossDisplay: string;
  unit: CountingUnit;
  winCount: number;
  lossCount: number;
  winBarHeight: number;
  lossBarHeight: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
    dataKey?: string;
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
    const item = payload[0];
    const data = item.payload;
    const unitLabel = data.unit === 'pip' ? 'pips' : 'handles';
    
    // Determine which bar is being hovered based on dataKey
    const isWinBar = item.dataKey === 'winBarHeight';
    const isLossBar = item.dataKey === 'lossBarHeight';
    
    if (isWinBar) {
    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
                {data.asset}
              </span>
              <span className="font-bold text-green-600">
                Average Win
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Value
            </span>
              <span className="font-bold text-green-600">
                {data.winDisplay} {unitLabel}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('tickDistribution.tooltip.trades')}
            </span>
            <span className="font-bold">
                {data.winCount} {data.winCount !== 1 ? t('tickDistribution.tooltip.trades_plural') : t('tickDistribution.tooltip.trade')}
            </span>
          </div>
        </div>
      </div>
    );
    }
    
    if (isLossBar) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid gap-2">
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {data.asset}
              </span>
              <span className="font-bold text-red-600">
                Average Loss
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                Value
              </span>
              <span className="font-bold text-red-600">
                {data.lossDisplay} {unitLabel}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[0.70rem] uppercase text-muted-foreground">
                {t('tickDistribution.tooltip.trades')}
              </span>
              <span className="font-bold">
                {data.lossCount} {data.lossCount !== 1 ? t('tickDistribution.tooltip.trades_plural') : t('tickDistribution.tooltip.trade')}
              </span>
            </div>
          </div>
        </div>
      );
    }
  }
  return null;
};


export default function TickDistributionChart({ size = 'medium' }: TickDistributionProps) {
  const { formattedTrades: trades, tickFilter, setTickFilter } = useData()
  const t = useI18n()

  const chartData = React.useMemo(() => {
    if (!trades.length) return []

    // Group trades by asset
    const assetGroups: Record<string, { 
      trades: any[], 
      classification: any, 
      displayUnit: CountingUnit 
    }> = {}

    trades.forEach(trade => {
      // Skip trades with zero quantity
      if (Number(trade.quantity) === 0) return

      const classification = classifyAsset(trade.instrument)
      const displayUnit = getDisplayUnit(classification)
      const asset = trade.instrument
      
      if (!assetGroups[asset]) {
        assetGroups[asset] = {
          trades: [],
          classification,
          displayUnit
        }
      }
      assetGroups[asset].trades.push(trade)
    })

    // Calculate averages for each asset and create grouped data
    const chartData: ChartDataPoint[] = []

    Object.entries(assetGroups).forEach(([asset, { trades: assetTrades, classification, displayUnit }]) => {
      const winTrades: number[] = []
      const lossTrades: number[] = []

      assetTrades.forEach(trade => {
        const entryPrice = Number(trade.entryPrice)
        const closePrice = Number(trade.closePrice)
        
        // Skip trades with invalid prices
        if (!entryPrice || !closePrice || entryPrice <= 0 || closePrice <= 0) {
          return
        }
        
        const priceDifference = closePrice - entryPrice
        const isWin = priceDifference > 0
        
        // Calculate the actual price movement distance
        const movementDistance = Math.abs(priceDifference)
        
        // Add extra validation for forex pairs
        if (classification.type === 'forex') {
          // For forex, price difference should be small (usually less than 0.1)
          if (movementDistance > 0.1) {
            console.log(`Skipping forex trade with large movement: ${trade.instrument}, Entry: ${entryPrice}, Close: ${closePrice}, Diff: ${movementDistance}`)
            return
          }
        }
        
        // Add validation for indices
        if (classification.type === 'index') {
          // For indices, price difference should be reasonable (less than 1000 points)
          if (movementDistance > 1000) {
            console.log(`Skipping index trade with large movement: ${trade.instrument}, Entry: ${entryPrice}, Close: ${closePrice}, Diff: ${movementDistance}`)
            return
          }
        }
        
        const movementCount = Math.round(movementDistance / classification.smallestMove)
        
        // Very strict filtering - max 200 pips/handles
        if (movementCount > 0 && movementCount <= 200 && isFinite(movementCount)) {
          if (isWin) {
            winTrades.push(movementCount)
          } else {
            lossTrades.push(movementCount)
          }
        }
      })

      // Calculate averages
      const avgWin = winTrades.length > 0 ? winTrades.reduce((sum, val) => sum + val, 0) / winTrades.length : 0
      const avgLoss = lossTrades.length > 0 ? lossTrades.reduce((sum, val) => sum + val, 0) / lossTrades.length : 0

      // Debug logging for problematic values
      if (avgWin > 1000 || avgLoss > 1000) {
        console.log(`Asset: ${asset}, Win Trades: ${winTrades}, Loss Trades: ${lossTrades}`)
        console.log(`Avg Win: ${avgWin}, Avg Loss: ${avgLoss}`)
      }

      // Cap unrealistic values - much stricter now
      const cappedWin = Math.min(avgWin, 200)
      const cappedLoss = Math.min(avgLoss, 200)

      // Create single data point per asset with both win and loss values
      chartData.push({
        asset,
        winValue: cappedWin,
        lossValue: cappedLoss,
        winDisplay: cappedWin > 0 ? `+${Math.round(cappedWin)}` : '0',
        lossDisplay: cappedLoss > 0 ? `-${Math.round(cappedLoss)}` : '0',
        unit: displayUnit,
        winCount: winTrades.length,
        lossCount: lossTrades.length,
        winBarHeight: cappedWin,
        lossBarHeight: -cappedLoss // Negative for loss bars
      })
    })

    return chartData
  }, [trades])

  const handleBarClick = (data: any) => {
    if (!data || !trades.length) return
    const clickedAsset = data.asset
    if (tickFilter.value === clickedAsset) {
      setTickFilter({ value: null })
    } else {
      setTickFilter({ value: clickedAsset })
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
                    ? { left: 0, right: 2, top: 4, bottom: 20 }
                    : { left: 0, right: 4, top: 8, bottom: 24 }
                }
                barCategoryGap={2}
                onClick={(e) => e?.activePayload && handleBarClick(e.activePayload[0].payload)}
              >
              <CartesianGrid 
                strokeDasharray="3 3" 
                className="text-border dark:opacity-[0.12] opacity-[0.2]"
              />
              <XAxis
                dataKey="asset"
                tickLine={false}
                axisLine={false}
                height={size === 'small-long' ? 20 : 24}
                tickMargin={size === 'small-long' ? 4 : 8}
                tick={{ 
                  fontSize: size === 'small-long' ? 9 : 11,
                  fill: 'currentColor'
                }}
                interval={0} // Show all asset labels
                allowDataOverflow={true}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={45}
                tickMargin={4}
                tickFormatter={(value) => {
                  const absValue = Math.abs(value)
                  const roundedValue = Math.round(absValue)
                  if (roundedValue >= 1000000) {
                    return `${Math.round(roundedValue / 1000000)}M`
                  } else if (roundedValue >= 1000) {
                    return `${Math.round(roundedValue / 1000)}k`
                  }
                  return roundedValue.toString()
                }}
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
                dataKey="winBarHeight"
                name="Win"
                fill="hsl(var(--chart-3))"
                radius={[2, 2, 0, 0]}
                maxBarSize={size === 'small-long' ? 15 : 20}
              />
              <Bar
                dataKey="lossBarHeight"
                name="Loss"
                fill="hsl(var(--chart-4))"
                radius={[2, 2, 0, 0]}
                maxBarSize={size === 'small-long' ? 15 : 20}
              />
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No valid data to display</p>
                <p className="text-xs mt-1">Trades with zero quantity or missing TP/SL are excluded</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
