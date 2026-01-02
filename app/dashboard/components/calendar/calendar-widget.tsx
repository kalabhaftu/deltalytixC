'use client'

import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, getYear } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Camera, TrendingUp, TrendingDown, Image as ImageIcon } from "lucide-react"
import html2canvas from 'html2canvas'
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarModal } from "./daily-modal"
import { useCalendarViewStore } from "@/store/calendar-view"
import { useCalendarNotes } from "@/app/dashboard/hooks/use-calendar-notes"
import { useUserStore } from "@/store/user-store"
import { useData } from "@/context/data-provider"
import { CalendarData } from "@/app/dashboard/types/calendar"

// New Components
import MonthlyView from "./monthly-view"
import YearlyView from "./yearly-view"
import { StatsFilter } from "./stats-filter"

const formatCompact = (value: number) => {
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`
  return `$${value.toFixed(0)}`
}

interface CalendarPnlProps {
  size?: any;
  className?: string;
}

const CalendarPnl = memo(function CalendarPnl({ className }: CalendarPnlProps) {
  const timezone = useUserStore(state => state.timezone)
  const { formattedTrades, isLoading } = useData()

  const dateLocale = enUS
  const [currentDate, setCurrentDate] = useState(new Date())
  const calendarRef = useRef<HTMLDivElement>(null)

  const { refetchNotes } = useCalendarNotes()

  useEffect(() => {
    const handleNotesSaved = () => refetchNotes()
    window.addEventListener('notesSaved', handleNotesSaved)
    return () => window.removeEventListener('notesSaved', handleNotesSaved)
  }, [refetchNotes])

  // Construct Calendar Data locally for MAXIMUM consistency with grid lookups
  const localCalendarData = useMemo(() => {
    const data: CalendarData = {}
    if (!formattedTrades) return data

    formattedTrades.forEach(trade => {
      // formattedTrades.entryDate is expected to be a Date object or string parsable as one
      if (!trade.entryDate) return

      // Use format(..., 'yyyy-MM-dd') to get the NOMINAL date string
      // This will match format(date, 'yyyy-MM-dd') exactly in MonthlyView's grid
      const key = format(new Date(trade.entryDate), 'yyyy-MM-dd')

      if (!data[key]) {
        data[key] = {
          pnl: 0,
          tradeNumber: 0,
          trades: [],
          longNumber: 0,
          shortNumber: 0
        }
      }

      const netPnl = (trade.pnl || 0) + (trade.commission || 0)
      data[key].trades.push(trade)
      data[key].pnl += netPnl
      data[key].tradeNumber++

      const side = trade.side?.toLowerCase()
      const isLong = side === 'long' || side === 'buy' || side === 'b'
      if (isLong) data[key].longNumber++
      else data[key].shortNumber++
    })

    return data
  }, [formattedTrades])

  // View Store
  const { viewMode, setViewMode, selectedDate, setSelectedDate, screenshotWithGradient, setScreenshotWithGradient } = useCalendarViewStore()

  const handleScreenshot = useCallback(async () => {
    if (!calendarRef.current) return

    try {
      toast.info("Capturing screenshot...")
      const canvas = await html2canvas(calendarRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          if (screenshotWithGradient) {
            const wrapper = clonedDoc.getElementById('advanced-calendar-capture')
            if (wrapper) {
              wrapper.style.padding = '60px'
              wrapper.style.background = 'linear-gradient(135deg, #1e1b4b 0%, #09090b 50%, #2e1065 100%)'
              wrapper.style.borderRadius = '0px'
              wrapper.style.display = 'flex'
              wrapper.style.alignItems = 'center'
              wrapper.style.justifyContent = 'center'
              wrapper.style.width = '1320px'
              wrapper.style.height = 'fit-content'

              const card = wrapper.querySelector('.rounded-xl') as HTMLElement
              if (card) {
                card.style.width = '1200px'
                card.style.boxShadow = '0 30px 60px -12px rgba(0, 0, 0, 0.7)'
                card.style.border = '1px solid rgba(255,255,255,0.15)'
                card.style.background = '#09090b'
                card.style.height = '700px' // Fix height for nice aspect ratio
              }
            }
          }
        }
      })
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to capture screenshot")
          return
        }
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `calendar-${format(currentDate, 'yyyy-MM-dd')}.png`
        link.click()
        URL.revokeObjectURL(url)
        toast.success("Screenshot saved!")
      }, 'image/png')
    } catch (error) {
      toast.error("Failed to capture screenshot")
    }
  }, [currentDate, screenshotWithGradient])

  // Navigation
  const handlePrev = useCallback(() => {
    if (viewMode === 'daily') setCurrentDate(prev => subMonths(prev, 1))
    else setCurrentDate(prev => new Date(getYear(prev) - 1, 0, 1))
  }, [viewMode])

  const handleNext = useCallback(() => {
    if (viewMode === 'daily') setCurrentDate(prev => addMonths(prev, 1))
    else setCurrentDate(prev => new Date(getYear(prev) + 1, 0, 1))
  }, [viewMode])

  // Stats Calculation for Header
  const displayTotal = useMemo(() => {
    let total = 0
    if (viewMode === 'daily') {
      const currentMonthPrefix = format(currentDate, 'yyyy-MM')
      Object.entries(localCalendarData).forEach(([key, data]) => {
        if (key.startsWith(currentMonthPrefix)) {
          total += data.pnl
        }
      })
    } else {
      const currentYearPrefix = String(getYear(currentDate))
      Object.entries(localCalendarData).forEach(([key, data]) => {
        if (key.startsWith(currentYearPrefix)) {
          total += data.pnl
        }
      })
    }
    return total
  }, [localCalendarData, currentDate, viewMode])

  const isPositive = displayTotal >= 0

  const tradedDaysCount = useMemo(() => {
    let count = 0;
    if (viewMode === 'daily') {
      const currentMonthPrefix = format(currentDate, 'yyyy-MM')
      Object.entries(localCalendarData).forEach(([key, data]) => {
        if (key.startsWith(currentMonthPrefix) && data.tradeNumber > 0) count++
      })
    } else {
      const currentYearPrefix = String(getYear(currentDate))
      Object.entries(localCalendarData).forEach(([key, data]) => {
        if (key.startsWith(currentYearPrefix) && data.tradeNumber > 0) count++
      })
    }
    return count;
  }, [localCalendarData, currentDate, viewMode])

  return (
    <div id="advanced-calendar-capture" ref={calendarRef} data-screenshot-wrap className={cn("h-full w-full", className)}>
      <Card className="h-full flex flex-col overflow-hidden bg-background border shadow-sm rounded-xl">
        {/* Header - Aligned with MiniCalendar */}
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 py-3 md:py-2.5 px-4 border-b bg-card/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Navigation Group */}
            <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5 border border-border/40 font-bold w-full sm:w-auto justify-between sm:justify-start">
              <Button variant="ghost" size="icon" onClick={handlePrev} className="h-7 w-7 hover:bg-background" aria-label="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-2 min-w-[100px] text-center">
                <span className="text-sm font-bold capitalize tracking-tight">
                  {viewMode === 'daily'
                    ? formatInTimeZone(currentDate, timezone, 'MMM yyyy', { locale: dateLocale })
                    : formatInTimeZone(currentDate, timezone, 'yyyy', { locale: dateLocale })
                  }
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleNext} className="h-7 w-7 hover:bg-background" aria-label="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Stats Group */}
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
              <span className="text-muted-foreground/40 hidden sm:inline">{viewMode === 'daily' ? 'Monthly' : 'Yearly'} stats:</span>
              <div className={cn(
                "px-1.5 py-0.5 rounded border shadow-sm flex items-center gap-1",
                isPositive ? "bg-long/10 border-long/20 text-long" : "bg-short/10 border-short/20 text-short"
              )}>
                {formatCompact(displayTotal)}
              </div>
              <div className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 border-dashed shadow-sm">
                {tradedDaysCount}d
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Stats Filter (Only for Monthly View) */}
            {viewMode === 'daily' && <StatsFilter />}

            <div className="flex items-center gap-1 bg-muted/20 rounded-lg p-0.5 border border-border/40">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleScreenshot}
                className="h-7 px-2 text-[11px] font-bold gap-1.5 hover:bg-primary/5 hover:text-primary transition-all"
              >
                <Camera className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Snapshot</span>
              </Button>
              <div className="w-px h-3 bg-border/40" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setScreenshotWithGradient(!screenshotWithGradient)}
                className={cn(
                  "h-7 w-7 transition-all",
                  screenshotWithGradient ? "text-primary bg-primary/10" : "text-muted-foreground/60"
                )}
                title={screenshotWithGradient ? "Gradient background: ON" : "Gradient background: OFF"}
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="w-px h-4 bg-border/40 mx-1" />

            {/* Combined View Switcher & Today - SWAPPED */}
            <div className="flex items-center gap-2">
              <div className="flex items-center p-1 bg-muted/40 border border-border/40 rounded-lg">
                <button
                  onClick={() => setViewMode('daily')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                    viewMode === 'daily'
                      ? "bg-background shadow-sm text-foreground border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Daily
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={cn(
                    "px-3 py-1 text-[11px] font-bold rounded-md transition-all",
                    viewMode === 'weekly'
                      ? "bg-background shadow-sm text-foreground border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Yearly
                </button>
              </div>

              <Button
                onClick={() => setCurrentDate(new Date())}
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-[11px] font-bold bg-muted/20 hover:bg-muted border-border/60 transition-colors"
                title="Go to Today"
              >
                <span className="sm:hidden text-xs">T</span>
                <span className="hidden sm:inline">Today</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden relative">
          {viewMode === 'daily' ? (
            <MonthlyView
              currentDate={currentDate}
              calendarData={localCalendarData}
              onSelectDate={setSelectedDate}
            />
          ) : (
            <YearlyView
              year={getYear(currentDate)}
              calendarData={localCalendarData}
            />
          )}
        </CardContent>

        <CalendarModal
          isOpen={selectedDate !== null}
          onOpenChange={(open) => !open && setSelectedDate(null)}
          selectedDate={selectedDate}
          dayData={selectedDate ? localCalendarData[format(selectedDate, 'yyyy-MM-dd')] : undefined}
          isLoading={isLoading}
        />
      </Card>
    </div>
  )
})

export default CalendarPnl