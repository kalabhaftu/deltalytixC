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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
        {isWinning ? (
          <Flame className="h-4 w-4 text-orange-500" />
        ) : (
          <Snowflake className="h-4 w-4 text-blue-500" />
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className={cn(
            "text-2xl font-bold",
            isWinning ? "text-green-500" : "text-red-500"
          )}>
            {currentStreak}
          </div>
          <span className="text-sm text-muted-foreground">
            {isWinning ? 'wins' : 'losses'} in a row
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">Best:</span>
            <span className="font-medium">{longestWinStreak}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <span className="text-muted-foreground">Worst:</span>
            <span className="font-medium">{longestLoseStreak}</span>
          </div>
        </div>

        {currentStreak >= 3 && isWinning && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <Flame className="h-3 w-3 text-orange-500" />
            You're on fire! Keep it up!
          </p>
        )}
        {currentStreak >= 3 && !isWinning && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            Hang in there, the market gives back!
          </p>
        )}
      </CardContent>
    </Card>
  )
}
