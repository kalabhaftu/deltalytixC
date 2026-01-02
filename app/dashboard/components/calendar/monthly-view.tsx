
'use client'

import React, { memo, useMemo } from "react"
import { format, isSameMonth, isToday, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth, addDays, getDay, isSameDay } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { cn, formatCurrency } from "@/lib/utils"
import { Notebook } from "lucide-react"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { useCalendarViewStore } from "@/store/calendar-view"
import { useUserStore } from "@/store/user-store"
import { useCalendarNotes } from "@/app/dashboard/hooks/use-calendar-notes"
import { calculateDailyStats } from "./calendar-utils"
import {
    DAY_CELL_STYLES,
    TODAY_STYLES,
    WEEKDAYS_FULL,
    PNL_TEXT_STYLES
} from "@/app/dashboard/constants/calendar-styles"

// Metric Item Component
const MetricItem = ({ label, value, className }: { label?: string, value: string | React.ReactNode, className?: string }) => (
    <div className={cn("flex items-center justify-between text-[10px] leading-tight w-full", className)}>
        {label && <span className="text-muted-foreground/70">{label}</span>}
        <span className="font-medium text-foreground">{value}</span>
    </div>
)

// Day Cell Component
const DayCell = memo(function DayCell({
    date,
    dayData,
    hasNotes,
    isCurrentMonth,
    timezone,
    onClick
}: {
    date: Date
    dayData: CalendarData[string] | undefined
    hasNotes: boolean
    isCurrentMonth: boolean
    timezone: string
    onClick: () => void
}) {
    const { visibleStats } = useCalendarViewStore()
    const isTodayDate = isToday(date)

    // Calculate daily stats on the fly
    const stats = useMemo(() => {
        if (!dayData?.trades || dayData.trades.length === 0) return null
        return calculateDailyStats(dayData.trades)
    }, [dayData])

    const hasTrades = !!stats

    return (
        <div
            className={cn(
                "relative min-h-[60px] md:min-h-[90px] flex flex-col p-1.5 md:p-2.5 rounded-lg border transition-all duration-200 cursor-pointer select-none group",

                // Base shadow/shimmer
                "shadow-sm hover:shadow-md",

                // Default Style (No Trades)
                "bg-card/40 border-border/40 hover:border-primary/30 hover:bg-muted/10",

                // Trading Day Styles (Refined TradeZella Palette)
                hasTrades && stats.isProfit && "bg-long/10 border-long/30 hover:bg-long/20 hover:border-long/50",
                hasTrades && stats.isLoss && "bg-short/10 border-short/30 hover:bg-short/20 hover:border-short/50",
                hasTrades && stats.isBreakEven && "bg-zinc-800/40 border-zinc-700/30 hover:bg-zinc-800/60 hover:border-zinc-700/50",

                // Not Current Month
                !isCurrentMonth && "opacity-20 grayscale hover:opacity-40",

                // Today Highlight
                isTodayDate && "border-primary/30",
            )}
            onClick={onClick}
        >
            {/* Header: Date + Icon (Left) | PnL (Right) */}
            <div className="flex justify-between items-start mb-2.5">
                <div className="flex items-center gap-1.5 min-w-0">
                    <span className={cn(
                        "text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-md transition-colors",
                        isTodayDate ? "border border-primary/50 text-primary" : "bg-zinc-800/80 text-zinc-300",
                    )}>
                        {format(date, 'd')}
                    </span>

                    {/* Notebook Icon (Outlined - Matching Secondary Metrics) */}
                    {hasNotes && (
                        <Notebook className="h-3.5 w-3.5 text-zinc-300" />
                    )}
                </div>

                {/* Net PnL - Positioned at bottom on mobile/tablet to avoid date collapse */}
                {(hasTrades && visibleStats.pnl) && (
                    <div className={cn(
                        "font-[900] tracking-tighter drop-shadow-md transition-all",
                        "absolute lg:relative bottom-1.5 right-1.5 lg:bottom-auto lg:right-auto lg:top-0",
                        "text-[10px] lg:text-[15px]",
                        stats.isProfit ? "text-long" : stats.isLoss ? "text-short" : "text-muted-foreground"
                    )}>
                        {formatCurrency(stats.pnl, 0)}
                    </div>
                )}
            </div>

            {/* Body: Vertical Stack of Metrics (Clean White/Gray) */}
            {hasTrades && (
                <div className="hidden md:flex flex-col gap-0.5 mt-auto">
                    {visibleStats.trades && (
                        <div className="text-[10px] font-semibold text-zinc-300/90 flex items-center gap-1">
                            <span>{stats.tradeCount}</span>
                            <span className="opacity-60 font-medium">trades</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-300/90">
                        {visibleStats.rMultiple && (
                            <span>
                                {stats.rMultiple.toFixed(2)}R
                            </span>
                        )}

                        {(visibleStats.rMultiple && visibleStats.winRate) && <span className="opacity-30">|</span>}

                        {visibleStats.winRate && (
                            <span>
                                {stats.winRate.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
})

export default function MonthlyView({
    currentDate,
    calendarData,
    onSelectDate
}: {
    currentDate: Date
    calendarData: CalendarData
    onSelectDate: (date: Date) => void
}) {
    const timezone = useUserStore(state => state.timezone)
    const { notes } = useCalendarNotes()

    // Memoize calendar grid generation
    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentDate))
        const end = endOfWeek(endOfMonth(currentDate))
        return eachDayOfInterval({ start, end })
    }, [currentDate])

    return (
        <div className="flex flex-col h-full bg-card/30">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 md:gap-3 mb-2 px-2 md:px-4 pt-4">
                {WEEKDAYS_FULL.map((day, i) => (
                    <div key={day} className="text-center text-[9px] md:text-[10px] font-bold text-muted-foreground tracking-widest uppercase opacity-60">
                        <span className="hidden md:inline">{day}</span>
                        <span className="md:hidden">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}
                        </span>
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-3 flex-1 p-2 md:p-4 pt-0 overflow-y-auto min-h-0">
                {calendarDays.map((date) => {
                    const dateKey = format(date, 'yyyy-MM-dd')
                    const dayData = calendarData[dateKey]
                    const isCurrentMonth = isSameMonth(date, currentDate)
                    const hasNotes = !!notes[dateKey]

                    return (
                        <DayCell
                            key={date.toISOString()}
                            date={date}
                            dayData={dayData}
                            hasNotes={hasNotes}
                            isCurrentMonth={isCurrentMonth}
                            timezone={timezone}
                            onClick={() => onSelectDate(date)}
                        />
                    )
                })}
            </div>
        </div>
    )
}
