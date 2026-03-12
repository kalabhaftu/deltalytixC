'use client'

import { useState } from 'react'
import { 
    Calendar as CalendarIcon, 
    Funnel, 
    Wallet,
    CaretDown
} from '@phosphor-icons/react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'

interface ReportFiltersProps {
    accounts: any[]
    selectedAccountId: string | null
    onAccountChange: (id: string | null) => void
    dateRange: DateRange | undefined
    onDateRangeChange: (range: DateRange | undefined) => void
    onPresetSelect: (range: string) => void
}

export function ReportFilters({
    accounts,
    selectedAccountId,
    onAccountChange,
    dateRange,
    onDateRangeChange,
    onPresetSelect
}: ReportFiltersProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    return (
        <div className="flex flex-col md:flex-row items-center gap-3 bg-muted/10 p-2 rounded-2xl border border-border/40 mb-8 no-export">
            {/* Account Selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-r border-border/40">
                <Wallet weight="light" className="h-4 w-4 text-muted-foreground" />
                <Select
                    value={selectedAccountId || 'all'}
                    onValueChange={(val) => onAccountChange(val === 'all' ? null : val)}
                >
                    <SelectTrigger className="w-[180px] border-none bg-transparent hover:bg-muted/50 transition-colors h-8 text-[11px] font-black uppercase tracking-widest focus:ring-0">
                        <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-[10px] font-bold uppercase">All Accounts</SelectItem>
                        {accounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id} className="text-[10px] font-bold uppercase">
                                {acc.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Date Range Presets */}
            <div className="flex items-center p-1 bg-background/50 rounded-lg border border-border/20 gap-1">
                {['7D', '30D', '90D', 'YTD', 'ALL'].map(preset => (
                    <Button
                        key={preset}
                        variant="ghost"
                        size="sm"
                        onClick={() => onPresetSelect(preset)}
                        className="h-7 px-3 text-[9px] font-black tracking-widest hover:bg-primary/10 hover:text-primary transition-all"
                    >
                        {preset}
                    </Button>
                ))}
            </div>

            <div className="h-4 w-px bg-border/40 hidden md:block" />

            {/* Custom Date Picker */}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                            "h-9 flex items-center gap-2 border-border/40 bg-background hover:bg-muted/30 px-3",
                            !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon weight="light" className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>
                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                    </>
                                ) : (
                                    format(dateRange.from, "LLL dd, y")
                                )
                            ) : (
                                "Custom Duration"
                            )}
                        </span>
                        <CaretDown weight="bold" className="h-3 w-3 opacity-30" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-border/10 rounded-[24px] shadow-2xl" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={onDateRangeChange}
                        numberOfMonths={2}
                        className="p-3"
                    />
                </PopoverContent>
            </Popover>

            <div className="flex-1" />

            {/* Quick Filter Status Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10">
                <Funnel weight="fill" className="h-3 w-3 text-primary animate-pulse" />
                <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                    Live Analysis Active
                </span>
            </div>
        </div>
    )
}
