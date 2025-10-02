'use client'

import React, { useState, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, eachWeekOfInterval } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { CalendarData } from '@/types/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface AdvancedCalendarProps {
  calendarData: CalendarData
}

type MetricType = 'pnl' | 'r-multiple' | 'ticks' | 'shares'

const METRIC_OPTIONS = [
  { value: 'pnl' as MetricType, label: 'P&L ($)' },
  { value: 'r-multiple' as MetricType, label: 'R-Multiple' },
  { value: 'ticks' as MetricType, label: 'Ticks' },
  { value: 'shares' as MetricType, label: 'Shares' },
]

export default function AdvancedCalendar({ calendarData }: AdvancedCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('pnl')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const weeks = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 0 })

  // Calculate monthly totals
  const monthlyStats = useMemo(() => {
    let totalPnl = 0
    let tradingDays = 0

    Object.entries(calendarData).forEach(([date, data]) => {
      const dayDate = new Date(date)
      if (isSameMonth(dayDate, currentDate)) {
        if (data.pnl !== 0) {
          totalPnl += data.pnl
          tradingDays++
        }
      }
    })

    return { totalPnl, tradingDays }
  }, [calendarData, currentDate])

  // Calculate weekly stats
  const weeklyStats = useMemo(() => {
    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
      
      let weekPnl = 0
      let tradedDays = 0

      weekDays.forEach(day => {
        if (isSameMonth(day, currentDate)) {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayData = calendarData[dateKey]
          if (dayData && dayData.pnl !== 0) {
            weekPnl += dayData.pnl
            tradedDays++
          }
        }
      })

      return {
        weekStart,
        weekPnl,
        tradedDays
      }
    })
  }, [weeks, calendarData, currentDate])

  const getDayMetricValue = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayData = calendarData[dateKey]

    if (!dayData) return null

    switch (selectedMetric) {
      case 'pnl':
        return formatCurrency(dayData.pnl)
      case 'r-multiple':
        // Placeholder - implement R-Multiple calculation
        return dayData.pnl > 0 ? `+${(dayData.pnl / 100).toFixed(1)}R` : `${(dayData.pnl / 100).toFixed(1)}R`
      case 'ticks':
        // Placeholder - implement ticks calculation
        return `${Math.abs(Math.round(dayData.pnl / 12.5))} ticks`
      case 'shares':
        return `${dayData.longNumber + dayData.shortNumber} trades`
      default:
        return formatCurrency(dayData.pnl)
    }
  }

  const hasJournalEntry = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const dayData = calendarData[dateKey]
    return dayData && dayData.note && dayData.note.trim().length > 0
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  return (
    <Card className="w-full">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Advanced Calendar</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track your trading performance with detailed insights
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRIC_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Monthly Total */}
        <div className="flex items-center gap-6 mt-4 p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total P&L:</span>
            <span className={cn(
              "text-2xl font-bold",
              monthlyStats.totalPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {formatCurrency(monthlyStats.totalPnl)}
            </span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Trading Days:</span>
            <span className="text-2xl font-bold">{monthlyStats.tradingDays}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-8 gap-2 mb-2">
          <div className="text-xs font-medium text-muted-foreground text-center">Week</div>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-xs font-medium text-muted-foreground text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid with Weekly Summaries */}
        <div className="space-y-2">
          {weeks.map((weekStart, weekIndex) => {
            const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 })
            const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })
            const weekStat = weeklyStats[weekIndex]

            return (
              <div key={weekStart.toISOString()} className="grid grid-cols-8 gap-2">
                {/* Weekly Summary Cell */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "flex flex-col items-center justify-center p-2 rounded-lg border cursor-help transition-all hover:shadow-md",
                        weekStat.weekPnl >= 0 ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
                      )}>
                        <div className={cn(
                          "text-xs font-bold",
                          weekStat.weekPnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {weekStat.weekPnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        </div>
                        <div className="text-[10px] font-medium">W{weekIndex + 1}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1">
                        <p className="font-semibold">Week {weekIndex + 1}</p>
                        <p className={cn(
                          "font-bold",
                          weekStat.weekPnl >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          Net P&L: {formatCurrency(weekStat.weekPnl)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Traded Days: {weekStat.tradedDays}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Day Cells */}
                {weekDays.map(day => {
                  const dateKey = format(day, 'yyyy-MM-dd')
                  const dayData = calendarData[dateKey]
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isToday = isSameDay(day, new Date())
                  const hasData = dayData && dayData.pnl !== 0
                  const hasJournal = hasJournalEntry(day)

                  return (
                    <TooltipProvider key={dateKey}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "relative aspect-square p-2 rounded-lg border transition-all cursor-pointer hover:shadow-lg hover:scale-105",
                              !isCurrentMonth && "opacity-40",
                              isToday && "ring-2 ring-primary",
                              hasData && dayData.pnl >= 0 && "bg-green-500/10 border-green-500/20",
                              hasData && dayData.pnl < 0 && "bg-red-500/10 border-red-500/20",
                              !hasData && "bg-muted/20"
                            )}
                          >
                            {/* Journal Indicator */}
                            {hasJournal && (
                              <FileText className="absolute top-1 right-1 h-3 w-3 text-primary" />
                            )}

                            {/* Day Number */}
                            <div className={cn(
                              "text-xs font-medium mb-1",
                              isToday && "text-primary font-bold"
                            )}>
                              {format(day, 'd')}
                            </div>

                            {/* Metric Value */}
                            {hasData && (
                              <div className={cn(
                                "text-xs font-bold truncate",
                                dayData.pnl >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                              )}>
                                {getDayMetricValue(day)}
                              </div>
                            )}

                            {/* Trade Count */}
                            {hasData && (
                              <div className="text-[10px] text-muted-foreground truncate">
                                {dayData.longNumber + dayData.shortNumber} trades
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        {hasData && (
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-semibold">{format(day, 'PPP')}</p>
                              <p className={cn(
                                "font-bold",
                                dayData.pnl >= 0 ? "text-green-600" : "text-red-600"
                              )}>
                                P&L: {formatCurrency(dayData.pnl)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Trades: {dayData.longNumber}L / {dayData.shortNumber}S
                              </p>
                              {hasJournal && (
                                <p className="text-xs text-primary flex items-center gap-1">
                                  <FileText className="h-3 w-3" />
                                  Has Journal Entry
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/10 border border-green-500/20" />
            <span>Profitable Day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/10 border border-red-500/20" />
            <span>Loss Day</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Has Journal</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


