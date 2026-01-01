'use client'

import React, { useMemo } from "react"
import { format, eachWeekOfInterval, getWeek, getMonth, getYear, addDays, startOfYear, endOfYear } from "date-fns"
import { enUS } from 'date-fns/locale'
import { cn } from "@/lib/utils"
import { Trade } from "@prisma/client"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useUserStore } from "@/store/user-store"
import { WEEKLY_CELL_STYLES, PNL_TEXT_STYLES, METRIC_PILL_STYLES } from "@/app/dashboard/constants/calendar-styles"
import { TrendingUp, TrendingDown } from "lucide-react"

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
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value.toFixed(0)}`
}

interface WeeklyCalendarPnlProps {
  calendarData: CalendarData;
  year: number;
}

export default function WeeklyCalendarPnl({ calendarData, year }: WeeklyCalendarPnlProps) {
  const dateLocale = enUS

  const yearStartDate = startOfYear(new Date(year, 0, 1))
  const yearEndDate = endOfYear(new Date(year, 0, 1))

  const weeksToDisplay = useMemo(() =>
    eachWeekOfInterval(
      { start: yearStartDate, end: yearEndDate },
      { weekStartsOn: 0 }
    ), [yearStartDate, yearEndDate])

  const getWeekPnl = (weekStart: Date) => {
    let total = 0
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + d)
      const key = format(day, 'yyyy-MM-dd', { locale: dateLocale })
      if (calendarData[key]) total += calendarData[key].pnl
    }
    return total
  }

  const getWeekTrades = (weekStart: Date) => {
    const tradesByDay: { [key: string]: { trades: Trade[], pnl: number } } = {}
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart)
      day.setDate(day.getDate() + d)
      const key = format(day, 'yyyy-MM-dd', { locale: dateLocale })
      if (calendarData[key]) {
        tradesByDay[key] = {
          trades: calendarData[key].trades,
          pnl: calendarData[key].pnl
        }
      }
    }
    return tradesByDay
  }

  const getMonthPnl = (monthIndex: number) => {
    let total = 0
    const currentMonthWeeks = weeksToDisplay.filter(weekStart => {
      const weekYear = getYear(weekStart)
      if (weekYear === year) {
        return getMonth(weekStart) === monthIndex
      } else {
        return monthIndex === 0
      }
    })
    currentMonthWeeks.forEach(weekStart => {
      total += getWeekPnl(weekStart)
    })
    return total
  }

  const getMonthWeeks = (monthIndex: number) => {
    return weeksToDisplay.filter(weekStart => {
      const weekYear = getYear(weekStart)
      if (weekYear === year) {
        return getMonth(weekStart) === monthIndex
      } else {
        return monthIndex === 0
      }
    })
  }

  const maxWeeks = Math.max(...Array.from({ length: 12 }, (_, i) => getMonthWeeks(i).length))

  return (
    <div className="flex flex-col gap-4 p-2 h-full">
      {/* Month Headers */}
      <div className="grid grid-cols-12 gap-2">
        {Array.from({ length: 12 }, (_, i) => {
          const monthlyPnl = getMonthPnl(i)
          const isPositive = monthlyPnl >= 0
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {format(new Date(year, i, 1), 'MMM', { locale: dateLocale })}
              </span>
              <div className={cn(
                "text-xs font-bold px-2 py-0.5 rounded-full",
                monthlyPnl === 0 && "text-muted-foreground bg-muted/50",
                monthlyPnl !== 0 && isPositive && "text-long bg-long/10",
                monthlyPnl !== 0 && !isPositive && "text-short bg-short/10",
              )}>
                {formatCompact(monthlyPnl)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Weeks Grid */}
      <div className="grid grid-cols-12 gap-2 flex-1">
        {Array.from({ length: 12 }, (_, monthIndex) => {
          const monthWeeks = getMonthWeeks(monthIndex)

          const allWeeks: (Date | null)[] = [...monthWeeks]
          while (allWeeks.length < maxWeeks) {
            allWeeks.push(null)
          }

          return (
            <div key={monthIndex} className="flex flex-col gap-2">
              {allWeeks.map((weekStart, weekIndex) => {
                if (!weekStart) {
                  return (
                    <div
                      key={weekIndex}
                      className="flex-1 min-h-[52px] rounded-lg bg-muted/10 border border-dashed border-border/30"
                    />
                  )
                }

                const pnl = getWeekPnl(weekStart)
                const trades = getWeekTrades(weekStart)
                const state = pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : 'flat'

                return (
                  <Popover key={`${weekStart.toISOString()}-${weekIndex}`}>
                    <PopoverTrigger asChild>
                      <div
                        className={cn(
                          "flex-1 min-h-[52px] flex flex-col items-center justify-center rounded-lg cursor-pointer p-1.5",
                          "border transition-all duration-200 hover:scale-[1.02] hover:shadow-md",
                          state === 'profit' && WEEKLY_CELL_STYLES.profit,
                          state === 'loss' && WEEKLY_CELL_STYLES.loss,
                          state === 'flat' && WEEKLY_CELL_STYLES.flat,
                        )}
                      >
                        <span className="text-[10px] font-medium text-muted-foreground/80">
                          W{getWeek(weekStart, { locale: dateLocale })}
                        </span>
                        <span className={cn(
                          "text-xs font-bold",
                          state === 'profit' && PNL_TEXT_STYLES.profit,
                          state === 'loss' && PNL_TEXT_STYLES.loss,
                          state === 'flat' && PNL_TEXT_STYLES.neutral,
                        )}>
                          {formatCompact(pnl)}
                        </span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[380px] p-0 rounded-xl overflow-hidden"
                      align="start"
                      side="right"
                      sideOffset={8}
                    >
                      {/* Popover Header */}
                      <div className="p-4 border-b bg-muted/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm">
                              {format(weekStart, 'MMM d', { locale: dateLocale })} - {format(addDays(weekStart, 6), 'MMM d, yyyy', { locale: dateLocale })}
                            </h4>
                            <p className="text-xs text-muted-foreground">Week {getWeek(weekStart)}</p>
                          </div>
                          <div className={cn(
                            METRIC_PILL_STYLES.base,
                            "text-xs",
                            pnl >= 0 ? METRIC_PILL_STYLES.profit : METRIC_PILL_STYLES.loss
                          )}>
                            {pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {formatCurrency(pnl)}
                          </div>
                        </div>
                      </div>

                      {/* Popover Content */}
                      <div className="max-h-[350px] overflow-y-auto">
                        {Object.entries(trades).length > 0 ? (
                          <Accordion type="single" collapsible className="w-full">
                            {Object.entries(trades).map(([date, { trades: dayTrades, pnl: dayPnl }]) => (
                              <AccordionItem key={date} value={date} className="border-b last:border-0">
                                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20">
                                  <div className="flex items-center justify-between w-full pr-2">
                                    <div className="flex flex-col items-start">
                                      <span className="text-sm font-medium">
                                        {format(new Date(date), 'EEEE, MMM d', { locale: dateLocale })}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {dayTrades.length} {dayTrades.length === 1 ? 'trade' : 'trades'}
                                      </span>
                                    </div>
                                    <span className={cn(
                                      "text-sm font-semibold",
                                      dayPnl >= 0 ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss
                                    )}>
                                      {formatCurrency(dayPnl)}
                                    </span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  <div className="space-y-2 px-4 pb-3">
                                    {dayTrades.map((trade, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30"
                                      >
                                        <div className="flex flex-col">
                                          <span className="text-sm font-medium">{trade.instrument}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {format(new Date(trade.entryDate), 'HH:mm', { locale: dateLocale })}
                                          </span>
                                        </div>
                                        <span className={cn(
                                          "text-sm font-semibold",
                                          trade.pnl >= 0 ? PNL_TEXT_STYLES.profit : PNL_TEXT_STYLES.loss
                                        )}>
                                          {formatCurrency(trade.pnl)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        ) : (
                          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            No trades this week
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}