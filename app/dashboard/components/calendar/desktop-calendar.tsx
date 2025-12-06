'use client'

import React, { useState, useEffect, useRef, memo } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays, isSameDay, getYear } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, BookOpen, Camera } from "lucide-react"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, BREAK_EVEN_THRESHOLD } from "@/lib/utils"
import { CalendarModal } from "./daily-modal"
import { WeeklyModal } from "./weekly-modal"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCalendarViewStore } from "@/store/calendar-view"
import { useCalendarNotes } from "@/app/dashboard/hooks/use-calendar-notes"
import { useJournalData } from "@/app/dashboard/hooks/use-journal-data"
import WeeklyCalendarPnl from "./weekly-calendar"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { useUserStore } from "@/store/user-store"
import { Account } from "@/context/data-provider"
import { TODAY_STYLES, WEEKDAYS_FULL } from "@/app/dashboard/constants/calendar-styles"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const WEEKDAYS = WEEKDAYS_FULL

type CalendarView = 'month' | 'week'


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



function RenewalBadge({ renewals }: { renewals: Account[] }) {
  if (renewals.length === 0) return null

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "h-4 px-1.5 text-[8px] sm:text-[9px] font-medium cursor-pointer relative z-0 w-auto justify-center items-center gap-1",
            "bg-muted/50 text-foreground border-border hover:bg-muted dark:bg-muted/30 dark:text-foreground dark:border-border dark:hover:bg-muted/50",
            "transition-all duration-200 ease-in-out",
            "hover:scale-110 hover:shadow-md",
            "active:scale-95"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar className="h-2.5 w-2.5" />
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
          {renewals.map((account, index) => (
            <div key={account.id} className="border-b last:border-b-0 pb-3 last:pb-0">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-medium text-sm">
                    {account.number}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-sm text-foreground">
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

const CalendarPnl = memo(function CalendarPnl({ calendarData }: CalendarPnlProps) {
  const accounts = useUserStore(state => state.accounts)
  const locale = 'en' // Fixed to English since we removed i18n
  const timezone = useUserStore(state => state.timezone)
  const dateLocale = enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [calendarDays, setCalendarDays] = useState<Date[]>([])

  // State to store notes from database
  const [dailyNotes, setDailyNotes] = useState<Record<string, string>>({})

  // Ref for the calendar container to capture screenshot
  const calendarRef = useRef<HTMLDivElement>(null)

  // Use centralized calendar notes hook (data pre-loaded from getUserData)
  const { notes: dailyNotesFromHook, refetchNotes } = useCalendarNotes()

  // DON'T fetch on mount - notes are already bundled with initial data
  // Only refetch when explicitly needed (e.g., after save)

  // Update local state when hook data changes
  useEffect(() => {
    setDailyNotes(dailyNotesFromHook)
  }, [dailyNotesFromHook])

  // Fetch notes on mount and when notes are saved
  useEffect(() => {
    // Listen for notes saved event
    const handleNotesSaved = () => {
      refetchNotes()
    }
    window.addEventListener('notesSaved', handleNotesSaved)

    return () => {
      window.removeEventListener('notesSaved', handleNotesSaved)
    }
  }, [refetchNotes])

  // Check if a note exists for a given date
  const hasNoteForDate = React.useCallback((date: Date) => {
    const dateKey = date.toISOString().split('T')[0]
    return dailyNotes[dateKey] && dailyNotes[dateKey].trim().length > 0
  }, [dailyNotes])

  // Memoize monthStart and monthEnd calculations
  const { monthStart, monthEnd } = React.useMemo(() => ({
    monthStart: startOfMonth(currentDate),
    monthEnd: endOfMonth(currentDate)
  }), [currentDate])

  // Fetch journal data for the current month
  const { hasJournalForDate, getJournalForDate } = useJournalData(monthStart, monthEnd)

  // Update calendarDays when currentDate changes
  useEffect(() => {
    setCalendarDays(getCalendarDays(monthStart, monthEnd))
  }, [currentDate, monthStart, monthEnd])

  // Use the calendar view store
  const { viewMode, setViewMode, selectedDate, setSelectedDate, selectedWeekDate, setSelectedWeekDate } = useCalendarViewStore()

  // Clear selectedWeekDate on unmount to prevent modal from opening randomly
  useEffect(() => {
    return () => {
      setSelectedWeekDate(null)
    }
  }, [setSelectedWeekDate])

  // Stable callback for WeeklyModal onOpenChange to prevent unnecessary re-renders
  const handleWeeklyModalOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      setSelectedWeekDate(null)
    }
  }, [setSelectedWeekDate])

  // Screenshot handler
  const handleScreenshot = React.useCallback(async () => {
    if (!calendarRef.current) return

    try {
      toast.info("Capturing screenshot...")

      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: null,
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
      })

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to capture screenshot")
          return
        }

        // Create download link
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


  const getRenewalsForDate = React.useCallback((date: Date) => {
    return [] // Temporary return empty array until nextPaymentDate field is added
  }, [])

  const calculateWeeklyTotal = React.useCallback((index: number, calendarDays: Date[], calendarData: CalendarData) => {
    // Calculate for full week (Sun-Sat)
    const startOfWeekIndex = index - 6
    const weekDays = calendarDays.slice(startOfWeekIndex, index + 1)

    const weekTotal = weekDays.reduce((total, day) => {
      const dayData = calendarData[formatInTimeZone(day, timezone, 'yyyy-MM-dd')]
      return total + (dayData ? dayData.pnl : 0)
    }, 0)

    return weekTotal
  }, [timezone])

  const calculateWeeklyStats = React.useCallback((index: number, calendarDays: Date[], calendarData: CalendarData) => {
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

    // CRITICAL FIX: Exclude break-even trades from win rate denominator
    const losingTrades = Object.values(calendarData).reduce((sum, dayData) => {
      return sum + dayData.trades.filter(t => (t.pnl - (t.commission || 0)) < -BREAK_EVEN_THRESHOLD).length
    }, 0)
    const tradableCount = winningTrades + losingTrades
    const winRate = tradableCount > 0 ? ((winningTrades / tradableCount) * 100).toFixed(1) : '0.0'

    return { totalPnl, totalTrades, winRate, tradingDays }
  }, [timezone])


  return (
    <Card ref={calendarRef} className="h-full flex flex-col">
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
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-md p-0.5 bg-muted">
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 px-2 transition-colors",
                viewMode === 'daily' && "bg-muted text-muted-foreground shadow font-semibold"
              )}
              onClick={() => setViewMode('daily')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              <span className="text-xs">{"Daily"}</span>
            </Button>
            <Button
              variant={viewMode === 'weekly' ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                "h-7 px-2 transition-colors",
                viewMode === 'weekly' && "bg-muted text-muted-foreground shadow font-semibold"
              )}
              onClick={() => setViewMode('weekly')}
            >
              <CalendarDays className="h-4 w-4 mr-1" />
              <span className="text-xs">{"Weekly"}</span>
            </Button>
          </div>

          {/* Screenshot Button */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={handleScreenshot}
            title="Save screenshot"
          >
            <Camera className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-1.5">
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
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-1 sm:p-2">
        {viewMode === 'daily' ? (
          <>
            <div className="gap-x-2 mb-2 grid grid-cols-8">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
                  {day}
                </div>
              ))}
              <div className="text-center font-medium text-[9px] sm:text-[11px] text-muted-foreground">
                Weekly
              </div>
            </div>
            <div className="gap-2 h-fit min-h-[500px] max-h-[700px] overflow-hidden grid grid-cols-8">
              {calendarDays.map((date, index) => {
                const dayOfWeek = getDay(date)

                const dateString = format(date, 'yyyy-MM-dd')
                const dayData = calendarData[dateString]
                // Saturday (day 6) is last day of week
                const isLastDayOfWeek = dayOfWeek === 6
                const isCurrentMonth = isSameMonth(date, currentDate)
                const dateRenewals = getRenewalsForDate(date)
                const hasNote = hasNoteForDate(date)
                const hasJournal = hasJournalForDate(date)
                const journalEntry = getJournalForDate(date)

                // Calculate win rate if there's data
                const winRate = dayData && dayData.tradeNumber > 0
                  ? ((dayData.trades.filter(t => (t.pnl - (t.commission || 0)) > BREAK_EVEN_THRESHOLD).length / dayData.trades.filter(t => Math.abs(t.pnl - (t.commission || 0)) > BREAK_EVEN_THRESHOLD).length) * 100).toFixed(1)
                  : '0.0'

                return (
                  <React.Fragment key={dateString}>
                    <div
                      className={cn(
                        "h-full min-h-[100px] flex flex-col cursor-pointer transition-all duration-200 rounded-md overflow-hidden",
                        "border",
                        "hover:border-primary hover:shadow-sm hover:scale-[1.02]",
                        dayData && dayData.pnl >= 0
                          ? "bg-green-50/80 dark:bg-green-950/40 midnight-ocean:bg-green-950/40 border-green-100 dark:border-green-900/50 midnight-ocean:border-green-900/50"
                          : dayData && dayData.pnl < 0
                            ? "bg-red-50/60 dark:bg-red-950/30 midnight-ocean:bg-red-950/30 border-red-100/80 dark:border-red-900/40 midnight-ocean:border-red-900/40"
                            : "bg-card border-border",
                        !isCurrentMonth && "opacity-50",
                        isToday(date) && TODAY_STYLES.cell,
                      )}
                      onClick={() => {
                        if (dayData) {
                          setSelectedDate(date)
                        }
                      }}
                    >
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start px-1 pt-1">
                          <span className={cn(
                            "text-xs font-medium",
                            isToday(date) && TODAY_STYLES.text,
                            !isCurrentMonth && "opacity-50"
                          )}>
                            {format(date, 'd')}
                          </span>
                          <div className="flex items-center gap-1">
                            {hasJournal && (
                              <BookOpen className={cn(
                                "h-3.5 w-3.5 text-slate-400 dark:text-slate-300",
                                !isCurrentMonth && "opacity-30"
                              )} />
                            )}
                            {dateRenewals.length > 0 && <RenewalBadge renewals={dateRenewals} />}
                          </div>
                        </div>
                        {dayData ? (
                          <div className="flex-1 flex flex-col items-center justify-center gap-0.5 px-1">
                            <div className={cn(
                              "text-base font-bold leading-tight text-center",
                              dayData.pnl >= 0
                                ? "text-green-600 dark:text-green-400 midnight-ocean:text-green-400"
                                : "text-red-600 dark:text-red-400 midnight-ocean:text-red-400",
                              !isCurrentMonth && "opacity-50"
                            )}>
                              {formatCurrency(dayData.pnl)}
                            </div>
                            <div className={cn(
                              "text-[10px] text-muted-foreground text-center",
                              !isCurrentMonth && "opacity-50"
                            )}>
                              {dayData.tradeNumber} {dayData.tradeNumber > 1 ? "trades" : "trade"}
                            </div>
                            <div className={cn(
                              "text-[10px] font-medium text-center",
                              dayData.pnl >= 0
                                ? "text-green-600 dark:text-green-400 midnight-ocean:text-green-400"
                                : "text-red-600 dark:text-red-400 midnight-ocean:text-red-400",
                              !isCurrentMonth && "opacity-50"
                            )}>
                              {winRate}%
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {isLastDayOfWeek && (() => {
                      const weeklyStats = calculateWeeklyStats(index, calendarDays, calendarData)
                      const weeklyState = weeklyStats.totalPnl > 0 ? 'gain' : weeklyStats.totalPnl < 0 ? 'loss' : 'flat'
                      return (
                        <div
                          className={cn(
                            "h-full min-h-[100px] flex flex-col items-center justify-center rounded-md cursor-pointer transition-all duration-200 px-1 py-1",
                            "border",
                            "hover:border-primary hover:shadow-sm hover:scale-[1.02]",
                            weeklyState === 'gain'
                              ? "bg-green-50/80 dark:bg-green-950/40 midnight-ocean:bg-green-950/40 border-green-100 dark:border-green-900/50 midnight-ocean:border-green-900/50"
                              : weeklyState === 'loss'
                                ? "bg-red-50/60 dark:bg-red-950/30 midnight-ocean:bg-red-950/30 border-red-100/80 dark:border-red-900/40 midnight-ocean:border-red-900/40"
                                : "bg-muted/30 dark:bg-muted/10 border-dashed border-border/70"
                          )}
                          onClick={() => {
                            const weekStartIndex = index - (index % 7)
                            const weekStart = calendarDays[weekStartIndex]
                            if (weekStart) {
                              setSelectedWeekDate(weekStart)
                            }
                          }}
                        >
                          <div className={cn(
                            "text-base font-bold text-center leading-tight",
                            weeklyState === 'gain'
                              ? "text-green-600 dark:text-green-400"
                              : weeklyState === 'loss'
                                ? "text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                          )}>
                            {formatCurrency(weeklyStats.totalPnl)}
                          </div>
                          <div className="text-[10px] text-muted-foreground text-center mt-0.5">
                            {weeklyStats.tradingDays} {weeklyStats.tradingDays > 1 ? "days" : "day"}
                          </div>
                          <div className={cn(
                            "text-[10px] font-medium text-center",
                            weeklyState === 'gain'
                              ? "text-green-600 dark:text-green-400"
                              : weeklyState === 'loss'
                                ? "text-red-600 dark:text-red-400"
                                : "text-muted-foreground"
                          )}>
                            {weeklyStats.winRate}%
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
          <div className="min-h-[500px] max-h-[700px] h-full overflow-hidden">
            <WeeklyCalendarPnl
              calendarData={calendarData}
              year={getYear(currentDate)}
            />
          </div>
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
        isOpen={selectedWeekDate !== null && selectedWeekDate instanceof Date && !isNaN(selectedWeekDate.getTime())}
        onOpenChange={handleWeeklyModalOpenChange}
        selectedDate={selectedWeekDate}
        calendarData={calendarData}
        isLoading={isLoading}
      />
    </Card>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if calendarData actually changed
  return JSON.stringify(prevProps.calendarData) === JSON.stringify(nextProps.calendarData)
})

export default CalendarPnl