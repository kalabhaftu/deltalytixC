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
import { formatTimeInZone, getTradingSession } from '@/lib/time-utils'
import { BREAK_EVEN_THRESHOLD, classifyTrade, cn } from '@/lib/utils'
import { useTradesStore } from '@/store/trades-store'
import {
    ChartBar,
    Lightning,
    ShareNetwork,
    Target,
    TrendUp
} from '@phosphor-icons/react'
import {
    differenceInDays,
    endOfDay,
    endOfYear,
    format,
    parseISO,
    startOfDay,
    startOfYear,
    subDays,
    subMonths
} from 'date-fns'
import { motion } from 'framer-motion'
import html2canvas from 'html2canvas'
import { useEffect, useMemo, useState } from 'react'
import { DateRange } from 'react-day-picker'
import { toast } from 'sonner'
import { ReportFilters } from './components/report-filters'

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
        <div className="flex flex-col p-4 bg-muted/20 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground/60">
                    {label}
                </span>
                {info && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Lightning weight="light" className="h-2.5 w-2.5 text-muted-foreground/40" />
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px]">{info}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <div className="flex flex-col">
                <span className={cn(
                    "text-xl font-bold tracking-tight leading-none mb-1",
                    colorClasses[color],
                    className
                )}>
                    {value}
                </span>
                {subValue && (
                    <div className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tighter">
                        {subValue}
                    </div>
                )}
            </div>
        </div>
    )
}

