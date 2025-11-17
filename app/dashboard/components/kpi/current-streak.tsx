'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useTradeStatistics } from '@/hooks/use-trade-statistics'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CurrentStreakProps {
  size?: string
}

const CurrentStreak = React.memo(function CurrentStreak({ size }: CurrentStreakProps) {
  const { 
    currentDayStreak, 
    bestDayStreak, 
    worstDayStreak,
    currentTradeStreak,
    bestTradeStreak,
    worstTradeStreak
  } = useTradeStatistics()
  
  // Determine circle colors based on current streak - use CSS variables for consistency
  const getDayColor = () => currentDayStreak >= 0 ? 'hsl(var(--chart-profit))' : 'hsl(var(--chart-loss))'
  const getTradeColor = () => currentTradeStreak >= 0 ? 'hsl(var(--chart-profit))' : 'hsl(var(--chart-loss))'

  return (
    <Card className="w-full h-24">
      <CardContent className="p-1 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-muted-foreground font-medium">
            Current Streak
          </span>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center cursor-help">
                  <HelpCircle className="h-2 w-2 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={5} className="max-w-[220px]">
                <p className="text-xs">Combined view of winning trade and day streaks. Shows current streak (number in circle) and best/worst streaks for both days and trades.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center justify-between flex-1">
          {/* DAYS Section */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[10px] font-bold text-foreground tracking-wider">DAYS</span>
            <div className="flex items-center gap-2">
              {/* Days Circle */}
              <div 
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ 
                  border: `3px solid ${getDayColor()}`,
                  color: getDayColor()
                }}
              >
                {Math.abs(currentDayStreak)}
              </div>
              {/* Days Streaks */}
              <div className="flex flex-col justify-center">
                <div className="text-[11px] text-red-500 font-medium whitespace-nowrap bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">
                  {Math.abs(worstDayStreak)} days
                </div>
                <div className="text-[11px] text-green-500 font-medium whitespace-nowrap bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded mt-0.5">
                  {bestDayStreak} days
                </div>
              </div>
            </div>
          </div>

          {/* TRADES Section */}
          <div className="flex flex-col items-center gap-1.5 flex-1">
            <span className="text-[10px] font-bold text-foreground tracking-wider">TRADES</span>
            <div className="flex items-center gap-2">
              {/* Trades Circle */}
              <div 
                className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ 
                  border: `3px solid ${getTradeColor()}`,
                  color: getTradeColor()
                }}
              >
                {Math.abs(currentTradeStreak)}
              </div>
              {/* Trades Streaks */}
              <div className="flex flex-col justify-center">
                <div className="text-[11px] text-red-500 font-medium whitespace-nowrap bg-red-50 dark:bg-red-950/20 px-1.5 py-0.5 rounded">
                  {Math.abs(worstTradeStreak)} trades
                </div>
                <div className="text-[11px] text-green-500 font-medium whitespace-nowrap bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 rounded mt-0.5">
                  {bestTradeStreak} trades
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default CurrentStreak
