'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, getDay, endOfWeek, addDays, getWeek } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Camera } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { useUserStore } from "@/store/user-store"
import { BREAK_EVEN_THRESHOLD } from "@/lib/utils"
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

  const calendarRef = useRef<HTMLDivElement>(null)

  const handleScreenshot = useCallback(async () => {
    if (!calendarRef.current) return

    try {
      toast.info("Capturing screenshot...")
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: '#09090b',
        scale: 2,
        logging: false,
        useCORS: true,
        windowWidth: 1200, // Force desktop width for capture
        onclone: (clonedDoc) => {
          const wrapper = clonedDoc.querySelector('[data-screenshot-wrap]') as HTMLElement
          if (wrapper) {
            wrapper.style.width = '870px'
            wrapper.style.padding = '60px'
            wrapper.style.background = 'linear-gradient(135deg, #1e1b4b 0%, #09090b 50%, #2e1065 100%)'
            wrapper.style.borderRadius = '0px'
            wrapper.style.display = 'flex'
            wrapper.style.justifyContent = 'center'

            const card = wrapper.querySelector('.rounded-xl') as HTMLElement
            if (card) {
              card.style.width = '750px'
              card.style.boxShadow = '0 30px 60px -12px rgba(0, 0, 0, 0.7)'
              card.style.border = '1px solid rgba(255,255,255,0.15)'
              card.style.background = '#09090b'

              // Ensure stats are visible in screenshot
              const statsGroup = card.querySelector('[data-stats-group]') as HTMLElement
              if (statsGroup) statsGroup.style.display = 'flex'
            }
          }
        }
      })

      const image = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = image
      link.download = `calendar-summary-${format(currentDate, 'MMM-yyyy')}.png`
      link.click()
      toast.success("Screenshot saved!")
    } catch (err) {
      console.error("Screenshot failed:", err)
      toast.error("Failed to capture screenshot")
    }
  }, [currentDate])

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
      const dayData = calendarData[format(day, 'yyyy-MM-dd')]
      return total + (dayData ? dayData.pnl : 0)
    }, 0)
  }, [])

  const isProfitTotal = monthlyTotal > BREAK_EVEN_THRESHOLD
  const isLossTotal = monthlyTotal < -BREAK_EVEN_THRESHOLD

  const tradedDaysCount = useMemo(() => {
    return Object.entries(calendarData).filter(([dateString, dayData]) => {
      const date = new Date(dateString)
      return isSameMonth(date, currentDate) && dayData.tradeNumber > 0
    }).length
  }, [calendarData, currentDate])

  return (
    <div ref={calendarRef} data-screenshot-wrap className="w-full">
      <Card className="lg:h-[580px] min-h-[400px] flex flex-col w-full rounded-xl border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
        {/* Header */}
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between border-b shrink-0 px-3 sm:px-4 py-2 sm:py-3 bg-card/50">
          <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
            <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/40 font-bold shrink-0">
              <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-6 w-6 sm:h-7 sm:w-7 hover:bg-background" aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-1 sm:px-2 min-w-[70px] sm:min-w-[100px] text-center">
                <span className="text-[11px] sm:text-sm font-bold capitalize tracking-tight whitespace-nowrap">
                  {format(currentDate, 'MMM yyyy')}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-6 w-6 sm:h-7 sm:w-7 hover:bg-background" aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div data-stats-group className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-bold uppercase tracking-tighter sm:tracking-wider shrink-0">
              <div className={cn(
                "px-1 sm:px-1.5 py-0.5 rounded border shadow-sm flex items-center gap-0.5 sm:gap-1",
                isProfitTotal ? "bg-long/10 border-long/20 text-long" : isLossTotal ? "bg-short/10 border-short/20 text-short" : "bg-muted/10 border-border/20 text-muted-foreground"
              )}>
                {formatCompact(monthlyTotal)}
              </div>
              <div className="px-1 sm:px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary border-dashed shadow-sm">
                {tradedDaysCount}d
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleScreenshot}
              className="h-7 w-7 sm:w-auto sm:px-2 text-[10px] font-bold uppercase tracking-wider gap-1.5 border-dashed hover:bg-primary/10 hover:text-primary transition-all p-0 sm:p-auto"
              title="Snapshot"
            >
              <Camera className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Snapshot</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-3" data-screenshot-container>
          {/* Weekday Headers */}
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1 md:gap-2 mb-2">
            {WEEKDAYS_MINI.map((day, i) => (
              <div key={day} className="text-center font-bold text-[10px] text-muted-foreground/60 py-1 uppercase tracking-tighter sm:tracking-normal">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{['M', 'T', 'W', 'T', 'F'][i]}</span>
              </div>
            ))}
            <div className="hidden sm:block text-center font-bold text-[11px] text-muted-foreground/80 py-1 uppercase tracking-[0.15em]">
              Week
            </div>
          </div>

          {/* Calendar Grid - removed fixed column for wk on mobile */}
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-1 md:gap-2 flex-1">
            {(() => {
              const rows = [];
              for (let i = 0; i < calendarDays.length; i += 7) {
                const weekDays = calendarDays.slice(i, i + 7);
                // Only show the week if at least one Mon-Fri day belongs to the current month
                const hasVisibleDayInMonth = weekDays.slice(1, 6).some(d => isSameMonth(d, currentDate));
                if (hasVisibleDayInMonth) {
                  rows.push(...weekDays);
                }
              }
              return rows;
            })().map((date, index) => {
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
              const hasTrades = dayData && dayData.tradeNumber > 0
              const isProfit = dayData && dayData.pnl > BREAK_EVEN_THRESHOLD
              const isLoss = dayData && dayData.pnl < -BREAK_EVEN_THRESHOLD
              const isBreakEven = dayData && !isProfit && !isLoss && dayData.tradeNumber > 0

              return (
                <React.Fragment key={dateString}>
                  <div
                    style={gridColumn ? { gridColumn } : undefined}
                    className={cn(
                      "flex flex-col rounded-lg p-1 sm:p-2 border transition-all duration-200 min-h-[45px] sm:min-h-[60px] lg:min-h-[82px] cursor-default group",
                      hasTrades
                        ? isProfit
                          ? "bg-long/10 border-long/30 hover:bg-long/20 hover:border-long/50"
                          : isLoss
                            ? "bg-short/10 border-short/30 hover:bg-short/20 hover:border-short/50"
                            : "bg-muted/10 border-border/30 hover:bg-muted/20 hover:border-border/50"
                        : "bg-card/40 border-border/30",
                      !isCurrentMonth && "opacity-20 grayscale",
                      isTodayDate && "border-primary/30",
                    )}
                  >
                    {/* Header: Date + Compact PnL */}
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn(
                        "text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-md transition-colors",
                        isTodayDate ? "border border-primary/50 text-primary" : "bg-zinc-800/80 text-zinc-300",
                      )}>
                        {format(date, 'd')}
                      </span>

                      {hasTrades && (
                        <div className={cn(
                          "text-[9px] sm:text-[11px] font-black tracking-tighter",
                          isProfit ? "text-long" : isLoss ? "text-short" : "text-muted-foreground"
                        )}>
                          {formatCompact(dayData.pnl)}
                        </div>
                      )}
                    </div>

                    {/* Body: Compact Metrics (Clean White/Gray) */}
                    <div className="mt-auto hidden sm:block">
                      {hasTrades && (
                        <div className="flex flex-col gap-0">
                          <div className="text-[9px] font-semibold text-zinc-300/80 flex items-center gap-0.5">
                            <span>{dayData.tradeNumber}</span>
                            <span className="opacity-50 font-medium scale-[0.9] origin-left">trades</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isLastDayOfWeek && (() => {
                    const weeklyTotal = calculateWeeklyTotal(index, calendarDays, calendarData)
                    const state = weeklyTotal > BREAK_EVEN_THRESHOLD ? 'profit' : weeklyTotal < -BREAK_EVEN_THRESHOLD ? 'loss' : 'flat'
                    const weekOfYear = getWeek(date, { weekStartsOn: 1 })
                    return (
                      <div className={cn(
                        "hidden sm:flex flex-col items-center justify-center rounded-lg border min-h-[45px] sm:min-h-[60px] lg:min-h-[82px] p-1 transition-all shadow-sm",
                        state === 'profit' && "bg-long/10 border-long/40",
                        state === 'loss' && "bg-short/10 border-short/40",
                        state === 'flat' && "bg-muted/10 border-dashed border-border/40",
                      )}>
                        <span className={cn(
                          "text-[10px] sm:text-[13px] font-black tracking-tighter",
                          state === 'profit' && "text-long",
                          state === 'loss' && "text-short",
                          state === 'flat' && "text-muted-foreground",
                        )}>
                          {formatCompact(weeklyTotal)}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase text-muted-foreground/50 mt-1 hidden sm:block">
                          Week {weekOfYear}
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
    </div>
  )
}

export default React.memo(MiniCalendar, (prevProps, nextProps) => {
  return JSON.stringify(prevProps.calendarData) === JSON.stringify(nextProps.calendarData)
})
