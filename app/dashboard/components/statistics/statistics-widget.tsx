"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { Clock, PiggyBank, Award, BarChart, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useTradeStatistics } from "@/hooks/use-trade-statistics"
import { Progress } from "@/components/ui/progress"

interface StatisticsWidgetProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'small-long' | 'extra-large' | 'kpi'
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function StatisticsWidget({ size = 'medium' }: StatisticsWidgetProps) {
  const { calendarData } = useData()
  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null)
  const [isTouch, setIsTouch] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const lastTouchTime = React.useRef(0)
  const locale = 'en' // Default to English since i18n was removed

  // Number formatter for currency with thousands separators based on locale
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
  }

  // Use centralized statistics hook for all calculations
  const {
    nbWin, nbLoss, nbBe, nbTrades,
    averagePositionTime,
    cumulativePnl, cumulativeFees,
    winningStreak,
    grossLosses,
    grossWin,
    biggestWin,
    biggestLoss,
    totalPayouts,
    nbPayouts,
    netPnlWithPayouts,
    winRate,
    lossRate,
    beRate,
    avgWin,
    avgLoss,
    riskRewardRatio
  } = useTradeStatistics()

  // Calculate long/short data
  const chartData = Object.entries(calendarData).map(([date, values]) => ({
    date,
    pnl: values.pnl,
    shortNumber: values.shortNumber,
    longNumber: values.longNumber,
  }))

  const longNumber = chartData.reduce((acc, curr) => acc + curr.longNumber, 0)
  const shortNumber = chartData.reduce((acc, curr) => acc + curr.shortNumber, 0)
  const totalTrades = longNumber + shortNumber
  const longRate = totalTrades > 0 ? Math.round((longNumber / totalTrades) * 1000) / 10 : 0 // Round to 1 decimal place
  const shortRate = totalTrades > 0 ? Math.round((shortNumber / totalTrades) * 1000) / 10 : 0 // Round to 1 decimal place

  // Colors
  const positiveColor = "hsl(var(--chart-2))"
  const negativeColor = "hsl(var(--chart-1))"
  const neutralColor = "hsl(var(--muted))"

  // Performance data
  const performanceData = [
    { name: 'Win', value: winRate, color: positiveColor },
    { name: 'BE', value: beRate, color: neutralColor },
    { name: 'Loss', value: lossRate, color: negativeColor },
  ]

  // Long/Short data
  const sideData = [
    { name: 'Long', value: longRate, color: positiveColor, number: longNumber },
    { name: 'Short', value: shortRate, color: negativeColor, number: shortNumber },
  ]

  // Touch event handlers
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setActiveTooltip(null)
      }
    }

    const handleTouchStart = () => {
      setIsTouch(true)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    window.addEventListener('touchstart', handleTouchStart, { once: true })

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      window.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  // Let widget canvas handle loading states to avoid hooks violations

  return (
    <Card className="h-full flex flex-col" ref={cardRef}>
      <CardHeader 
        className={cn(
          "flex-none border-b",
          size === 'tiny' 
            ? "p-3"
            : (size === 'small' || size === 'small-long')
              ? "p-3" 
              : "p-4"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle 
              className={cn(
                "line-clamp-1",
                size === 'tiny'
                  ? "text-xs"
                  : (size === 'small' || size === 'small-long') 
                    ? "text-sm" 
                    : "text-base"
              )}
            >
                Statistics Overview
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Statistical analysis of your trading performance</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <BarChart className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <div className="grid h-full grid-cols-2 overflow-hidden">
          {/* Key Metrics Section */}
          <div className={cn(
            "flex flex-col border-r border-b overflow-hidden",
            size === 'tiny' ? "p-3" : "p-3"
          )}>
            <h3 className="text-xs font-medium mb-1">Key Metrics</h3>
            <div className="flex-1 flex flex-col justify-center gap-0.5 min-h-0 overflow-auto">
              {/* Net P&L */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Net P&L</span>
                <span className={cn(
                  "text-xs font-bold font-mono",
                  cumulativePnl > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
                )}>
                  {formatCurrency(cumulativePnl)}
                </span>
              </div>
              
              {/* Best Trade */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Best Trade</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 font-mono">{formatCurrency(biggestWin)}</span>
              </div>
              
              {/* Worst Trade */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Worst Trade</span>
                <span className="text-xs font-medium text-destructive font-mono">{formatCurrency(Math.abs(biggestLoss))}</span>
              </div>
              
              {/* Total Fee */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Total Fee</span>
                <span className="text-xs font-medium text-destructive font-mono">{formatCurrency(cumulativeFees)}</span>
              </div>
              
              {/* Payouts - Only show if there are payouts and size is not tiny */}
              {totalPayouts > 0 && size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Total Payouts</span>
                  <span className="text-xs font-medium text-destructive font-mono">{formatCurrency(totalPayouts)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Performance Section */}
          <div className={cn(
            "flex flex-col border-b overflow-hidden",
            size === 'tiny' ? "p-3" : "p-3"
          )}>
            <h3 className="text-xs font-medium mb-1">Performance</h3>
            <div className="flex-1 flex flex-col justify-center gap-0.5 min-h-0 overflow-auto">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Win Rate</span>
                <span className="text-xs font-medium">{winRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Avg Win</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 font-mono">{formatCurrency(avgWin)}</span>
              </div>
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Avg Loss</span>
                  <span className="text-xs font-medium text-destructive font-mono">{formatCurrency(avgLoss)}</span>
                </div>
              )}
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Risk/Reward</span>
                  <span className="text-xs font-medium font-mono">
                    {riskRewardRatio || 'N/A'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Section */}
          <div className={cn(
            "flex flex-col border-r overflow-hidden",
            size === 'tiny' ? "p-3" : "p-3"
          )}>
            <h3 className="text-xs font-medium mb-1">Activity</h3>
            <div className="flex-1 flex flex-col justify-center gap-0.5 min-h-0 overflow-auto">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Total Trades</span>
                <span className="text-xs font-medium">{nbTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Winning Trades</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">{nbWin}</span>
              </div>
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Avg Position Time</span>
                  <span className="text-xs font-medium">{averagePositionTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Distribution Section */}
          <div className={cn(
            "flex flex-col overflow-hidden",
            size === 'tiny' ? "p-3" : "p-3"
          )}>
            <h3 className="text-xs font-medium mb-1">Distribution</h3>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Long Positions</span>
                  <span className="text-sm font-medium">{longRate}%</span>
                </div>
                <Progress value={longRate} className="h-1" />
              </div>
              {size !== 'tiny' ? (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">Short Positions</span>
                      <span className="text-sm font-medium">{shortRate}%</span>
                    </div>
                    <Progress value={shortRate} className="h-1" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">Best Streak</span>
                    <span className="text-sm font-medium">{winningStreak}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">Best Streak</span>
                  <span className="text-sm font-medium">{winningStreak}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 