// Session Block component
function SessionBlock({
    name,
    range,
    trades,
    wins,
    pnl,
    totalHoldMs,
    maxDD
}: {
    name: string
    range: string
    trades: number
    wins: number
    pnl: number
    totalHoldMs: number
    maxDD: number
}) {
    const winRate = trades > 0 ? (wins / trades * 100).toFixed(0) : '0'
    const isProfit = pnl > BREAK_EVEN_THRESHOLD
    const isLoss = pnl < -BREAK_EVEN_THRESHOLD
    
    const avgHoldMs = trades > 0 ? totalHoldMs / trades : 0
    const h = Math.floor(avgHoldMs / (1000 * 60 * 60))
    const m = Math.floor((avgHoldMs % (1000 * 60 * 60)) / (1000 * 60))

    return (
        <div className="flex flex-col p-5 bg-card border border-border/40 rounded-2xl hover:border-primary/30 transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground">{name}</h3>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground/50 tabular-nums">{range}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p className="text-[8px] uppercase font-black text-muted-foreground/40 mb-1">Session P/L</p>
                    <p className={cn("text-lg font-black font-mono", isProfit ? "text-long" : isLoss ? "text-short" : "text-foreground")}>
                        ${pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
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
    const { trades: allTrades } = useTradesStore()
    const { accounts } = useData()
    
    // Independent Filter State
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfYear(new Date()),
        to: endOfYear(new Date())
    })
    const [selectedTab, setSelectedTab] = useState('overview')
    
    const [isExporting, setIsExporting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

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
                backgroundColor: 'hsl(var(--background))', // Force the dark background color
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

    const filteredTrades = useMemo(() => {
        if (!allTrades) return []
        return allTrades.filter(trade => {
            // Filter by Account
            if (selectedAccountId && trade.accountId !== selectedAccountId) return false
            
            // Filter by Date
            if (!trade.entryDate) return false
            const tradeDate = parseISO(trade.entryDate)
            if (!tradeDate) return false
            
            if (dateRange?.from && tradeDate < startOfDay(dateRange.from)) return false
            if (dateRange?.to && tradeDate > endOfDay(dateRange.to)) return false
            
            return true
        })
    }, [allTrades, selectedAccountId, dateRange])

    const tradingActivity = useMemo(() => {
        if (filteredTrades.length === 0) return null
        const tradeDates = filteredTrades
            .map(t => t.entryDate ? format(parseISO(t.entryDate), 'yyyy-MM-dd') : null)
            .filter(Boolean) as string[]
        const uniqueDays = new Set(tradeDates)
        const daysInRange = dateRange?.from && dateRange?.to ? Math.max(1, differenceInDays(dateRange.to, dateRange.from)) : 30
        const monthsInRange = Math.max(1, Math.ceil(daysInRange / 30))

        // Use standardized win rate
        const wins = filteredTrades.filter(t => classifyTrade((t.pnl || 0) + (t.commission || 0)) === 'win').length
        const losses = filteredTrades.filter(t => classifyTrade((t.pnl || 0) + (t.commission || 0)) === 'loss').length
        const tradableCount = wins + losses
        const winRate = tradableCount > 0 ? (wins / tradableCount) * 100 : 0

        return {
            totalTrades: filteredTrades.length,
            winRate: winRate.toFixed(1),
            avgTradesPerMonth: Math.round(filteredTrades.length / monthsInRange),
            tradingDaysActive: uniqueDays.size
        }
    }, [filteredTrades, dateRange])

    const psychMetrics = useMemo(() => {
        if (filteredTrades.length === 0) return null
        const sorted = [...filteredTrades].sort((a, b) => {
            const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0
            const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0
            return dateA - dateB
        })

        let cumulativePnL = 0; let maxDD = 0; let peakEquity = 0

        // First pass: Calculate cumulative metrics needed for expectancy and others
        sorted.forEach(trade => {
            cumulativePnL += ((trade.pnl || 0) + (trade.commission || 0))
            if (cumulativePnL > peakEquity) peakEquity = cumulativePnL
            const dd = peakEquity - cumulativePnL
            if (dd > maxDD) maxDD = dd
        })

        const wins = sorted.filter(t => classifyTrade((t.pnl || 0) + (t.commission || 0)) === 'win')
        const losses = sorted.filter(t => classifyTrade((t.pnl || 0) + (t.commission || 0)) === 'loss')

        const totalGrossProfit = wins.reduce((sum, t) => sum + ((t.pnl || 0) + (t.commission || 0)), 0)
        const totalGrossLoss = Math.abs(losses.reduce((sum, t) => sum + ((t.pnl || 0) + (t.commission || 0)), 0))

        const avgWin = wins.length > 0 ? totalGrossProfit / wins.length : 0
        const avgLoss = losses.length > 0 ? totalGrossLoss / losses.length : 0

        // Expectancy: Average PnL per trade (Total Net PnL / Total Trades)
        const expectancy = sorted.length > 0 ? cumulativePnL / sorted.length : 0

        const profitFactor = totalGrossLoss > 0 ? totalGrossProfit / totalGrossLoss : totalGrossProfit > 0 ? 99 : 0

        let maxWinStreak = 0; let maxLoseStreak = 0; let tempStreak = 0; let lastWasWin: boolean | null = null

        sorted.forEach(trade => {
            const outcome = classifyTrade((trade.pnl || 0) + (trade.commission || 0))
            if (outcome === 'breakeven') {
                if (lastWasWin !== null) {
                    if (lastWasWin) maxWinStreak = Math.max(maxWinStreak, tempStreak)
                    else maxLoseStreak = Math.max(maxLoseStreak, tempStreak)
                }
                tempStreak = 0
                lastWasWin = null
                return
            }
            const isWin = outcome === 'win'
            if (lastWasWin === null) { tempStreak = 1; lastWasWin = isWin }
            else if (isWin === lastWasWin) { tempStreak++ }
            else {
                if (lastWasWin) { maxWinStreak = Math.max(maxWinStreak, tempStreak) }
                else { maxLoseStreak = Math.max(maxLoseStreak, tempStreak) }
                tempStreak = 1; lastWasWin = isWin
            }
        })
        if (lastWasWin !== null) {
            if (lastWasWin) { maxWinStreak = Math.max(maxWinStreak, tempStreak) }
            else { maxLoseStreak = Math.max(maxLoseStreak, tempStreak) }
        }

        // Calculate average holding time
        let totalHoldingTimeMs = 0
        let tradesWithDuration = 0
        sorted.forEach(trade => {
            if (trade.entryDate && trade.closeDate) {
                const entryTime = parseISO(trade.entryDate).getTime()
                const exitTime = parseISO(trade.closeDate).getTime()
                if (!isNaN(entryTime) && !isNaN(exitTime) && exitTime > entryTime) {
                    totalHoldingTimeMs += (exitTime - entryTime)
                    tradesWithDuration++
                }
            }
        })
        const avgHoldingTimeMs = tradesWithDuration > 0 ? totalHoldingTimeMs / tradesWithDuration : 0
        const hours = Math.floor(avgHoldingTimeMs / (1000 * 60 * 60))
        const minutes = Math.floor((avgHoldingTimeMs % (1000 * 60 * 60)) / (1000 * 60))

        return {
            longestWinStreak: maxWinStreak,
            longestLoseStreak: maxLoseStreak,
            avgWin: avgWin.toFixed(2),
            avgLoss: avgLoss.toFixed(2),
            totalNetPnL: cumulativePnL,
            expectancy: expectancy.toFixed(2),
            profitFactor: profitFactor.toFixed(2),
            avgHoldingTime: `${hours}h ${minutes}m`,
            maxDrawdown: maxDD.toFixed(2),
            peakEquity: peakEquity.toFixed(2)
        }
    }, [filteredTrades])

    const sessionPerformance = useMemo(() => {
        if (filteredTrades.length === 0) return null
        
        const sessions: Record<string, { name: string; range: string; trades: number; wins: number; pnl: number; totalHoldMs: number; peak: number; maxDD: number }> = {
            'New York': { name: 'New York Session', range: '08:00 - 17:00', trades: 0, wins: 0, pnl: 0, totalHoldMs: 0, peak: 0, maxDD: 0 },
            'London': { name: 'London Session', range: '03:00 - 12:00', trades: 0, wins: 0, pnl: 0, totalHoldMs: 0, peak: 0, maxDD: 0 },
            'Asia': { name: 'Asia Session', range: '19:00 - 04:00', trades: 0, wins: 0, pnl: 0, totalHoldMs: 0, peak: 0, maxDD: 0 },
            'Outside Session': { name: 'Outside Session', range: 'N/A', trades: 0, wins: 0, pnl: 0, totalHoldMs: 0, peak: 0, maxDD: 0 }
        }

        filteredTrades.forEach(trade => {
            if (!trade.entryDate) return
            const netPnL = (trade.pnl || 0) + (trade.commission || 0)
            const outcome = classifyTrade(netPnL)
            const entryDateStr = trade.entryDate || ''
            const date = entryDateStr.includes('Z') ? entryDateStr : `${entryDateStr}Z`
            
            const sessionName = getTradingSession(new Date(date)) || 'Outside Session'
            
            if (sessions[sessionName]) {
                const s = sessions[sessionName]
                s.trades++
                if (outcome === 'win') s.wins++
                s.pnl += (trade.pnl || 0)
                
                // Track hold time
                if (trade.entryDate && trade.closeDate) {
                    const entry = new Date(trade.entryDate).getTime()
                    const exit = new Date(trade.closeDate).getTime()
                    if (!isNaN(entry) && !isNaN(exit) && exit > entry) {
                        s.totalHoldMs += (exit - entry)
                    }
                }

                // Simple peak/DD per session
                const currentPnL = s.pnl
                if (currentPnL > s.peak) s.peak = currentPnL
                const dd = s.peak - currentPnL
                if (dd > s.maxDD) s.maxDD = dd
            }
        })
        return sessions
    }, [filteredTrades])

    const rMultipleDistribution = useMemo(() => {
        if (filteredTrades.length === 0) return null
        
        const distribution = {
            '<-1R': 0,
            '-1R to 0R': 0,
            '0R to 1R': 0,
            '1R to 2R': 0,
            '2R to 3R': 0,
            '>3R': 0
        }

        filteredTrades.forEach(trade => {
            const pnl = (trade.pnl || 0) + (trade.commission || 0)
            const entry = typeof trade.entryPrice === 'string' ? parseFloat(trade.entryPrice) : trade.entryPrice
            const sl = typeof trade.stopLoss === 'string' ? parseFloat(trade.stopLoss) : (trade.stopLoss || 0)
            const qty = trade.quantity || 0

            if (sl > 0 && entry > 0 && qty > 0) {
                const risk = Math.abs(entry - sl) * qty
                if (risk > 0) {
                    const r = pnl / risk
                    if (r < -1) distribution['<-1R']++
                    else if (r < 0) distribution['-1R to 0R']++
                    else if (r < 1) distribution['0R to 1R']++
                    else if (r < 2) distribution['1R to 2R']++
                    else if (r < 3) distribution['2R to 3R']++
                    else distribution['>3R']++
                }
            } else {
                const outcome = classifyTrade(pnl)
                if (outcome === 'win') distribution['1R to 2R']++
                else if (outcome === 'loss') distribution['-1R to 0R']++
                else distribution['0R to 1R']++
            }
        })
        return distribution
    }, [filteredTrades])

    useEffect(() => {
        setIsLoading(true); const timer = setTimeout(() => setIsLoading(false), 500); return () => clearTimeout(timer)
    }, [selectedAccountId, dateRange])

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
                                <Button variant="outline" size="sm" className="h-9 font-black uppercase tracking-tighter text-[10px] border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all">
                                    <ShareNetwork weight="light" className="h-3.5 w-3.5 mr-2" />
                                    Share Intelligence
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl bg-card/95 backdrop-blur-3xl border border-border/10 p-0 overflow-hidden rounded-[32px]">
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
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/50">Journal is empty for this period</h3>
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
                                {/* Main KPI Bar - High Density */}
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-[1px] bg-border/20 border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                                    <div className="bg-card p-5">
                                        <p className="text-[8px] uppercase font-black text-muted-foreground/50 mb-1">Total P/L</p>
                                        <p className={cn("text-xl font-black font-mono tracking-tighter", psychMetrics.totalNetPnL >= 0 ? "text-long" : "text-short")}>
                                            ${psychMetrics.totalNetPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="bg-card p-5">
                                        <p className="text-[8px] uppercase font-black text-muted-foreground/50 mb-1">Win Rate</p>
                                        <p className="text-xl font-black font-mono tracking-tighter">{tradingActivity.winRate}%</p>
                                    </div>
                                    <div className="bg-card p-5">
                                        <p className="text-[8px] uppercase font-black text-muted-foreground/50 mb-1">Profit Factor</p>
                                        <p className="text-xl font-black font-mono tracking-tighter text-primary">{psychMetrics.profitFactor}</p>
                                    </div>
                                    <div className="bg-card p-5">
                                        <p className="text-[8px] uppercase font-black text-muted-foreground/50 mb-1">Expectancy</p>
                                        <p className="text-xl font-black font-mono tracking-tighter">${psychMetrics.expectancy}</p>
                                    </div>
                                    <div className="bg-card p-5 col-span-2 md:col-span-1">
                                        <p className="text-[8px] uppercase font-black text-muted-foreground/50 mb-1">Max Drawdown</p>
                                        <p className="text-xl font-black font-mono tracking-tighter text-short">${psychMetrics.maxDrawdown}</p>
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
                                                            <span className="text-[8px] font-bold text-muted-foreground/60 whitespace-nowrap rotate-[-45deg] origin-top-left mt-1">
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
                            <div className="border border-border/40 rounded-xl overflow-hidden bg-card/30 backdrop-blur-md">
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
                                        {filteredTrades.sort((a,b) => new Date(b.entryDate!).getTime() - new Date(a.entryDate!).getTime()).map((trade) => {
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
                    <div className="flex flex-col items-center justify-center py-32 border border-dashed border-border/40 rounded-3xl bg-muted/5 backdrop-blur-sm">
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
