'use client'

import React, { useState, useEffect } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { useUserStore } from "@/store/user-store"

const WEEKDAYS_MINI = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri'
] as const

const MINI_TODAY_CELL_CLASSES =
  "border-sky-500/70 bg-sky-500/10 ring-1 ring-sky-400/60 shadow-[0_0_10px_rgba(14,165,233,0.35)]"
const MINI_TODAY_TEXT_CLASSES =
  "text-sky-500 dark:text-sky-300 drop-shadow-[0_0_6px_rgba(14,165,233,0.45)]"

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

const formatCurrency = (value: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => {
  const formatted = value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 0
  })
  return formatted
}

interface MiniCalendarProps {
  calendarData: CalendarData;
}

export default function MiniCalendar({ calendarData }: MiniCalendarProps) {
  const locale = 'en'
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [calendarDays, setCalendarDays] = useState<Date[]>([])

  const { monthStart, monthEnd } = React.useMemo(() => ({
    monthStart: startOfMonth(currentDate),
    monthEnd: endOfMonth(currentDate)
  }), [currentDate])

  useEffect(() => {
    setCalendarDays(getCalendarDays(monthStart, monthEnd))
  }, [currentDate, monthStart, monthEnd])

  const handlePrevMonth = React.useCallback(() => {
    setCurrentDate(subMonths(currentDate, 1))
  }, [currentDate])

  const handleNextMonth = React.useCallback(() => {
    setCurrentDate(addMonths(currentDate, 1))
  }, [currentDate])

  const calculateMonthlyTotal = React.useCallback(() => {
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      const date = new Date(dateString)
      if (isSameMonth(date, currentDate)) {
        return total + dayData.pnl
      }
      return total
    }, 0)
  }, [calendarData, currentDate])

  const monthlyTotal = calculateMonthlyTotal()

  const calculateWeeklyTotal = React.useCallback((index: number, calendarDays: Date[], calendarData: CalendarData) => {
    // Calculate for Mon-Fri only
    const startOfWeekIndex = index - 4 // 4 days back for Mon-Fri
    const weekDays = calendarDays.slice(startOfWeekIndex, index + 1)
    
    return weekDays.reduce((total, day) => {
      // Skip weekends when calculating total
      const dayOfWeek = getDay(day)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        return total
      }
      
      const dayData = calendarData[formatInTimeZone(day, timezone, 'yyyy-MM-dd')]
      return total + (dayData ? dayData.pnl : 0)
    }, 0)
  }, [timezone])

  return (
    <Card className="h-[580px] flex flex-col w-full">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]"
      >
        <div className="flex items-center gap-3">
          <CardTitle className="text-base sm:text-lg font-semibold truncate capitalize">
            {formatInTimeZone(currentDate, timezone, 'MMMM yyyy', { locale: dateLocale })}
          </CardTitle>
          <div className={cn(
            "text-sm sm:text-base font-semibold truncate",
            monthlyTotal >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(monthlyTotal)}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevMonth}
            className="h-7 w-7 sm:h-8 sm:w-8"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextMonth}
            className="h-7 w-7 sm:h-8 sm:w-8"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-1 sm:p-2">
        <div className="gap-x-2 mb-2 grid grid-cols-6">
          {WEEKDAYS_MINI.map((day) => (
            <div key={day} className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
              {day}
            </div>
          ))}
          <div className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
            Weekly
          </div>
        </div>
        <div className="gap-2 h-fit min-h-[450px] max-h-[500px] overflow-hidden grid grid-cols-6">
          {calendarDays.map((date, index) => {
            const dayOfWeek = getDay(date)
            
            // Skip weekends in mini calendar
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              return null
            }
            
            // Calculate grid column for mini mode
            // getDay(): Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
            // We want: Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
            let gridColumn = undefined
            if (dayOfWeek === 1) gridColumn = 1 // Monday
            else if (dayOfWeek === 2) gridColumn = 2 // Tuesday  
            else if (dayOfWeek === 3) gridColumn = 3 // Wednesday
            else if (dayOfWeek === 4) gridColumn = 4 // Thursday
            else if (dayOfWeek === 5) gridColumn = 5 // Friday
            
            const dateString = format(date, 'yyyy-MM-dd')
            const dayData = calendarData[dateString]
            const isLastDayOfWeek = dayOfWeek === 5 // Friday is last day
            const isCurrentMonth = isSameMonth(date, currentDate)

            return (
              <React.Fragment key={dateString}>
                <div
                  style={gridColumn ? { gridColumn } : undefined}
                  className={cn(
                    "h-full flex flex-col rounded-md p-1",
                    "border",
                    dayData && dayData.pnl >= 0
                      ? "bg-green-50/80 dark:bg-green-950/40 border-green-100 dark:border-green-900/50"
                      : dayData && dayData.pnl < 0
                        ? "bg-red-50/60 dark:bg-red-950/30 border-red-100/80 dark:border-red-900/40"
                        : "bg-card border-border",
                    !isCurrentMonth && "opacity-50",
                    isToday(date) && MINI_TODAY_CELL_CLASSES,
                  )}
                >
                  <div className="flex justify-between items-start gap-0.5">
                    <span className={cn(
                      "text-[9px] sm:text-[11px] font-medium min-w-[14px] text-center",
                      isToday(date) && `${MINI_TODAY_TEXT_CLASSES} font-semibold`,
                      !isCurrentMonth && "opacity-50"
                    )}>
                      {format(date, 'd')}
                    </span>
                  </div>
                  <div className="flex-1 flex flex-col justify-end gap-0.5">
                    {dayData ? (
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold truncate text-center",
                        dayData.pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400",
                        !isCurrentMonth && "opacity-50"
                      )}>
                        {formatCurrency(dayData.pnl)}
                      </div>
                    ) : (
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold invisible text-center",
                        !isCurrentMonth && "opacity-50"
                      )}>$0</div>
                    )}
                    <div className={cn(
                      "text-[7px] sm:text-[9px] text-muted-foreground truncate text-center",
                      !isCurrentMonth && "opacity-50"
                    )}>
                      {dayData
                        ? `${dayData.tradeNumber} ${dayData.tradeNumber > 1 ? "trades" : "trade"}`
                        : "No trades"}
                    </div>
                  </div>
                </div>
                {isLastDayOfWeek && (() => {
                  const weeklyTotal = calculateWeeklyTotal(index, calendarDays, calendarData)
                  return (
                    <div
                      className={cn(
                        "h-full flex items-center justify-center rounded-md",
                        "border",
                        weeklyTotal >= 0
                          ? "bg-green-50/80 dark:bg-green-950/40 border-green-100 dark:border-green-900/50"
                          : weeklyTotal < 0
                            ? "bg-red-50/60 dark:bg-red-950/30 border-red-100/80 dark:border-red-900/40"
                            : "bg-card border-border"
                      )}
                    >
                      <div className={cn(
                        "text-[9px] sm:text-[11px] font-semibold truncate px-0.5",
                        weeklyTotal >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {formatCurrency(weeklyTotal)}
                      </div>
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

