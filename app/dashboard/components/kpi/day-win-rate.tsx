'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CircularProgress } from '@/components/ui/circular-progress'
import { useData } from '@/context/data-provider'
import { BREAK_EVEN_THRESHOLD } from '@/lib/utils'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface DayWinRateProps {
  size?: string
}

const DayWinRate = React.memo(function DayWinRate({ size }: DayWinRateProps) {
  const { calendarData } = useData()

  // Memoize expensive calculation
  const { dayWinRate, winningDays, totalDays } = React.useMemo(() => {
    const dayEntries = Object.entries(calendarData)
    const total = dayEntries.length
    const winning = dayEntries.filter(([_, data]) => data.pnl > BREAK_EVEN_THRESHOLD).length
    const rate = total > 0 ? Math.round((winning / total) * 1000) / 10 : 0

    return {
      dayWinRate: rate,
      winningDays: winning,
      totalDays: total
    }
  }, [calendarData])

  // Determine color based on day win rate - use CSS variables for consistency
  const getColor = (rate: number) => {
    if (rate >= 50) return 'hsl(var(--chart-profit))' // Profit green
    return 'hsl(var(--chart-loss))' // Loss red
  }

  return (
    <Card className="w-full h-24">
      <CardContent className="px-6 py-4 h-full flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground/80">
              Day Win %
            </span>
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center cursor-help">
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={5} className="max-w-[200px]">
                  <p className="text-xs">Percentage of profitable trading days out of total trading days. Shows consistency in daily performance.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-2xl font-bold text-foreground tracking-tight">
            {dayWinRate.toFixed(1)}%
          </span>
        </div>

        <div className="flex-shrink-0">
          <CircularProgress
            value={dayWinRate}
            size={48}
            strokeWidth={5}
            color={getColor(dayWinRate)}
            showPercentage={false}
          />
        </div>
      </CardContent>
    </Card>
  )
})

export default DayWinRate
