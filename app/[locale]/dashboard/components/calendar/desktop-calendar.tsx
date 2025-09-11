'use client'

import React, { useState, useEffect } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays, isSameDay, getYear } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarModal } from "./daily-modal"
import { useI18n, useCurrentLocale } from "@/locales/client"
import { WeeklyModal } from "./weekly-modal"
import { useCalendarViewStore } from "@/store/calendar-view"
import WeeklyCalendarPnl from "./weekly-calendar"
import { CalendarData } from "@/app/[locale]/dashboard/types/calendar"
import { useUserStore } from "@/store/user-store"

const WEEKDAYS = [
  'calendar.weekdays.sun',
  'calendar.weekdays.mon',
  'calendar.weekdays.tue',
  'calendar.weekdays.wed',
  'calendar.weekdays.thu',
  'calendar.weekdays.fri',
  'calendar.weekdays.sat'
] as const

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

interface CalendarPnlProps {
  calendarData: CalendarData;
}

export default function CalendarPnl({ calendarData }: CalendarPnlProps) {
  const t = useI18n()
  const locale = useCurrentLocale()
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [calendarDays, setCalendarDays] = useState<Date[]>([])

  // Memoize monthStart and monthEnd calculations
  const { monthStart, monthEnd } = React.useMemo(() => ({
    monthStart: startOfMonth(currentDate),
    monthEnd: endOfMonth(currentDate)
  }), [currentDate])

  // Update calendarDays when currentDate changes
  useEffect(() => {
    setCalendarDays(getCalendarDays(monthStart, monthEnd))
  }, [currentDate, monthStart, monthEnd])

  // Use the calendar view store
  const {
    viewMode,
    setViewMode,
    selectedDate,
    setSelectedDate,
    selectedWeekDate,
    setSelectedWeekDate
  } = useCalendarViewStore()

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

  const calculateYearTotal = React.useCallback(() => {
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      const date = new Date(dateString)
      if (getYear(date) === getYear(currentDate)) {
        return total + dayData.pnl
      }
      return total
    }, 0)
  }, [calendarData, currentDate])

  const yearTotal = calculateYearTotal()

  const calculateWeeklyTotal = React.useCallback((index: number, calendarDays: Date[], calendarData: CalendarData) => {
    const startOfWeekIndex = index - 6
    const weekDays = calendarDays.slice(startOfWeekIndex, index + 1)
    return weekDays.reduce((total, day) => {
      const dayData = calendarData[formatInTimeZone(day, timezone, 'yyyy-MM-dd')]
      return total + (dayData ? dayData.pnl : 0)
    }, 0)
  }, [timezone])

  return (
    <Card className="h-full flex flex-col">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 p-3 sm:p-4 h-[56px]"
      >
        <div className="flex items-center gap-3">
          <CardTitle className="text-base sm:text-lg font-semibold truncate capitalize">
            {viewMode === 'daily'
              ? formatInTimeZone(currentDate, timezone, 'MMMM yyyy', { locale: dateLocale })
              : formatInTimeZone(currentDate, timezone, 'yyyy', { locale: dateLocale })}
          </CardTitle>
          <div className={cn(
            "text-sm sm:text-base font-semibold truncate",
            (viewMode === 'daily' ? monthlyTotal : yearTotal) >= 0
              ? "text-green-600 dark:text-green-400"
              : "text-red-600 dark:text-red-400"
          )}>
            {formatCurrency(viewMode === 'daily' ? monthlyTotal : yearTotal)}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted mr-2">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 px-2 transition-colors",
                viewMode === 'daily' && "bg-primary text-primary-foreground shadow font-semibold"
              )}
              onClick={() => setViewMode('daily')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-xs">{t('calendar.viewMode.daily')}</span>
            </Button>
            <Button
              variant={viewMode === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 px-2 transition-colors",
                viewMode === 'weekly' && "bg-primary text-primary-foreground shadow font-semibold"
              )}
              onClick={() => setViewMode('weekly')}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              <span className="text-xs">{t('calendar.viewMode.weekly')}</span>
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => viewMode === 'daily' ? handlePrevMonth() : setCurrentDate(new Date(getYear(currentDate) - 1, 0, 1))}
            className="h-7 w-7 sm:h-8 sm:w-8"
            aria-label={viewMode === 'daily' ? "Previous month" : "Previous year"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => viewMode === 'daily' ? handleNextMonth() : setCurrentDate(new Date(getYear(currentDate) + 1, 0, 1))}
            className="h-7 w-7 sm:h-8 sm:w-8"
            aria-label={viewMode === 'daily' ? "Next month" : "Next year"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-1.5 sm:p-4">
        {viewMode === 'daily' ? (
          <>
            <div className="grid grid-cols-8 gap-x-[1px] mb-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
                  {t(day)}
                </div>
              ))}
              <div className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
                {t('calendar.weekdays.weekly')}
              </div>
            </div>
            <div className="grid grid-cols-8 auto-rows-fr rounded-lg h-[calc(100%-20px)]">
              {calendarDays.map((date, index) => {
                const dateString = format(date, 'yyyy-MM-dd')
                const dayData = calendarData[dateString]
                const isLastDayOfWeek = getDay(date) === 6
                const isCurrentMonth = isSameMonth(date, currentDate)

                // Calculate max profit and max drawdown if dayData exists
                let maxProfit = 0;
                let maxDrawdown = 0;
                if (dayData) {
                  const sortedTrades = dayData.trades.sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
                  const equity = [0];
                  let cumulative = 0;
                  sortedTrades.forEach(trade => {
                    cumulative += trade.pnl - (trade.commission || 0);
                    equity.push(cumulative);
                  });

                  // Max drawdown calculation
                  let peak = -Infinity;
                  let maxDD = 0;
                  equity.forEach(val => {
                    if (val > peak) peak = val;
                    const dd = peak - val;
                    if (dd > maxDD) maxDD = dd;
                  });
                  maxDrawdown = maxDD;

                  // Max profit (runup) calculation
                  let trough = Infinity;
                  let maxRU = 0;
                  equity.forEach(val => {
                    if (val < trough) trough = val;
                    const ru = val - trough;
                    if (ru > maxRU) maxRU = ru;
                  });
                  maxProfit = maxRU;
                }

                return (
                  <React.Fragment key={dateString}>
                    <div
                      className={cn(
                        "h-full flex flex-col cursor-pointer transition-all rounded-none p-1",
                        "ring-1 ring-border hover:ring-primary hover:z-10",
                        dayData && dayData.pnl >= 0
                          ? "bg-green-50 dark:bg-green-900/20"
                          : dayData && dayData.pnl < 0
                            ? "bg-red-50 dark:bg-red-900/20"
                            : "bg-card",
                        !isCurrentMonth && "opacity-50",
                        isToday(date) && "ring-blue-500 bg-blue-500/5 z-10",
                        index === 0 && "rounded-tl-lg",
                        index === 35 && "rounded-bl-lg",
                      )}
                      onClick={() => {
                        setSelectedDate(date)
                      }}
                    >
                      <div className="flex justify-between items-start gap-0.5">
                        <span className={cn(
                          "text-[9px] sm:text-[11px] font-medium min-w-[14px] text-center",
                          isToday(date) && "text-primary font-semibold",
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
                            ? `${dayData.tradeNumber} ${dayData.tradeNumber > 1 ? t('calendar.trades') : t('calendar.trade')}`
                            : t('calendar.noTrades')}
                        </div>
                        {dayData && (
                          <>
                            <div className={cn(
                              "text-[7px] sm:text-[9px] text-green-600 dark:text-green-400 truncate text-center",
                              !isCurrentMonth && "opacity-50"
                            )}>
                              Max: {formatCurrency(maxProfit)}
                            </div>
                            <div className={cn(
                              "text-[7px] sm:text-[9px] text-red-600 dark:text-red-400 truncate text-center",
                              !isCurrentMonth && "opacity-50"
                            )}>
                              DD: -{formatCurrency(maxDrawdown)}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {isLastDayOfWeek && (() => {
                      const weeklyTotal = calculateWeeklyTotal(index, calendarDays, calendarData)
                      return (
                        <div
                          className={cn(
                            "h-full flex items-center justify-center rounded-none cursor-pointer",
                            "ring-1 ring-border hover:ring-primary hover:z-10",
                            index === 6 && "rounded-tr-lg",
                            index === 41 && "rounded-br-lg"
                          )}
                          onClick={() => setSelectedWeekDate(date)}
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
          </>
        ) : (
          <WeeklyCalendarPnl
            calendarData={calendarData}
            year={getYear(currentDate)}
          />
        )}
      </CardContent>
      <CalendarModal
        isOpen={selectedDate !== null && selectedDate !== undefined}
        onOpenChange={(open) => {
          if (!open) setSelectedDate(null)
        }}
        selectedDate={selectedDate}
        dayData={selectedDate ? calendarData[format(selectedDate, 'yyyy-MM-dd', { locale: dateLocale })] : undefined}
        isLoading={isLoading}
      />
      <WeeklyModal
        isOpen={selectedWeekDate !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedWeekDate(null)
        }}
        selectedDate={selectedWeekDate}
        calendarData={calendarData}
        isLoading={isLoading}
      />
    </Card>
  )
}