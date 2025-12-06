'use client'

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { useUserStore } from "@/store/user-store"
import { TODAY_STYLES, WEEKDAYS_WEEKDAYS_ONLY, PNL_TEXT_STYLES, METRIC_PILL_STYLES } from "@/app/dashboard/constants/calendar-styles"

const WEEKDAYS_MINI = WEEKDAYS_WEEKDAYS_ONLY

function getCalendarDays(monthStart: Date, monthEnd: Date) {
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: startDate, end: endDate })

  if (days.length === 42) return days

  const lastDay = days[days.length - 1]
  const additionalDays = eachDayOfInterval({
    start: addDays(lastDay, 1),
    end: addDays(startDate, 41)
  })

  return [...days, ...additionalDays].slice(0, 42)
}

const formatCurrency = (value: number) => {
  const formatted = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  return formatted
}

const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

interface MiniCalendarProps {
  calendarData: CalendarData;
}

function MiniCalendar({ calendarData }: MiniCalendarProps) {
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<Date[]>([])

  const { monthStart, monthEnd } = useMemo(() => ({
    monthStart: startOfMonth(currentDate),
    monthEnd: endOfMonth(currentDate)
  }), [currentDate])

  useEffect(() => {
    setCalendarDays(getCalendarDays(monthStart, monthEnd))
  }, [currentDate, monthStart, monthEnd])

  const handlePrevMonth = useCallback(() => setCurrentDate(subMonths(currentDate, 1)), [currentDate])
  const handleNextMonth = useCallback(() => setCurrentDate(addMonths(currentDate, 1)), [currentDate])

  const monthlyTotal = useMemo(() => {
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      const date = new Date(dateString)
      if (isSameMonth(date, currentDate)) return total + dayData.pnl
      return total
    }, 0)
  }, [calendarData, currentDate])

  const calculateWeeklyTotal = useCallback((index: number, calendarDays: Date[], calendarData: CalendarData) => {
    const startOfWeekIndex = index - 4
    const weekDays = calendarDays.slice(startOfWeekIndex, index + 1)

    return weekDays.reduce((total, day) => {
      const dayOfWeek = getDay(day)
      if (dayOfWeek === 0 || dayOfWeek === 6) return total
      const dayData = calendarData[formatInTimeZone(day, timezone, 'yyyy-MM-dd')]
      return total + (dayData ? dayData.pnl : 0)
    }, 0)
  }, [timezone])

  const isPositive = monthlyTotal >= 0

  return (
    <Card className="h-[580px] flex flex-col w-full">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base font-bold capitalize">
            {formatInTimeZone(currentDate, timezone, 'MMM yyyy', { locale: dateLocale })}
          </CardTitle>
          <div className={cn(
            METRIC_PILL_STYLES.base,
            isPositive ? METRIC_PILL_STYLES.profit : METRIC_PILL_STYLES.loss
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {formatCompact(monthlyTotal)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-3">
        {/* Weekday Headers */}
        <div className="grid grid-cols-6 gap-2 mb-2">
          {WEEKDAYS_MINI.map((day) => (
            <div key={day} className="text-center font-medium text-xs text-muted-foreground py-1">
              {day}
            </div>
          ))}
          <div className="text-center font-medium text-xs text-muted-foreground py-1">
            Wk
          </div>
        </div>

        {/* Calendar Grid - increased gap and cell heights */}
        <div className="grid grid-cols-6 gap-2 h-[calc(100%-2rem)]">
          {calendarDays.map((date, index) => {
            const dayOfWeek = getDay(date)

            // Skip weekends
            if (dayOfWeek === 0 || dayOfWeek === 6) return null

            let gridColumn = undefined
            if (dayOfWeek === 1) gridColumn = 1
            else if (dayOfWeek === 2) gridColumn = 2
            else if (dayOfWeek === 3) gridColumn = 3
            else if (dayOfWeek === 4) gridColumn = 4
            else if (dayOfWeek === 5) gridColumn = 5

            const dateString = format(date, 'yyyy-MM-dd')
            const dayData = calendarData[dateString]
            const isLastDayOfWeek = dayOfWeek === 5
            const isCurrentMonth = isSameMonth(date, currentDate)
            const isTodayDate = isToday(date)
            const hasTrades = dayData && dayData.pnl !== 0
            const isProfit = dayData && dayData.pnl >= 0

            return (
              <React.Fragment key={dateString}>
                <div
                  style={gridColumn ? { gridColumn } : undefined}
                  className={cn(
                    "flex flex-col rounded-lg p-2 border transition-colors min-h-[60px]",
                    hasTrades
                      ? isProfit
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-red-500/10 border-red-500/20"
                      : "bg-card border-border/30",
                    !isCurrentMonth && "opacity-40",
                    isTodayDate && TODAY_STYLES.cell,
                  )}
                >
                  <span className={cn(
                    "text-xs font-semibold text-center",
                    isTodayDate && "text-primary",
                    !isCurrentMonth && "text-muted-foreground"
                  )}>
                    {format(date, 'd')}
                  </span>
                  <div className="flex-1 flex flex-col items-center justify-center mt-1">
                    {hasTrades ? (
                      <>
                        <div className={cn(
                          "text-sm font-bold text-center",
                          isProfit ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss,
                          !isCurrentMonth && "opacity-60"
                        )}>
                          {formatCompact(dayData.pnl)}
                        </div>
                        <div className="text-[10px] text-muted-foreground text-center">
                          {dayData.tradeNumber}t
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-muted-foreground/50 text-center">-</div>
                    )}
                  </div>
                </div>

                {isLastDayOfWeek && (() => {
                  const weeklyTotal = calculateWeeklyTotal(index, calendarDays, calendarData)
                  const state = weeklyTotal > 0 ? 'profit' : weeklyTotal < 0 ? 'loss' : 'flat'
                  return (
                    <div className={cn(
                      "flex items-center justify-center rounded-lg border min-h-[60px]",
                      state === 'profit' && "bg-emerald-500/10 border-emerald-500/20",
                      state === 'loss' && "bg-red-500/10 border-red-500/20",
                      state === 'flat' && "bg-muted/10 border-dashed border-border/40",
                    )}>
                      <span className={cn(
                        "text-sm font-bold",
                        state === 'profit' && PNL_TEXT_STYLES.profit,
                        state === 'loss' && PNL_TEXT_STYLES.loss,
                        state === 'flat' && PNL_TEXT_STYLES.neutral,
                      )}>
                        {formatCompact(weeklyTotal)}
                      </span>
                    </div>
                  )
                })()}
              </React.Fragment>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export default React.memo(MiniCalendar, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.calendarData) === JSON.stringify(nextProps.calendarData)
})
