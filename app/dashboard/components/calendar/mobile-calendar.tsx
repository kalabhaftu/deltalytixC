'use client'

import React, { useState, useMemo } from "react"
import { format, addMonths, subMonths, getDay, addDays } from "date-fns"
import { formatInTimeZone, toDate } from 'date-fns-tz'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarModal } from "./daily-modal"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { Card, CardTitle } from "@/components/ui/card"
import { useUserStore } from "@/store/user-store"
import { TODAY_STYLES, DAY_CELL_STYLES, PNL_TEXT_STYLES, METRIC_PILL_STYLES } from "@/app/dashboard/constants/calendar-styles"

function formatCurrency(value: number): string {
  const absValue = Math.abs(value)
  if (absValue >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (absValue >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toFixed(0)
}

function getCalendarDayStrings(currentMonthDate: Date, timezone: string): string[] {
  const monthStartString = formatInTimeZone(currentMonthDate, timezone, 'yyyy-MM-01')
  const firstDayOfMonthInTZ = toDate(monthStartString, { timeZone: timezone })
  const startDayOfWeek = getDay(firstDayOfMonthInTZ)
  let currentGridDate = addDays(firstDayOfMonthInTZ, -startDayOfWeek)

  const dayStrings: string[] = []
  for (let i = 0; i < 42; i++) {
    dayStrings.push(formatInTimeZone(currentGridDate, timezone, 'yyyy-MM-dd'))
    currentGridDate = addDays(currentGridDate, 1)
  }
  return dayStrings
}

function isDateStringToday(dateString: string, timezone: string): boolean {
  return dateString === formatInTimeZone(new Date(), timezone, 'yyyy-MM-dd')
}

function MobileCalendarPnl({ calendarData }: { calendarData: CalendarData }) {
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const calendarDayStrings = getCalendarDayStrings(currentDate, timezone)
  const currentMonthReferenceDate = toDate(formatInTimeZone(currentDate, timezone, 'yyyy-MM-01'), { timeZone: timezone })
  const currentMonth = currentMonthReferenceDate.getMonth()
  const currentYear = currentMonthReferenceDate.getFullYear()

  const weekdayHeaders = [
    { key: 'sun', label: 'S' },
    { key: 'mon', label: 'M' },
    { key: 'tue', label: 'T' },
    { key: 'wed', label: 'W' },
    { key: 'thu', label: 'T' },
    { key: 'fri', label: 'F' },
    { key: 'sat', label: 'S' },
  ]

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const monthlyTotal = useMemo(() => {
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      try {
        const date = toDate(dateString + 'T00:00:00Z')
        if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
          return total + dayData.pnl
        }
      } catch { }
      return total
    }, 0)
  }, [calendarData, currentYear, currentMonth])

  const isPositive = monthlyTotal >= 0

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-card to-muted/5">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-bold capitalize">
            {formatInTimeZone(currentDate, timezone, 'MMM yyyy', { locale: dateLocale })}
          </CardTitle>
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
            isPositive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
              : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            ${formatCurrency(monthlyTotal)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8 rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar */}
      <div className="flex-1 p-3">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekdayHeaders.map((day) => (
            <div key={day.key} className="text-center font-medium text-[10px] text-muted-foreground py-1">
              {day.label}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDayStrings.map((dateString) => {
            const dayData = calendarData[dateString]

            let dateInTZ: Date
            try {
              dateInTZ = toDate(dateString, { timeZone: timezone })
            } catch {
              return <div key={dateString} className="min-h-[48px]" />
            }

            const isCurrentMonthDay = dateInTZ.getMonth() === currentMonth && dateInTZ.getFullYear() === currentYear
            const isTodayDate = isDateStringToday(dateString, timezone)
            const hasTrades = dayData && dayData.pnl !== 0
            const isProfit = dayData && dayData.pnl > 0

            return (
              <div
                key={dateString}
                className={cn(
                  "flex flex-col items-center justify-center p-1.5 rounded-xl min-h-[52px] transition-all duration-200 cursor-pointer",
                  "border hover:scale-[1.02] hover:shadow-sm",
                  !isCurrentMonthDay && "opacity-30",
                  isTodayDate && TODAY_STYLES.cell,
                  hasTrades && !isTodayDate && (
                    isProfit
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/30"
                      : "bg-red-50/80 dark:bg-red-950/40 border-red-200/50 dark:border-red-800/30"
                  ),
                  !hasTrades && !isTodayDate && "border-border/30 bg-card/50"
                )}
                onClick={() => {
                  if (dayData) {
                    setSelectedDate(dateInTZ)
                  }
                }}
              >
                <span className={cn(
                  "text-xs font-semibold",
                  isTodayDate && "text-primary",
                  hasTrades && !isTodayDate && (isProfit ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss)
                )}>
                  {format(dateInTZ, 'd')}
                </span>
                {hasTrades && (
                  <span className={cn(
                    "text-[9px] font-bold mt-0.5",
                    isProfit ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss
                  )}>
                    ${formatCurrency(dayData.pnl)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <CalendarModal
        isOpen={selectedDate !== null}
        onOpenChange={(open) => { if (!open) setSelectedDate(null) }}
        selectedDate={selectedDate}
        dayData={selectedDate ? calendarData[formatInTimeZone(selectedDate, timezone, 'yyyy-MM-dd')] : undefined}
        isLoading={isLoading}
      />
    </Card>
  )
}

export default React.memo(MobileCalendarPnl, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.calendarData) === JSON.stringify(nextProps.calendarData)
})