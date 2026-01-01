'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/context/data-provider'
import { Flame, Snowflake, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseISO } from 'date-fns'

interface StreakData {
  currentStreak: number
  isWinning: boolean
  longestWinStreak: number
  longestLoseStreak: number
}

function calculateStreaks(trades: any[]): StreakData {
  if (!trades || trades.length === 0) {
    return { currentStreak: 0, isWinning: true, longestWinStreak: 0, longestLoseStreak: 0 }
  }

  // Sort by date (most recent first for current streak)
  const sorted = [...trades].sort((a, b) => {
    const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0
    const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0
    return dateB - dateA
  })

  // Calculate current streak
  let currentStreak = 0
  let isWinning = true

  if (sorted.length > 0) {
    const firstResult = (sorted[0].pnl || 0) > 0
    isWinning = firstResult

    for (const trade of sorted) {
      const isWin = (trade.pnl || 0) > 0
      if (isWin === firstResult) {
        currentStreak++
      } else {
        break
      }
    }
  }

  // Calculate longest streaks (chronological order)
  const chronological = [...trades].sort((a, b) => {
    const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0
    const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0
    return dateA - dateB
  })

  let longestWinStreak = 0
  let longestLoseStreak = 0
  let tempStreak = 0
  let lastWasWin: boolean | null = null

  for (const trade of chronological) {
    const isWin = (trade.pnl || 0) > 0

    if (lastWasWin === null) {
      tempStreak = 1
      lastWasWin = isWin
    } else if (isWin === lastWasWin) {
      tempStreak++
    } else {
      if (lastWasWin) {
        longestWinStreak = Math.max(longestWinStreak, tempStreak)
      } else {
        longestLoseStreak = Math.max(longestLoseStreak, tempStreak)
      }
      tempStreak = 1
      lastWasWin = isWin
    }
  }

  // Final check
  if (lastWasWin) {
    longestWinStreak = Math.max(longestWinStreak, tempStreak)
  } else if (lastWasWin === false) {
    longestLoseStreak = Math.max(longestLoseStreak, tempStreak)
  }

  return { currentStreak, isWinning, longestWinStreak, longestLoseStreak }
}

interface CurrentStreakProps {
  size?: string
}

export default function CurrentStreak({ size }: CurrentStreakProps) {
  const { formattedTrades } = useData()

  const streakData = useMemo(() => {
    return calculateStreaks(formattedTrades || [])
  }, [formattedTrades])

  const { currentStreak, isWinning, longestWinStreak, longestLoseStreak } = streakData

  return (
    <Card className="h-24">
      <CardContent className="px-6 py-4 h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wide font-bold text-muted-foreground/80">
                Current Streak
              </span>
            </div>
            <div className={cn(
              "text-2xl font-bold tracking-tight",
              isWinning ? "text-long" : "text-short"
            )}>
              {currentStreak}
            </div>
          </div>
          {isWinning ? (
            <Flame className="h-6 w-6 text-orange-500 opacity-80" />
          ) : (
            <Snowflake className="h-6 w-6 text-blue-500 opacity-80" />
          )}
        </div>

        <div className="flex items-center gap-4 text-[10px] font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-long" />
            <span>Best: {longestWinStreak}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 text-short" />
            <span>Worst: {longestLoseStreak}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
