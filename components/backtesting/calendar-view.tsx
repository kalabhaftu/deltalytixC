'use client'

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, Settings, Camera, HelpCircle, Download, Palette, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addDays } from "date-fns"
import { BacktestingCalendarData } from "@/types/backtesting"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import html2canvas from 'html2canvas'

interface CalendarViewProps {
  calendarData: BacktestingCalendarData
  monthlyStats?: {
    totalPnl: number
    totalDays: number
  }
  className?: string
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

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
  const absValue = Math.abs(value)
  if (absValue >= 1000) {
    return `${value < 0 ? '-' : ''}$${(absValue / 1000).toFixed(1)}K`
  }
  return `${value < 0 ? '-' : ''}$${absValue.toFixed(0)}`
}

export function CalendarView({ calendarData, monthlyStats, className }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showWeeklyStats, setShowWeeklyStats] = useState(true)
  const [colorScheme, setColorScheme] = useState<'default' | 'high-contrast' | 'minimal'>('default')
  const [showTradeCounts, setShowTradeCounts] = useState(true)
  const [showWinRates, setShowWinRates] = useState(true)
  const [screenshotScope, setScreenshotScope] = useState<'calendar' | 'page'>('calendar')

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = getCalendarDays(monthStart, monthEnd)

  const goToPreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1))
  }

  const goToCurrentMonth = () => {
    setCurrentDate(new Date())
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    const dateString = format(date, 'yyyy-MM-dd')
    const dayData = calendarData[dateString]

    if (dayData && dayData.trades > 0) {
      toast.success(`Selected ${format(date, 'MMM d, yyyy')}`, {
        description: `${dayData.trades} trade${dayData.trades !== 1 ? 's' : ''} • P&L: ${formatCurrency(dayData.pnl)} • Win Rate: ${dayData.winRate.toFixed(1)}%`,
        duration: 3000,
      })
    } else {
      toast.info(`Selected ${format(date, 'MMM d, yyyy')}`, {
        description: "No trading activity on this day",
        duration: 2000,
      })
    }
  }

  const handleSaveSettings = () => {
    setIsSettingsOpen(false)
    toast.success("Settings saved!", {
      description: "Calendar preferences have been updated successfully.",
      duration: 3000,
    })
  }

  const handleScreenshot = async () => {
    try {
      let elementToCapture: HTMLElement
      let filename: string
      let description: string

      if (screenshotScope === 'page') {
        // Capture the entire page
        elementToCapture = document.documentElement
        filename = `trading-dashboard-${format(currentDate, 'yyyy-MM')}.png`
        description = `Full trading dashboard for ${format(currentDate, 'MMMM yyyy')} has been downloaded.`
      } else {
        // Capture just the calendar
        elementToCapture = document.querySelector('[data-calendar="calendar-view"]') as HTMLElement
        if (!elementToCapture) {
          toast.error("Screenshot failed", {
            description: "Could not find calendar element to capture.",
            duration: 4000,
          })
          return
        }
        filename = `trading-calendar-${format(currentDate, 'yyyy-MM')}.png`
        description = `Trading calendar for ${format(currentDate, 'MMMM yyyy')} has been downloaded.`
      }

      // Show loading toast
      toast.loading("Taking screenshot...", {
        description: "Please wait while we capture the content.",
        duration: 3000,
      })

      // Use html2canvas to capture the element
      const canvas = await html2canvas(elementToCapture, {
        backgroundColor: '#0a0a0a', // Match your dark theme
        scale: 2, // Higher quality (2x resolution)
        useCORS: true,
        allowTaint: true,
        width: elementToCapture.scrollWidth,
        height: elementToCapture.scrollHeight,
        scrollX: screenshotScope === 'page' ? 0 : -elementToCapture.getBoundingClientRect().left,
        scrollY: screenshotScope === 'page' ? -window.scrollY : -elementToCapture.getBoundingClientRect().top,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        logging: false, // Disable console logs
        ignoreElements: (element) => {
          // Ignore toast notifications and other overlay elements
          return element.id === 'sonner-toaster' || element.classList.contains('fixed') && element.classList.contains('z-[100]')
        }
      })

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          // Create download link
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = filename

          // Trigger download
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          // Clean up
          URL.revokeObjectURL(url)

          toast.success("Screenshot saved!", {
            description: description,
            duration: 4000,
          })
        } else {
          throw new Error('Failed to create image blob')
        }
      }, 'image/png', 1.0)

    } catch (error) {
      console.error('Screenshot failed:', error)
      toast.error("Screenshot failed", {
        description: screenshotScope === 'page'
          ? "Could not capture dashboard screenshot. Please try again."
          : "Could not capture calendar screenshot. Please try again.",
        duration: 4000,
      })
    }
  }

  const getColorClasses = (pnl: number, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return "bg-card border-border opacity-50"

    if (colorScheme === 'high-contrast') {
      return pnl > 0
        ? "bg-green-600 border-green-700 text-white"
        : pnl < 0
          ? "bg-red-600 border-red-700 text-white"
          : "bg-gray-600 border-gray-700 text-white"
    }

    if (colorScheme === 'minimal') {
      return pnl > 0
        ? "bg-green-100 dark:bg-green-950 border-green-300 dark:border-green-800"
        : pnl < 0
          ? "bg-red-100 dark:bg-red-950 border-red-300 dark:border-red-800"
          : "bg-card border-border"
    }

    // Default color scheme
    return pnl >= 0
      ? "bg-green-50/80 dark:bg-green-950/40 border-green-200 dark:border-green-900/50"
      : "bg-red-50/60 dark:bg-red-950/30 border-red-200/80 dark:border-red-900/40"
  }

  // Calculate weekly stats
  const weeks = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    const weekDays = calendarDays.slice(i, i + 7)
    const weekPnl = weekDays.reduce((sum, day) => {
      const dateString = format(day, 'yyyy-MM-dd')
      const dayData = calendarData[dateString]
      return sum + (dayData?.pnl || 0)
    }, 0)
    
    const weekTradingDays = weekDays.filter(day => {
      const dateString = format(day, 'yyyy-MM-dd')
      return calendarData[dateString]?.trades > 0
    }).length

    weeks.push({
      weekNumber: Math.floor(i / 7) + 1,
      pnl: weekPnl,
      tradingDays: weekTradingDays
    })
  }

  return (
    <Card className={cn("h-full flex flex-col", className)} data-calendar="calendar-view">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={goToCurrentMonth}
              className="text-xs"
            >
              This month
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            {monthlyStats && (
              <div className="flex items-center gap-4 mr-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Monthly stats:</span>
                  <span className={cn(
                    "ml-2 font-semibold",
                    monthlyStats.totalPnl >= 0 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-destructive"
                  )}>
                    {formatCurrency(monthlyStats.totalPnl)}
                  </span>
                  <span className="text-muted-foreground ml-2">
                    {monthlyStats.totalDays} days
                  </span>
                </div>
              </div>
            )}
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToPreviousMonth}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={goToNextMonth}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Calendar Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="color-scheme" className="text-right">
                      Color Scheme
                    </Label>
                    <Select value={colorScheme} onValueChange={(value: any) => setColorScheme(value)}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="high-contrast">High Contrast</SelectItem>
                        <SelectItem value="minimal">Minimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="show-weekly" className="text-right">
                      Weekly Stats
                    </Label>
                    <Switch
                      id="show-weekly"
                      checked={showWeeklyStats}
                      onCheckedChange={setShowWeeklyStats}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="show-trades" className="text-right">
                      Trade Counts
                    </Label>
                    <Switch
                      id="show-trades"
                      checked={showTradeCounts}
                      onCheckedChange={setShowTradeCounts}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="show-winrates" className="text-right">
                      Win Rates
                    </Label>
                    <Switch
                      id="show-winrates"
                      checked={showWinRates}
                      onCheckedChange={setShowWinRates}
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="screenshot-scope" className="text-right">
                      Screenshot
                    </Label>
                    <Select value={screenshotScope} onValueChange={(value: any) => setScreenshotScope(value)}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="calendar">Calendar Only</SelectItem>
                        <SelectItem value="page">Full Page</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveSettings}>Save Settings</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleScreenshot}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={5}>
                {screenshotScope === 'calendar' ? 'Take a screenshot of the calendar' : 'Take a screenshot of the full dashboard'}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={5} className="max-w-[300px]">
                Monthly calendar view showing daily trading performance. Green days indicate profits, red days indicate losses. 
                Weekly summaries on the right show total P&L and trading days for each week.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-4 min-h-0 flex">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
            {calendarDays.map((date) => {
              const dateString = format(date, 'yyyy-MM-dd')
              const dayData = calendarData[dateString]
              const isCurrentMonth = isSameMonth(date, currentDate)
              const isCurrentDay = isToday(date)

              return (
                <div
                  key={dateString}
                  onClick={() => handleDayClick(date)}
                  className={cn(
                    "flex flex-col p-2 rounded-md border cursor-pointer transition-all duration-200",
                    "hover:border-primary hover:shadow-sm hover:scale-[1.02]",
                    getColorClasses(dayData?.pnl || 0, isCurrentMonth),
                    !isCurrentMonth && "opacity-50",
                    isCurrentDay && "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500/20",
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={cn(
                      "text-xs font-medium",
                      isCurrentDay && "text-primary font-semibold",
                      !isCurrentMonth && "opacity-50"
                    )}>
                      {format(date, 'd')}
                    </span>
                  </div>

                  {dayData && (
                    <div className="flex-1 flex flex-col justify-between min-h-0">
                      <div className={cn(
                        "text-xs font-bold font-mono",
                        dayData.pnl >= 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-destructive"
                      )}>
                        {formatCurrency(dayData.pnl)}
                      </div>
                      {showTradeCounts && (
                        <div className="text-xs text-muted-foreground">
                          {dayData.trades} trade{dayData.trades !== 1 ? 's' : ''}
                        </div>
                      )}
                      {showWinRates && (
                        <div className="text-xs text-muted-foreground">
                          {dayData.winRate.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        
        {/* Weekly stats sidebar */}
        {showWeeklyStats && (
          <div className="ml-4 w-24 flex flex-col gap-1">
            {weeks.map((week) => (
              <div
                key={week.weekNumber}
                className="flex flex-col items-center p-3 rounded-md bg-card border text-center h-20"
              >
                <div className="text-xs text-muted-foreground mb-1">
                  Week {week.weekNumber}
                </div>
                <div className={cn(
                  "text-sm font-bold font-mono",
                  week.pnl >= 0
                    ? "text-green-400"
                    : "text-red-400"
                )}>
                  {formatCurrency(week.pnl)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {week.tradingDays} days
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
