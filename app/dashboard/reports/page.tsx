'use client'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useData } from '@/context/data-provider'
import { formatTimeInZone } from '@/lib/time-utils'
import { classifyTrade, cn } from '@/lib/utils'
import {
    ChartBar,
    Lightning,
    ShareNetwork,
    Target,
    TrendUp
} from '@phosphor-icons/react'
import {
    format,
    startOfYear,
    subDays,
    subMonths,
    endOfDay
} from 'date-fns'
import { motion } from 'framer-motion'
import html2canvas from 'html2canvas'
import { useState } from 'react'
import { DateRange } from '@/components/ui/custom-date-range-picker'
import { toast } from 'sonner'
import { ReportFilters } from './components/report-filters'
import { useReportStats } from '@/hooks/use-report-stats'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import { DiverseCharts } from './components/diverse-charts'
import { PerformanceCard } from './components/performance-card'

// Dense Metric Block component
function MetricBlock({
    label,
    value,
    subValue,
    color = 'neutral',
    info,
    className
}: {
    label: string
    value: string | number
    subValue?: string | React.ReactNode
    color?: 'long' | 'short' | 'neutral' | 'info'
    info?: string
    className?: string
}) {
    const colorClasses = {
        long: 'text-long',
        short: 'text-short',
        info: 'text-primary',
        neutral: 'text-foreground'
    }

    return (
        <div className={cn("space-y-1", className)}>
            <p className="text-[8px] uppercase font-black text-muted-foreground/60 tracking-widest">{label}</p>
            <p className={cn("text-lg font-black font-mono tracking-tighter", colorClasses[color])}>
                {value}
            </p>
            {subValue && (
                <p className="text-[9px] text-muted-foreground/40 font-medium">{subValue}</p>
            )}
        </div>
    )
}

