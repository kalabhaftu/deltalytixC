"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useData } from "@/context/data-provider"
import { Clock, PiggyBank, Award, BarChart, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { Progress } from "@/components/ui/progress"

interface StatisticsWidgetProps {
  size?: 'tiny' | 'small' | 'medium' | 'large' | 'small-long' | 'extra-large'
}

function debounce<T extends (...args: any[]) => void>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export default function StatisticsWidget({ size = 'medium' }: StatisticsWidgetProps) {
  const { statistics, calendarData } = useData()
  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null)
  const [isTouch, setIsTouch] = React.useState(false)
  const cardRef = React.useRef<HTMLDivElement>(null)
  const lastTouchTime = React.useRef(0)
  const t = useI18n()
  const locale = useCurrentLocale()

  // Number formatter for currency with thousands separators based on locale
  const formatCurrency = (value: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
    
    return `$${formatted}`
  }

  // Calculate statistics
  const { 
    nbWin, nbLoss, nbBe, nbTrades, 
    averagePositionTime, 
    cumulativePnl, cumulativeFees,
    winningStreak,
    grossLosses,
    grossWin
  } = statistics

  const biggestWin = (statistics as any).biggestWin ?? 0
  const biggestLoss = (statistics as any).biggestLoss ?? 0
  const totalPayouts = (statistics as any).totalPayouts ?? 0
  const nbPayouts = (statistics as any).nbPayouts ?? 0

  // Calculate Net P&L including payouts
  const netPnlWithPayouts = cumulativePnl - cumulativeFees - totalPayouts

  // Calculate rates (exclude break-even trades from win rate - industry standard)
  const tradableTradesCount = nbWin + nbLoss // Exclude break-even trades
  const winRate = tradableTradesCount > 0 ? Number((nbWin / tradableTradesCount * 100).toFixed(2)) : 0
  const lossRate = Number((nbLoss / nbTrades * 100).toFixed(2))
  const beRate = Number((nbBe / nbTrades * 100).toFixed(2))

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
  const longRate = Number((longNumber / totalTrades * 100).toFixed(2))
  const shortRate = Number((shortNumber / totalTrades * 100).toFixed(2))

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

  return (
    <Card className="h-full flex flex-col" ref={cardRef}>
      <CardHeader 
        className={cn(
          "flex-none border-b",
          size === 'tiny' 
            ? "py-1 px-2"
            : (size === 'small' || size === 'small-long')
              ? "py-2 px-3" 
              : "py-3 px-4"
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
              {t('statistics.title')}
            </CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('statistics.tooltip')}</p>
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
            size === 'tiny' ? "p-1.5" : "p-2"
          )}>
            <h3 className="text-xs font-medium mb-1">Key Metrics</h3>
            <div className="flex-1 flex flex-col justify-center gap-0.5 min-h-0 overflow-auto">
              {/* Net P&L */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.profitLoss.net')}</span>
                <span className={cn(
                  "text-xs font-bold font-mono",
                  cumulativePnl > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {formatCurrency(cumulativePnl)}
                </span>
              </div>
              
              {/* Best Trade */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.performance.bestTrade')}</span>
                <span className="text-xs font-medium text-green-500 font-mono">{formatCurrency(biggestWin)}</span>
              </div>
              
              {/* Worst Trade */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.performance.worstTrade')}</span>
                <span className="text-xs font-medium text-red-500 font-mono">{formatCurrency(Math.abs(biggestLoss))}</span>
              </div>
              
              {/* Total Fee */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">Total Fee</span>
                <span className="text-xs font-medium text-red-500 font-mono">{formatCurrency(cumulativeFees)}</span>
              </div>
              
              {/* Payouts - Only show if there are payouts and size is not tiny */}
              {totalPayouts > 0 && size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">- {t('statistics.profitLoss.payouts')}</span>
                  <span className="text-xs font-medium text-red-500 font-mono">{formatCurrency(totalPayouts)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Performance Section */}
          <div className={cn(
            "flex flex-col border-b overflow-hidden",
            size === 'tiny' ? "p-1.5" : "p-2"
          )}>
            <h3 className="text-xs font-medium mb-1">{t('statistics.performance.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-0.5 min-h-0 overflow-auto">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.performance.winRate')}</span>
                <span className="text-xs font-medium">{winRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.performance.avgWin')}</span>
                <span className="text-xs font-medium text-green-500 font-mono">{formatCurrency(nbWin > 0 ? grossWin / nbWin : 0)}</span>
              </div>
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.performance.avgLoss')}</span>
                  <span className="text-xs font-medium text-red-500 font-mono">{formatCurrency(nbLoss > 0 ? grossLosses / nbLoss : 0)}</span>
                </div>
              )}
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.performance.profitFactor')}</span>
                  <span className="text-xs font-medium font-mono">
                    {grossLosses > 0 ? 
                      (grossWin / grossLosses).toFixed(2) : 
                      (grossWin > 0 ? '∞' : 'N/A')
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Activity Section */}
          <div className={cn(
            "flex flex-col border-r overflow-hidden",
            size === 'tiny' ? "p-1.5" : "p-2"
          )}>
            <h3 className="text-xs font-medium mb-1">{t('statistics.activity.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-0.5 min-h-0 overflow-auto">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.activity.totalTrades')}</span>
                <span className="text-xs font-medium">{nbTrades}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground text-xs">{t('statistics.activity.winningTrades')}</span>
                <span className="text-xs font-medium text-green-500">{nbWin}</span>
              </div>
              {size !== 'tiny' && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.activity.avgDuration')}</span>
                  <span className="text-xs font-medium">{averagePositionTime}</span>
                </div>
              )}
            </div>
          </div>

          {/* Distribution Section */}
          <div className={cn(
            "flex flex-col overflow-hidden",
            size === 'tiny' ? "p-1.5" : "p-2"
          )}>
            <h3 className="text-xs font-medium mb-1">{t('statistics.distribution.title')}</h3>
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.distribution.long')}</span>
                  <span className="text-sm font-medium">{longRate}%</span>
                </div>
                <Progress value={longRate} className="h-1" />
              </div>
              {size !== 'tiny' ? (
                <>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">{t('statistics.distribution.short')}</span>
                      <span className="text-sm font-medium">{shortRate}%</span>
                    </div>
                    <Progress value={shortRate} className="h-1" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs">{t('statistics.distribution.winningStreak')}</span>
                    <span className="text-sm font-medium">{winningStreak}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-xs">{t('statistics.distribution.winningStreak')}</span>
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