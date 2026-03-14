'use client'

import { useState } from 'react'
import { 
    Calendar as CalendarIcon, 
    Funnel, 
    Wallet,
    CaretDown,
    Hash,
    Clock,
    CheckCircle,
    Target,
    WarningCircle
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
import { CustomDateRangePicker, DateRange } from '@/components/ui/custom-date-range-picker'

interface ReportFiltersProps {
    accounts: any[]
    selectedAccountId: string | null
    onAccountChange: (id: string | null) => void
    dateRange: DateRange | undefined
    onDateRangeChange: (range: DateRange | undefined) => void
    onPresetSelect: (range: string) => void
    // Advanced Filters
    filters: {
        symbol: string
        session: string
        outcome: string
        strategy: string
        ruleBroken: string
    }
    options: {
        symbols: string[]
        sessions: string[]
        outcomes: { value: string; label: string }[]
        strategies: { id: string; name: string }[]
    }
    onFilterChange: (key: string, value: string) => void
}

export function ReportFilters({
    accounts,
    selectedAccountId,
    onAccountChange,
    dateRange,
    onDateRangeChange,
    onPresetSelect,
    filters,
    options,
    onFilterChange
}: ReportFiltersProps) {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)

    return (
        <div className="flex flex-col space-y-4 mb-8 no-export">
            <div className="flex flex-col md:flex-row items-center gap-3 bg-muted/10 p-2 rounded-2xl border border-border/40">
                {/* Account Selector */}
                <div className="flex items-center gap-2 px-3 py-1.5 border-r border-border/40">
                    <Wallet weight="light" className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-0.5">Account</span>
                        <Select
                            value={selectedAccountId || 'all'}
                            onValueChange={(val) => onAccountChange(val === 'all' ? null : val)}
                        >
                            <SelectTrigger className="w-[160px] border-none bg-transparent hover:bg-muted/50 transition-colors h-7 p-0 text-[10px] font-black uppercase tracking-widest focus:ring-0">
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
                                "h-9 flex flex-col items-start gap-0.5 border-border/40 bg-background hover:bg-muted/30 px-3 min-w-[180px]",
                                !dateRange && "text-muted-foreground"
                            )}
                        >
                            <div className="flex items-center gap-1.5">
                                <CalendarIcon weight="light" className="h-3 w-3" />
                                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Duration</span>
                            </div>
                            <div className="flex items-center gap-2 w-full justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                            <>
                                                {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        "Custom Range"
                                    )}
                                </span>
                                <CaretDown weight="bold" className="h-2 w-2 opacity-30" />
                            </div>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 border-border/10 rounded-[24px] shadow-lg" align="end">
                        <CustomDateRangePicker
                            selected={dateRange}
                            onSelect={(range) => {
                                onDateRangeChange(range)
                                if (range?.from && range?.to) {
                                    setIsCalendarOpen(false)
                                }
                            }}
                            className="border-none shadow-none"
                        />
                    </PopoverContent>
                </Popover>

                <div className="flex-1" />

                {/* Quick Filter Status Indicator */}
                <div className="hidden xl:flex items-center gap-2 px-4 py-1.5 bg-primary/5 rounded-full border border-primary/10">
                    <Funnel weight="fill" className="h-3 w-3 text-primary animate-pulse" />
                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                        Live Analysis Active
                    </span>
                </div>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                {/* Symbol */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex items-center gap-1 px-1">
                        <Hash weight="light" className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.1em]">Symbol</span>
                    </div>
                    <Select value={filters.symbol} onValueChange={(v) => onFilterChange('symbol', v)}>
                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase tracking-widest border-border/20 bg-background/50 hover:bg-muted/30 transition-colors">
                            <SelectValue placeholder="All Symbols" />
                        </SelectTrigger>
                        <SelectContent className="border-border/10 rounded-xl">
                            <SelectItem value="all" className="text-[10px] font-bold uppercase">All Symbols</SelectItem>
                            {options.symbols.map(s => (
                                <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Session */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex items-center gap-1 px-1">
                        <Clock weight="light" className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.1em]">Session</span>
                    </div>
                    <Select value={filters.session} onValueChange={(v) => onFilterChange('session', v)}>
                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase tracking-widest border-border/20 bg-background/50 hover:bg-muted/30 transition-colors">
                            <SelectValue placeholder="All Sessions" />
                        </SelectTrigger>
                        <SelectContent className="border-border/10 rounded-xl">
                            <SelectItem value="all" className="text-[10px] font-bold uppercase">All Sessions</SelectItem>
                            {options.sessions.map(s => (
                                <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">{s}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Outcome */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex items-center gap-1 px-1">
                        <CheckCircle weight="light" className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.1em]">Outcome</span>
                    </div>
                    <Select value={filters.outcome} onValueChange={(v) => onFilterChange('outcome', v)}>
                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase tracking-widest border-border/20 bg-background/50 hover:bg-muted/30 transition-colors">
                            <SelectValue placeholder="All Outcomes" />
                        </SelectTrigger>
                        <SelectContent className="border-border/10 rounded-xl">
                            <SelectItem value="all" className="text-[10px] font-bold uppercase">All Outcomes</SelectItem>
                            {options.outcomes.map(o => (
                                <SelectItem key={o.value} value={o.value} className="text-[10px] font-bold uppercase">{o.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Strategy */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex items-center gap-1 px-1">
                        <Target weight="light" className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.1em]">Strategy</span>
                    </div>
                    <Select value={filters.strategy} onValueChange={(v) => onFilterChange('strategy', v)}>
                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase tracking-widest border-border/20 bg-background/50 hover:bg-muted/30 transition-colors">
                            <SelectValue placeholder="All Strategies" />
                        </SelectTrigger>
                        <SelectContent className="border-border/10 rounded-xl">
                            <SelectItem value="all" className="text-[10px] font-bold uppercase">All Systems</SelectItem>
                            {options.strategies.map(s => (
                                <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase">{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Rule Broken */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <div className="flex items-center gap-1 px-1">
                        <WarningCircle weight="light" className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.1em]">Rule Status</span>
                    </div>
                    <Select value={filters.ruleBroken} onValueChange={(v) => onFilterChange('ruleBroken', v)}>
                        <SelectTrigger className="h-8 text-[10px] font-bold uppercase tracking-widest border-border/20 bg-background/50 hover:bg-muted/30 transition-colors">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="border-border/10 rounded-xl">
                            <SelectItem value="all" className="text-[10px] font-bold uppercase">Rule Status</SelectItem>
                            <SelectItem value="broken" className="text-[10px] font-bold uppercase text-short">Broken</SelectItem>
                            <SelectItem value="followed" className="text-[10px] font-bold uppercase text-long">Followed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    )
}
