'use client'

import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays, getYear } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, BookOpen, Camera, TrendingUp, TrendingDown } from "lucide-react"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, BREAK_EVEN_THRESHOLD } from "@/lib/utils"
import { CalendarModal } from "./daily-modal"
import { WeeklyModal } from "./weekly-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCalendarViewStore } from "@/store/calendar-view"
import { useCalendarNotes } from "@/app/dashboard/hooks/use-calendar-notes"
import { useJournalData } from "@/app/dashboard/hooks/use-journal-data"
import WeeklyCalendarPnl from "./weekly-calendar"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { useUserStore } from "@/store/user-store"
import { Account } from "@/context/data-provider"
import {
  TODAY_STYLES,
  WEEKDAYS_FULL,
  DAY_CELL_STYLES,
  WEEKLY_CELL_STYLES,
  PNL_TEXT_STYLES,
  METRIC_PILL_STYLES
} from "@/app/dashboard/constants/calendar-styles"

const WEEKDAYS = WEEKDAYS_FULL

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

// Renewal Badge Component
function RenewalBadge({ renewals }: { renewals: Account[] }) {
  if (renewals.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "h-4 px-1.5 text-[8px] font-medium cursor-pointer z-0 justify-center items-center gap-1",
            "bg-muted/50 text-foreground border-border hover:bg-muted",
            "transition-all duration-200 hover:scale-110"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar className="h-3 w-3" />
          {renewals.length}
        </Badge>
      </PopoverTrigger>
      <PopoverContent
        className="w-[350px] p-4 z-50"
        align="start"
        side="right"
        sideOffset={5}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-4">
          <div className="font-semibold text-sm">Daily</div>
          {renewals.map((account) => (
            <div key={account.id} className="border-b last:border-b-0 pb-3 last:pb-0">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-medium text-sm">{account.number}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm">
                    {account.startingBalance != null && formatCurrency(account.startingBalance, { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Day Cell Component - Optimized for performance
const DayCell = memo(function DayCell({
  date,
  dayData,
  isCurrentMonth,
  hasJournal,
  renewals,
  winRate,
  onClick,
  timezone
}: {
  date: Date
  dayData: CalendarData[string] | undefined
  isCurrentMonth: boolean
  hasJournal: boolean
  renewals: Account[]
  winRate: string
  onClick: () => void
  timezone: string
}) {
  const isTodayDate = isToday(date)
  const hasTrades = dayData && dayData.tradeNumber > 0
  const isProfit = dayData && dayData.pnl >= 0

  return (
    <div
      className={cn(
        DAY_CELL_STYLES.base,
        "min-h-[75px] flex flex-col p-1.5",
        hasTrades
          ? isProfit
            ? DAY_CELL_STYLES.profit
            : DAY_CELL_STYLES.loss
          : DAY_CELL_STYLES.empty,
        !isCurrentMonth && DAY_CELL_STYLES.notCurrentMonth,
        isTodayDate && TODAY_STYLES.cell,
      )}
      onClick={onClick}
    >
      {/* Header row */}
      <div className="flex justify-between items-start">
        <span className={cn(
          "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
          isTodayDate && "bg-primary text-primary-foreground",
          !isTodayDate && !isCurrentMonth && "text-muted-foreground"
        )}>
          {format(date, 'd')}
        </span>
        <div className="flex items-center gap-1">
          {hasJournal && (
            <BookOpen className="h-3 w-3 text-muted-foreground" />
          )}
          {renewals.length > 0 && <RenewalBadge renewals={renewals} />}
        </div>
      </div>

      {/* Content */}
      {hasTrades && (
        <div className="flex-1 flex flex-col items-center justify-center gap-0.5 mt-1">
          <div className={cn(
            "text-lg font-bold leading-tight",
            isProfit ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss
          )}>
            {formatCurrency(dayData.pnl)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {dayData.tradeNumber} {dayData.tradeNumber > 1 ? "trades" : "trade"}
          </div>
          <div className={cn(
            "text-[10px] font-medium",
            isProfit ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss
          )}>
            {winRate}%
          </div>
        </div>
      )}
    </div>
  )
})

// Weekly Summary Cell Component
const WeeklySummaryCell = memo(function WeeklySummaryCell({
  weeklyStats,
  onClick
}: {
  weeklyStats: { totalPnl: number; tradingDays: number; winRate: string }
  onClick: () => void
}) {
  const state = weeklyStats.totalPnl > 0 ? 'profit' : weeklyStats.totalPnl < 0 ? 'loss' : 'flat'

  return (
    <div
      className={cn(
        WEEKLY_CELL_STYLES.base,
        "min-h-[75px] flex flex-col items-center justify-center p-1.5",
        state === 'profit' && WEEKLY_CELL_STYLES.profit,
        state === 'loss' && WEEKLY_CELL_STYLES.loss,
        state === 'flat' && WEEKLY_CELL_STYLES.flat,
      )}
      onClick={onClick}
    >
      <div className={cn(
        "text-base font-bold",
        state === 'profit' && PNL_TEXT_STYLES.profit,
        state === 'loss' && PNL_TEXT_STYLES.loss,
        state === 'flat' && PNL_TEXT_STYLES.neutral,
      )}>
        {formatCurrency(weeklyStats.totalPnl)}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {weeklyStats.tradingDays} {weeklyStats.tradingDays !== 1 ? "days" : "day"}
      </div>
      <div className={cn(
        "text-[10px] font-medium",
        state === 'profit' && PNL_TEXT_STYLES.profit,
        state === 'loss' && PNL_TEXT_STYLES.loss,
        state === 'flat' && PNL_TEXT_STYLES.neutral,
      )}>
        {weeklyStats.winRate}%
      </div>
    </div>
  )
})

const CalendarPnl = memo(function CalendarPnl({ calendarData }: CalendarPnlProps) {
  const accounts = useUserStore(state => state.accounts)
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [calendarDays, setCalendarDays] = useState<Date[]>([])
  const [dailyNotes, setDailyNotes] = useState<Record<string, string>>({})
  const calendarRef = useRef<HTMLDivElement>(null)

  const { notes: dailyNotesFromHook, refetchNotes } = useCalendarNotes()

  useEffect(() => {
    setDailyNotes(dailyNotesFromHook)
  }, [dailyNotesFromHook])

  useEffect(() => {
    const handleNotesSaved = () => refetchNotes()
    window.addEventListener('notesSaved', handleNotesSaved)
    return () => window.removeEventListener('notesSaved', handleNotesSaved)
  }, [refetchNotes])

  const hasNoteForDate = useCallback((date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    return dailyNotes[dateKey] && dailyNotes[dateKey].trim().length > 0
  }, [dailyNotes])

  const { monthStart, monthEnd } = useMemo(() => ({
    monthStart: startOfMonth(currentDate),
    monthEnd: endOfMonth(currentDate)
  }), [currentDate])

  const { hasJournalForDate } = useJournalData(monthStart, monthEnd)

  useEffect(() => {
    setCalendarDays(getCalendarDays(monthStart, monthEnd))
  }, [currentDate, monthStart, monthEnd])

  const { viewMode, setViewMode, selectedDate, setSelectedDate, selectedWeekDate, setSelectedWeekDate } = useCalendarViewStore()

  useEffect(() => {
    return () => setSelectedWeekDate(null)
  }, [setSelectedWeekDate])

  const handleWeeklyModalOpenChange = useCallback((open: boolean) => {
    if (!open) setSelectedWeekDate(null)
  }, [setSelectedWeekDate])

  const handleScreenshot = useCallback(async () => {
    if (!calendarRef.current) return

    try {
      toast.info("Capturing screenshot...")

      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
      })

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to capture screenshot")
          return
        }

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const fileName = `calendar-${format(currentDate, 'yyyy-MM')}-${viewMode}.png`
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        toast.success("Screenshot saved!")
      }, 'image/png')
    } catch (error) {
      toast.error("Failed to capture screenshot")
    }
  }, [currentDate, viewMode])

  const handlePrevMonth = useCallback(() => {
    setCurrentDate(subMonths(currentDate, 1))
  }, [currentDate])

  const handleNextMonth = useCallback(() => {
    setCurrentDate(addMonths(currentDate, 1))
  }, [currentDate])

  const monthlyTotal = useMemo(() => {
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      const date = new Date(dateString)
      if (isSameMonth(date, currentDate)) {
        return total + dayData.pnl
      }
      return total
    }, 0)
  }, [calendarData, currentDate])

  const yearTotal = useMemo(() => {
    return Object.entries(calendarData).reduce((total, [dateString, dayData]) => {
      const date = new Date(dateString)
      if (getYear(date) === getYear(currentDate)) {
        return total + dayData.pnl
      }
      return total
    }, 0)
  }, [calendarData, currentDate])

  const getRenewalsForDate = useCallback((_date: Date) => {
    return [] // Placeholder until nextPaymentDate field is added
  }, [])

  const calculateWeeklyStats = useCallback((index: number, calendarDays: Date[], calendarData: CalendarData) => {
    const startOfWeekIndex = index - 6
    const weekDays = calendarDays.slice(startOfWeekIndex, index + 1)

    let totalTrades = 0
    let winningTrades = 0
    let totalPnl = 0
    let tradingDays = 0

    weekDays.forEach(day => {
      const dayData = calendarData[formatInTimeZone(day, timezone, 'yyyy-MM-dd')]
      if (dayData) {
        totalTrades += dayData.tradeNumber
        totalPnl += dayData.pnl
        if (dayData.tradeNumber > 0) tradingDays++
        winningTrades += dayData.trades.filter(t => (t.pnl - (t.commission || 0)) > BREAK_EVEN_THRESHOLD).length
      }
    })

    const losingTrades = Object.values(calendarData).reduce((sum, dayData) => {
      return sum + dayData.trades.filter(t => (t.pnl - (t.commission || 0)) < -BREAK_EVEN_THRESHOLD).length
    }, 0)
    const tradableCount = winningTrades + losingTrades
    const winRate = tradableCount > 0 ? ((winningTrades / tradableCount) * 100).toFixed(1) : '0.0'

    return { totalPnl, totalTrades, winRate, tradingDays }
  }, [timezone])

  const displayTotal = viewMode === 'daily' ? monthlyTotal : yearTotal
  const isPositive = displayTotal >= 0

  return (
    <Card ref={calendarRef} className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b shrink-0 h-12 px-5 bg-gradient-to-r from-card to-muted/5">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold tracking-tight capitalize">
            {viewMode === 'daily'
              ? formatInTimeZone(currentDate, timezone, 'MMMM yyyy', { locale: dateLocale })
              : formatInTimeZone(currentDate, timezone, 'yyyy', { locale: dateLocale })}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <BookOpen className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Review daily P&L, trade counts, and journal entries</p>
            </TooltipContent>
          </Tooltip>

          {/* Total Pill */}
          <div className={cn(
            METRIC_PILL_STYLES.base,
            isPositive ? METRIC_PILL_STYLES.profit : METRIC_PILL_STYLES.loss
          )}>
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {formatCurrency(displayTotal)}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted/50 rounded-lg p-0.5">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 px-3 gap-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === 'daily' && "shadow-sm"
              )}
              onClick={() => setViewMode('daily')}
            >
              <Calendar className="h-3.5 w-3.5" />
              Daily
            </Button>
            <Button
              variant={viewMode === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 px-3 gap-1.5 rounded-md text-xs font-medium transition-all",
                viewMode === 'weekly' && "shadow-sm"
              )}
              onClick={() => setViewMode('weekly')}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Weekly
            </Button>
          </div>

          {/* Screenshot Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={handleScreenshot}
            title="Save screenshot"
          >
            <Camera className="h-4 w-4" />
          </Button>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => viewMode === 'daily' ? handlePrevMonth() : setCurrentDate(new Date(getYear(currentDate) - 1, 0, 1))}
              className="h-8 w-8 rounded-lg"
              aria-label={viewMode === 'daily' ? "Previous month" : "Previous year"}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => viewMode === 'daily' ? handleNextMonth() : setCurrentDate(new Date(getYear(currentDate) + 1, 0, 1))}
              className="h-8 w-8 rounded-lg"
              aria-label={viewMode === 'daily' ? "Next month" : "Next year"}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Calendar Content */}
      <CardContent className="flex-1 min-h-0 p-3">
        {viewMode === 'daily' ? (
          <>
            {/* Weekday Headers */}
            <div className="grid grid-cols-8 gap-2 mb-2">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center font-medium text-[11px] text-muted-foreground py-1">
                  {day}
                </div>
              ))}
              <div className="text-center font-medium text-[11px] text-muted-foreground py-1">
                Weekly
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-8 gap-2 h-[calc(100%-2rem)]">
              {calendarDays.map((date, index) => {
                const dayOfWeek = getDay(date)
                const dateString = format(date, 'yyyy-MM-dd')
                const dayData = calendarData[dateString]
                const isLastDayOfWeek = dayOfWeek === 6
                const isCurrentMonth = isSameMonth(date, currentDate)
                const dateRenewals = getRenewalsForDate(date)
                const hasJournal = hasJournalForDate(date)

                const winRate = dayData && dayData.tradeNumber > 0
                  ? ((dayData.trades.filter(t => (t.pnl - (t.commission || 0)) > BREAK_EVEN_THRESHOLD).length / dayData.trades.filter(t => Math.abs(t.pnl - (t.commission || 0)) > BREAK_EVEN_THRESHOLD).length) * 100).toFixed(1)
                  : '0.0'

                return (
                  <React.Fragment key={dateString}>
                    <DayCell
                      date={date}
                      dayData={dayData}
                      isCurrentMonth={isCurrentMonth}
                      hasJournal={hasJournal}
                      renewals={dateRenewals}
                      winRate={winRate}
                      onClick={() => {
                        if (dayData) setSelectedDate(date)
                      }}
                      timezone={timezone}
                    />
                    {isLastDayOfWeek && (
                      <WeeklySummaryCell
                        weeklyStats={calculateWeeklyStats(index, calendarDays, calendarData)}
                        onClick={() => {
                          const weekStartIndex = index - (index % 7)
                          const weekStart = calendarDays[weekStartIndex]
                          if (weekStart) setSelectedWeekDate(weekStart)
                        }}
                      />
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </>
        ) : (
          <div className="h-full overflow-hidden">
            <WeeklyCalendarPnl
              calendarData={calendarData}
              year={getYear(currentDate)}
            />
          </div>
        )}
      </CardContent>

      {/* Modals */}
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
        isOpen={selectedWeekDate !== null && selectedWeekDate instanceof Date && !isNaN(selectedWeekDate.getTime())}
        onOpenChange={handleWeeklyModalOpenChange}
        selectedDate={selectedWeekDate}
        calendarData={calendarData}
        isLoading={isLoading}
      />
    </Card>
  )
}, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.calendarData) === JSON.stringify(nextProps.calendarData)
})

export default CalendarPnl