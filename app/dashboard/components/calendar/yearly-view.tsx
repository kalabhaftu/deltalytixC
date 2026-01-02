
'use client'

import React, { useMemo } from "react"
import { format, eachMonthOfInterval, startOfYear, endOfYear, getMonth, getYear, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, startOfMonth, endOfMonth, getDay } from "date-fns"
import { enUS } from 'date-fns/locale'
import { cn, formatCurrency, BREAK_EVEN_THRESHOLD } from "@/lib/utils"
import { CalendarData } from "@/app/dashboard/types/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useUserStore } from "@/store/user-store"
import { formatInTimeZone } from "date-fns-tz"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Mini Month Component
function MiniMonth({
    monthDate,
    calendarData,
    timezone,
    year
}: {
    monthDate: Date
    calendarData: CalendarData
    timezone: string
    year: number
}) {
    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(monthDate))
        const end = endOfWeek(endOfMonth(monthDate))
        return eachDayOfInterval({ start, end })
    }, [monthDate])

    // Calculate Month Stats
    const stats = useMemo(() => {
        let pnl = 0
        let trades = 0
        Object.entries(calendarData).forEach(([key, data]) => {
            const [kYear, kMonth] = key.split('-').map(Number)
            if (kYear === year && (kMonth - 1) === getMonth(monthDate)) {
                pnl += data.pnl
                trades += data.tradeNumber
            }
        })
        return { pnl, trades }
    }, [calendarData, monthDate, year])

    // Calculate days for the grid
    const gridDays = useMemo(() => {
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)
        const startDay = getDay(monthStart) // 0 (Sun) to 6 (Sat)

        const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

        // Return both placeholders and actual days
        return [
            ...Array(startDay).fill(null),
            ...days
        ]
    }, [monthDate])

    return (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border/40 bg-card/20 hover:bg-card/40 transition-colors group">
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="text-sm font-semibold tracking-tight">{format(monthDate, 'MMMM')}</span>

                {stats.trades > 0 && (
                    <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-[3px]",
                        stats.pnl > BREAK_EVEN_THRESHOLD ? "bg-long/10 text-long" :
                            stats.pnl < -BREAK_EVEN_THRESHOLD ? "bg-short/10 text-short" :
                                "bg-muted text-muted-foreground"
                    )}>
                        {formatCurrency(stats.pnl, 0)}
                    </span>
                )}
            </div>

            {/* Mini Grid */}
            <TooltipProvider>
                <div className={cn(
                    "grid grid-cols-7 gap-1",
                    stats.trades === 0 && "opacity-20"
                )}>
                    {gridDays.map((day, i) => {
                        if (!day) return <div key={`empty-${i}`} className="aspect-square w-full" />

                        const key = format(day, 'yyyy-MM-dd')
                        const data = calendarData[key]
                        const hasPt = data && data.tradeNumber > 0

                        let color = "bg-muted/10"
                        if (hasPt) {
                            if (data.pnl > BREAK_EVEN_THRESHOLD) color = "bg-long"
                            else if (data.pnl < -BREAK_EVEN_THRESHOLD) color = "bg-short"
                            else color = "bg-muted-foreground"
                        }

                        return (
                            <Tooltip key={key}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={cn(
                                            "aspect-square w-full rounded-sm transition-colors",
                                            color
                                        )}
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-[10px] py-1 px-2">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-bold">{format(day, 'MMM d, yyyy')}</span>
                                        <span className={cn(
                                            "font-mono",
                                            data?.pnl > BREAK_EVEN_THRESHOLD ? "text-long" : data?.pnl < -BREAK_EVEN_THRESHOLD ? "text-short" : "text-muted-foreground"
                                        )}>
                                            {data ? formatCurrency(data.pnl) : '$0.00'}
                                        </span>
                                    </div>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </div>
            </TooltipProvider>
        </div>
    )
}

export default function YearlyView({
    year,
    calendarData
}: {
    year: number
    calendarData: CalendarData
}) {
    const timezone = useUserStore(state => state.timezone)
    const months = useMemo(() => eachMonthOfInterval({
        start: startOfYear(new Date(year, 0, 1)),
        end: endOfYear(new Date(year, 0, 1))
    }), [year])

    return (
        <div className="h-full overflow-y-auto p-2 md:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                {months.map(month => (
                    <MiniMonth
                        key={month.toISOString()}
                        monthDate={month}
                        calendarData={calendarData}
                        timezone={timezone}
                        year={year}
                    />
                ))}
            </div>
        </div>
    )
}