// Session Block for session metrics tab
function SessionBlock({
    name,
    range,
    trades,
    wins,
    pnl,
    totalHoldMs,
    peak,
    maxDD
}: {
    name: string
    range: string
    trades: number
    wins: number
    pnl: number
    totalHoldMs: number
    peak: number
    maxDD: number
}) {
    const winRate = trades > 0 ? ((wins / trades) * 100).toFixed(1) : '0.0'
    const avgHoldMs = trades > 0 ? totalHoldMs / trades : 0
    const h = Math.floor(avgHoldMs / (1000 * 60 * 60))
    const m = Math.floor((avgHoldMs % (1000 * 60 * 60)) / (1000 * 60))

    return (
        <div className={cn(
            "p-5 rounded-2xl border bg-card/50 space-y-3",
            trades === 0 ? "opacity-40" : "border-border/40"
        )}>
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest">{name}</h3>
                    <p className="text-[8px] font-bold text-muted-foreground/50 tracking-wider mt-0.5">{range}</p>
                </div>
                <div className={cn("text-lg font-black font-mono", pnl >= 0 ? "text-long" : "text-short")}>
                    ${pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div>
                    <p className="text-[8px] uppercase font-black text-muted-foreground/40 mb-1">Trades</p>
                    <p className="text-lg font-black font-mono">{trades}</p>
                </div>
                <div>
                    <p className="text-[8px] uppercase font-black text-muted-foreground/40 mb-1">Win Rate</p>
                    <p className="text-lg font-black font-mono">{winRate}%</p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border/20">
                <div className="text-center">
                    <p className="text-[7px] uppercase font-bold text-muted-foreground/50 mb-0.5">Trades</p>
                    <p className="text-[10px] font-black">{trades}</p>
                </div>
                <div className="text-center border-x border-border/10">
                    <p className="text-[7px] uppercase font-bold text-muted-foreground/50 mb-0.5">Avg Hold</p>
                    <p className="text-[10px] font-black">{h}h {m}m</p>
                </div>
                <div className="text-center">
                    <p className="text-[7px] uppercase font-bold text-muted-foreground/50 mb-0.5">Max DD</p>
                    <p className="text-[10px] font-black">${maxDD.toFixed(0)}</p>
                </div>
            </div>
        </div>
    )
}

export default function ReportsPage() {
    const { accounts } = useData()
    
    // Filter State
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 90),
        to: new Date()
    })
    const [selectedTab, setSelectedTab] = useState('overview')
    const [isExporting, setIsExporting] = useState(false)

    // Advanced Filters State
    const [advancedFilters, setAdvancedFilters] = useState({
        symbol: 'all',
        session: 'all',
        outcome: 'all',
        strategy: 'all',
        ruleBroken: 'all'
    })

    // SERVER-SIDE: Use React Query hook instead of client-side fetching + useMemo
    const { data: reportData, isLoading } = useReportStats({
        accountId: selectedAccountId || undefined,
        dateFrom: dateRange?.from?.toISOString(),
        dateTo: dateRange?.to?.toISOString(),
        symbol: advancedFilters.symbol !== 'all' ? advancedFilters.symbol : undefined,
        session: advancedFilters.session !== 'all' ? advancedFilters.session : undefined,
        outcome: advancedFilters.outcome !== 'all' ? advancedFilters.outcome : undefined,
        strategy: advancedFilters.strategy !== 'all' ? advancedFilters.strategy : undefined,
        ruleBroken: advancedFilters.ruleBroken !== 'all' ? advancedFilters.ruleBroken : undefined,
    })

    // Extract server-computed data
    const tradingActivity = reportData?.tradingActivity ?? null
    const psychMetrics = reportData?.psychMetrics ?? null
    const sessionPerformance = reportData?.sessionPerformance ?? null
    const rMultipleDistribution = reportData?.rMultipleDistribution ?? null
    const filteredTrades = reportData?.filteredTrades ?? []
    const filterOptions = reportData?.filterOptions ?? {
        symbols: [],
        sessions: [],
        outcomes: [],
        strategies: []
    }

    const handlePresetSelect = (preset: string) => {
        const today = new Date()
        switch (preset) {
            case '7D':
                setDateRange({ from: subDays(today, 7), to: today })
                break
            case '30D':
                setDateRange({ from: subDays(today, 30), to: today })
                break
            case '90D':
                setDateRange({ from: subMonths(today, 3), to: today })
                break
            case 'YTD':
                setDateRange({ from: startOfYear(today), to: today })
                break
            case 'ALL':
                setDateRange({ from: new Date(2000, 0, 1), to: today })
                break
        }
    }

    const handleDownloadReport = async () => {
        const element = document.getElementById('report-content')
        if (!element) return

        setIsExporting(true)
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: 'hsl(var(--background))',
                useCORS: true,
                onclone: (clonedDoc) => {
                    const clonedContent = clonedDoc.getElementById('report-content') as HTMLElement
                    if (clonedContent) {
                        clonedContent.style.padding = '40px'
                        clonedContent.style.background = 'hsl(var(--background))'
                        clonedContent.style.borderRadius = '0px'
                    }
                },
                ignoreElements: (element) => element.classList.contains('no-export')
            })

            const link = document.createElement('a')
            link.download = `deltalytix-report-${new Date().getTime()}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()

            toast.success('Report downloaded successfully!')
        } catch (error) {
            console.error('Download failed:', error)
            toast.error('Failed to download report')
        } finally {
            setIsExporting(false)
        }
    }

    const handleFilterChange = (key: string, value: string) => {
        setAdvancedFilters(prev => ({ ...prev, [key]: value }))
    }

    const periodLabel = dateRange?.from && dateRange?.to 
        ? `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
        : 'Select Period'

    return (
        <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 pb-20 md:pb-8" id="report-content">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 pb-6 border-b border-border/50">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ChartBar weight="light" className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Systematic Reports</h1>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5 opacity-70">
                                Trade Audit Center • {periodLabel}
                            </p>
                        </div>
                    </div>

                    <div className="no-export flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={isExporting} className="h-9 font-black uppercase tracking-tighter text-[10px] border-border/40 hover:bg-muted/10 transition-all">
                            <TrendUp weight="light" className="h-3.5 w-3.5 mr-2 opacity-60" />
                            Render Report
                        </Button>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 font-black uppercase tracking-tighter text-[10px] border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors duration-200">
                                    <ShareNetwork weight="light" className="h-3.5 w-3.5 mr-2" />
                                    Share Intelligence
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl bg-card border border-border/10 p-0 overflow-hidden rounded-[32px]">
                                <div className="p-8">
                                    <DialogHeader className="mb-6">
                                        <DialogTitle className="text-xl font-black tracking-tighter uppercase">Generate Performance Asset</DialogTitle>
                                        <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Render high-fidelity performance card for your network</DialogDescription>
                                    </DialogHeader>
                                    {tradingActivity && psychMetrics && (
                                        <div className="flex justify-center">
                                            <PerformanceCard
                                                period={"LATEST AUDIT"}
                                                stats={{
                                                    totalTrades: tradingActivity.totalTrades,
                                                    winRate: tradingActivity.winRate,
                                                    totalPnL: psychMetrics.totalNetPnL,
                                                    longestWinStreak: psychMetrics.longestWinStreak,
                                                    longestLoseStreak: psychMetrics.longestLoseStreak,
                                                    tradingDays: tradingActivity.tradingDaysActive,
                                                    avgTradesPerMonth: tradingActivity.avgTradesPerMonth
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <ReportFilters 
                    accounts={accounts || []}
                    selectedAccountId={selectedAccountId}
                    onAccountChange={setSelectedAccountId}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    onPresetSelect={handlePresetSelect}
                    filters={advancedFilters}
                    options={filterOptions}
                    onFilterChange={handleFilterChange}
                />

                {isLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <Skeleton key={i} className="h-28 rounded-lg bg-muted/20" />
                        ))}
                    </div>
                ) : !tradingActivity || !psychMetrics || filteredTrades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/60 rounded-2xl bg-muted/5">
                        <Lightning weight="light" className="h-10 w-10 text-muted-foreground/30 mb-4" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/50 mb-4">Journal is empty for this period</h3>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handlePresetSelect('ALL')}
                            className="text-[10px] font-black uppercase tracking-widest"
                        >
                            View All Time
                        </Button>
                    </div>
                ) : (tradingActivity && psychMetrics && filteredTrades.length > 0) ? (
                    <Tabs defaultValue="overview" className="w-full" onValueChange={setSelectedTab}>
                        <TabsList className="mb-8 p-1 bg-muted/20 border border-border/40 rounded-xl no-export">
                            <TabsTrigger value="overview" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all">Overview Audit</TabsTrigger>
                            <TabsTrigger value="sessions" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all">Session Metrics</TabsTrigger>
                            <TabsTrigger value="spreadsheet" className="px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all">Audit Spreadsheet</TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="space-y-12 focus-visible:outline-none">
                            <div className="space-y-10">
                                {/* Main KPI Bar */}
                                <div className="flex flex-wrap items-stretch justify-between gap-6 py-6 border-y border-border/40">
                                    <div className="flex flex-col min-w-[120px]">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Total P/L</p>
                                        <p className={cn("text-3xl font-black font-mono tracking-tighter", psychMetrics.totalNetPnL >= 0 ? "text-long" : "text-short")}>
                                            ${psychMetrics.totalNetPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="w-px bg-border/40 hidden md:block" />
                                    <div className="flex flex-col min-w-[120px]">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Win Rate</p>
                                        <p className="text-3xl font-black font-mono tracking-tighter text-foreground">{tradingActivity.winRate}%</p>
                                    </div>
                                    <div className="w-px bg-border/40 hidden lg:block" />
                                    <div className="flex flex-col min-w-[120px]">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Profit Factor</p>
                                        <p className="text-3xl font-black font-mono tracking-tighter text-primary">{psychMetrics.profitFactor}</p>
                                    </div>
                                    <div className="w-px bg-border/40 hidden lg:block" />
                                    <div className="flex flex-col min-w-[120px]">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Expectancy</p>
                                        <p className="text-3xl font-black font-mono tracking-tighter text-foreground">${psychMetrics.expectancy}</p>
                                    </div>
                                    <div className="w-px bg-border/40 hidden xl:block" />
                                    <div className="flex flex-col min-w-[120px]">
                                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Max Drawdown</p>
                                        <p className="text-3xl font-black font-mono tracking-tighter text-short">${psychMetrics.maxDrawdown}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                    {/* Detailed Metrics Table */}
                                    <div className="lg:col-span-7 space-y-6">
                                        <div className="flex items-center gap-2">
                                            <TrendUp weight="light" className="h-4 w-4 text-primary" />
                                            <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-muted-foreground">Detailed Performance Audit</h2>
                                        </div>
                                        <div className="border border-border/40 rounded-2xl overflow-hidden bg-muted/5">
                                            <Table>
                                                <TableBody>
                                                    <TableRow className="border-border/10 hover:bg-transparent">
                                                        <TableCell className="text-[10px] font-black uppercase text-muted-foreground/60 py-3">Total Trades / Active Days</TableCell>
                                                        <TableCell className="text-right font-bold py-3">{tradingActivity.totalTrades} / {tradingActivity.tradingDaysActive}</TableCell>
                                                    </TableRow>
                                                    <TableRow className="border-border/10 hover:bg-transparent">
                                                        <TableCell className="text-[10px] font-black uppercase text-muted-foreground/60 py-3">Average Win / Average Loss</TableCell>
                                                        <TableCell className="text-right font-bold py-3">
                                                            <span className="text-long">${psychMetrics.avgWin}</span> / <span className="text-short">${psychMetrics.avgLoss}</span>
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow className="border-border/10 hover:bg-transparent">
                                                        <TableCell className="text-[10px] font-black uppercase text-muted-foreground/60 py-3">Peak Equity</TableCell>
                                                        <TableCell className="text-right font-bold py-3 text-long">${psychMetrics.peakEquity}</TableCell>
                                                    </TableRow>
                                                    <TableRow className="border-border/10 hover:bg-transparent">
                                                        <TableCell className="text-[10px] font-black uppercase text-muted-foreground/60 py-3">Average Holding Time</TableCell>
                                                        <TableCell className="text-right font-bold py-3">{psychMetrics.avgHoldingTime}</TableCell>
                                                    </TableRow>
                                                    <TableRow className="border-border/10 hover:bg-transparent">
                                                        <TableCell className="text-[10px] font-black uppercase text-muted-foreground/60 py-3">Win/Loss Streaks</TableCell>
                                                        <TableCell className="text-right font-bold py-3">
                                                            <span className="text-long">{psychMetrics.longestWinStreak}W</span> / <span className="text-short">{psychMetrics.longestLoseStreak}L</span>
                                                        </TableCell>
                                                    </TableRow>
                                                    <TableRow className="border-none hover:bg-transparent">
                                                        <TableCell className="text-[10px] font-black uppercase text-muted-foreground/60 py-3">Account Yield</TableCell>
                                                        <TableCell className={cn("text-right font-black py-3", psychMetrics.totalNetPnL >= 0 ? "text-long" : "text-short")}>
                                                            {psychMetrics.totalNetPnL >= 0 ? '+' : ''}{((psychMetrics.totalNetPnL / Math.max(1, (accounts?.[0]?.startingBalance || 10000))) * 100).toFixed(2)}%
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>

                                    {/* R-Multiple Distribution Chart */}
                                    <div className="lg:col-span-5 space-y-6">
                                        <div className="flex items-center gap-2">
                                            <Target weight="light" className="h-4 w-4 text-primary" />
                                            <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-muted-foreground">R-Multiple Distribution</h2>
                                        </div>
                                        <div className="bg-muted/10 border border-border/40 rounded-2xl p-6 flex flex-col justify-between h-[280px]">
                                            <div className="flex items-end justify-between h-40 gap-2 px-2">
                                                {rMultipleDistribution && Object.entries(rMultipleDistribution).map(([bucket, count], i) => {
                                                    const maxCount = Math.max(...Object.values(rMultipleDistribution))
                                                    const height = maxCount > 0 ? (count / maxCount * 100) : 0
                                                    const isNegative = bucket.includes('<') || bucket.includes('-')
                                                    return (
                                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                                            <div className="w-full relative flex flex-col justify-end h-full">
                                                                <motion.div 
                                                                    initial={{ height: 0 }} 
                                                                    animate={{ height: `${height}%` }}
                                                                    className={cn(
                                                                        "w-full rounded-t-sm transition-all relative overflow-hidden",
                                                                        isNegative ? "bg-short/40 group-hover:bg-short/60" : "bg-long/40 group-hover:bg-long/60"
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "absolute top-0 left-0 w-full h-0.5",
                                                                        isNegative ? "bg-short" : "bg-long"
                                                                    )} />
                                                                </motion.div>
                                                                {count > 0 && (
                                                                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        {count}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[8px] font-bold text-muted-foreground/60 whitespace-nowrap -rotate-45 origin-top-left mt-1">
                                                                {bucket}
                                                            </span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <p className="text-[9px] text-center text-muted-foreground/40 font-medium italic mt-4">
                                                Frequency distribution of trades by risk-to-reward multiple
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Rich Visualizations */}
                                <DiverseCharts trades={filteredTrades} />
                            </div>
                        </TabsContent>

                        <TabsContent value="sessions" className="space-y-8 focus-visible:outline-none">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sessionPerformance && Object.values(sessionPerformance).map((session, i) => (
                                    <SessionBlock key={i} {...session} />
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="spreadsheet" className="focus-visible:outline-none">
                             <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow className="border-border/40 hover:bg-transparent">
                                            <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Entry Date</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Asset</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Side</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Lots</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase tracking-widest h-10">Result</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase tracking-widest h-10 text-right">Net P&L</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {[...filteredTrades].sort((a,b) => new Date(b.entryDate!).getTime() - new Date(a.entryDate!).getTime()).map((trade: any) => {
                                            const netPnL = (trade.pnl || 0) + (trade.commission || 0)
                                            const outcome = classifyTrade(netPnL)
                                            return (
                                                <TableRow key={trade.id} className="border-border/20 hover:bg-muted/5 group transition-colors">
                                                    <TableCell className="text-[10px] font-bold font-mono py-2 opacity-60">
                                                        {trade.entryDate ? formatTimeInZone(trade.entryDate.includes('Z') ? trade.entryDate : `${trade.entryDate}Z`, 'yyyy-MM-dd HH:mm') : 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] font-black py-2">{trade.symbol}</TableCell>
                                                    <TableCell className="py-2">
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                                                            (trade.side?.toLowerCase() === 'long' || trade.side?.toLowerCase() === 'buy') ? "bg-long/10 text-long" : "bg-short/10 text-short"
                                                        )}>
                                                            {trade.side}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] font-mono py-2">{trade.quantity}</TableCell>
                                                    <TableCell className="py-2">
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase",
                                                            outcome === 'win' ? "text-long" : outcome === 'loss' ? "text-short" : "text-muted-foreground"
                                                        )}>
                                                            {outcome}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className={cn(
                                                        "text-[10px] font-bold font-mono text-right py-2",
                                                        netPnL >= 0 ? "text-long" : "text-short"
                                                    )}>
                                                        ${netPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border/40 rounded-3xl bg-muted/5">
                        <Lightning weight="light" className="h-12 w-12 text-muted-foreground/20 mb-4 animate-pulse" />
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground/40 text-center">
                            Neural Journal is empty<br/>
                            <span className="text-[10px] tracking-widest font-bold opacity-50 mt-2 block">ADJUST TEMPORAL FILTERS TO REVEAL DATA</span>
                        </h3>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
