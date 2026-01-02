'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
    BarChart3,
    FileUp,
    Share2,
    TrendingUp,
    Target,
    Clock,
    Activity
} from 'lucide-react'
import {
    startOfYear,
    endOfYear,
    subYears,
    parseISO,
    format,
    differenceInDays
} from 'date-fns'
import html2canvas from 'html2canvas'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useData } from '@/context/data-provider'
import { useTradesStore } from '@/store/trades-store'
import { BREAK_EVEN_THRESHOLD, classifyTrade } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from '@/components/ui/dialog'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from '@/components/ui/tooltip'
import { Skeleton } from '@/components/ui/skeleton'
import { PerformanceCard } from './components/performance-card'

// Dense Metric Block component
function MetricBlock({
    label,
    value,
    subValue,
    color = 'neutral',
    info
}: {
    label: string
    value: string | number
    subValue?: string | React.ReactNode
    color?: 'long' | 'short' | 'neutral' | 'info'
    info?: string
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
                                <Activity className="h-2.5 w-2.5 text-muted-foreground/40" />
                            </TooltipTrigger>
                            <TooltipContent className="text-[10px]">{info}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
            <div className="flex flex-col">
                <span className={cn(
                    "text-xl font-bold tracking-tight leading-none mb-1",
                    colorClasses[color]
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
    pnl
}: {
    name: string
    range: string
    trades: number
    wins: number
    pnl: number
}) {
    const winRate = trades > 0 ? (wins / trades * 100).toFixed(0) : '0'
    const isProfit = pnl > BREAK_EVEN_THRESHOLD
    const isLoss = pnl < -BREAK_EVEN_THRESHOLD
    const isBreakEven = !isProfit && !isLoss

    return (
        <div className="flex flex-col p-4 bg-muted/10 border border-border/40 rounded-lg">
            <h3 className="text-sm font-bold mb-0.5">{name}</h3>
            <span className="text-[10px] text-muted-foreground/60 mb-3">{range}</span>
            <div className="space-y-1.5">
                <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Trades:</span>
                    <span className="font-bold">{trades}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Wins:</span>
                    <span className="font-bold">{wins}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">Win Rate:</span>
                    <span className="font-bold">{winRate}%</span>
                </div>
                <div className="flex justify-between text-[11px] pt-1 border-t border-border/40 mt-1">
                    <span className="text-muted-foreground font-bold">P/L:</span>
                    <span className={cn(
                        "font-bold",
                        isProfit ? "text-long" : isLoss ? "text-short" : "text-muted-foreground"
                    )}>
                        {isProfit ? '+' : isLoss ? '' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            </div>
        </div>
    )
}

export default function ReportsPage() {
    const { trades: allTrades } = useTradesStore()
    const { accounts } = useData()
    const [selectedPeriod, setSelectedPeriod] = useState<string>('this-year')
    const [isExporting, setIsExporting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    const handleDownloadReport = async () => {
        const element = document.getElementById('report-content')
        if (!element) return

        setIsExporting(true)
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#09090b', // Force the dark background color
                useCORS: true,
                onclone: (clonedDoc) => {
                    const clonedContent = clonedDoc.getElementById('report-content') as HTMLElement
                    if (clonedContent) {
                        clonedContent.style.padding = '40px'
                        clonedContent.style.background = '#09090b'
                        clonedContent.style.borderRadius = '0px'
                    }
                },
                ignoreElements: (element) => element.classList.contains('no-export')
            })

            const link = document.createElement('a')
            link.download = `deltalytix-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.png`
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

    const dateRange = useMemo(() => {
        const now = new Date()
        switch (selectedPeriod) {
            case 'this-year': return { from: startOfYear(now), to: endOfYear(now) }
            case 'last-year':
                const lastYear = subYears(now, 1)
                return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
            case 'all-time': return { from: new Date(2000, 0, 1), to: now }
            default: return { from: startOfYear(now), to: endOfYear(now) }
        }
    }, [selectedPeriod])

    const filteredTrades = useMemo(() => {
        if (!allTrades) return []
        return allTrades.filter(trade => {
            if (!trade.entryDate) return false
            const tradeDate = parseISO(trade.entryDate)
            if (!tradeDate) return false
            return tradeDate >= dateRange.from && tradeDate <= dateRange.to
        })
    }, [allTrades, dateRange])

    const tradingActivity = useMemo(() => {
        if (filteredTrades.length === 0) return null
        const tradeDates = filteredTrades
            .map(t => t.entryDate ? format(parseISO(t.entryDate), 'yyyy-MM-dd') : null)
            .filter(Boolean) as string[]
        const uniqueDays = new Set(tradeDates)
        const monthsInRange = Math.max(1, Math.ceil(differenceInDays(dateRange.to, dateRange.from) / 30))

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
        const sessions = {
            asian: { name: 'Asian', range: '00:00-12:00', trades: 0, wins: 0, pnl: 0 },
            london: { name: 'London', range: '11:00-19:00', trades: 0, wins: 0, pnl: 0 },
            newyork: { name: 'New York', range: '16:00-01:00', trades: 0, wins: 0, pnl: 0 },
            asianLondon: { name: 'Asian-London', range: '11:00-12:00', trades: 0, wins: 0, pnl: 0 },
            londonNY: { name: 'London-NY', range: '16:00-19:00', trades: 0, wins: 0, pnl: 0 }
        }
        filteredTrades.forEach(trade => {
            if (!trade.entryDate) return
            const date = parseISO(trade.entryDate);
            const hour = date.getHours();
            const outcome = classifyTrade((trade.pnl || 0) + (trade.commission || 0))

            if (hour >= 0 && hour < 12) { sessions.asian.trades++; if (outcome === 'win') sessions.asian.wins++; sessions.asian.pnl += (trade.pnl || 0) }
            if (hour >= 11 && hour < 19) { sessions.london.trades++; if (outcome === 'win') sessions.london.wins++; sessions.london.pnl += (trade.pnl || 0) }
            if (hour >= 16 || hour < 1) { sessions.newyork.trades++; if (outcome === 'win') sessions.newyork.wins++; sessions.newyork.pnl += (trade.pnl || 0) }
            if (hour >= 11 && hour < 12) { sessions.asianLondon.trades++; if (outcome === 'win') sessions.asianLondon.wins++; sessions.asianLondon.pnl += (trade.pnl || 0) }
            if (hour >= 16 && hour < 19) { sessions.londonNY.trades++; if (outcome === 'win') sessions.londonNY.wins++; sessions.londonNY.pnl += (trade.pnl || 0) }
        })
        return sessions
    }, [filteredTrades])

    useEffect(() => {
        setIsLoading(true); const timer = setTimeout(() => setIsLoading(false), 500); return () => clearTimeout(timer)
    }, [selectedPeriod])

    const periodLabel = selectedPeriod === 'this-year' ? new Date().getFullYear() : selectedPeriod === 'last-year' ? new Date().getFullYear() - 1 : 'All Time'

    return (
        <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 pb-20 md:pb-8" id="report-content">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 pb-6 border-b border-border/50">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Performance Reports</h1>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5 opacity-70">
                                Trade Analysis Center • {periodLabel}
                            </p>
                        </div>
                    </div>

                    <div className="no-export flex items-center gap-2">
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="w-[130px] h-9 text-xs font-bold uppercase tracking-tight">
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="this-year" className="text-xs font-bold uppercase">This Year</SelectItem>
                                <SelectItem value="last-year" className="text-xs font-bold uppercase">Last Year</SelectItem>
                                <SelectItem value="all-time" className="text-xs font-bold uppercase">All Time</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="outline" size="sm" onClick={handleDownloadReport} disabled={isExporting} className="h-9 font-black uppercase tracking-tighter text-[10px] border-border/40 hover:bg-muted/10 transition-all">
                            <FileUp className="h-3.5 w-3.5 mr-2 opacity-60" />
                            Render Report
                        </Button>

                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 font-black uppercase tracking-tighter text-[10px] border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-all">
                                    <Share2 className="h-3.5 w-3.5 mr-2" />
                                    Share Intelligence
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl bg-zinc-950/95 backdrop-blur-3xl border border-white/5 p-0 overflow-hidden rounded-[32px]">
                                <div className="p-8">
                                    <DialogHeader className="mb-6">
                                        <DialogTitle className="text-xl font-black tracking-tighter uppercase">Generate Performance Asset</DialogTitle>
                                        <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-white/30">Render high-fidelity performance card for your network</DialogDescription>
                                    </DialogHeader>
                                    {tradingActivity && psychMetrics && (
                                        <div className="flex justify-center">
                                            <PerformanceCard
                                                period={String(periodLabel)}
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

                {isLoading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <Skeleton key={i} className="h-28 rounded-lg bg-muted/20" />
                        ))}
                    </div>
                ) : !tradingActivity || !psychMetrics || filteredTrades.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/60 rounded-2xl bg-muted/5">
                        <Activity className="h-10 w-10 text-muted-foreground/30 mb-4" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/50">Journal is empty for this period</h3>
                    </div>
                ) : (tradingActivity && psychMetrics && filteredTrades.length > 0) ? (
                    <div className="space-y-12">
                        {/* Section: General Metrics */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-muted-foreground">General Metrics</h2>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <MetricBlock label="Total Trades" value={tradingActivity.totalTrades} subValue={`${tradingActivity.tradingDaysActive} Active Days`} />
                                <MetricBlock label="Win Rate" value={`${tradingActivity.winRate}%`} color={parseFloat(tradingActivity.winRate) >= 50 ? 'long' : 'short'} />
                                <MetricBlock label="Expectancy" value={`$${psychMetrics.expectancy}`} color="info" info="Average value you expect to make on each trade" />
                                <MetricBlock label="Profit Factor" value={psychMetrics.profitFactor} color={parseFloat(psychMetrics.profitFactor) > 1.5 ? 'long' : 'neutral'} />

                                <MetricBlock
                                    label="Total P/L"
                                    value={`$${psychMetrics.totalNetPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                                    color={psychMetrics.totalNetPnL >= 0 ? 'long' : 'short'}
                                />
                                <MetricBlock label="Avg Win" value={`$${psychMetrics.avgWin}`} color="long" />
                                <MetricBlock label="Avg Loss" value={`$${psychMetrics.avgLoss}`} color="short" />
                                <MetricBlock label="Max Drawdown" value={`$${psychMetrics.maxDrawdown}`} color="short" info="Largest peak-to-trough decline in cumulative P/L" />

                                <MetricBlock label="Best Trade" value={`$${Math.max(...filteredTrades.map(t => t.pnl || 0)).toFixed(2)}`} color="long" />
                                <MetricBlock label="Worst Trade" value={`$${Math.min(...filteredTrades.map(t => t.pnl || 0)).toFixed(2)}`} color="short" />
                                <MetricBlock label="Peak Equity" value={`$${psychMetrics.peakEquity}`} color="long" />
                                <MetricBlock label="Avg Holding Time" value={psychMetrics.avgHoldingTime} color="info" />

                                <MetricBlock
                                    label="Streaks"
                                    value={`${psychMetrics.longestWinStreak} ${psychMetrics.longestWinStreak === 1 ? 'Win' : 'Wins'}`}
                                    subValue={<span className="text-short">{psychMetrics.longestLoseStreak} {psychMetrics.longestLoseStreak === 1 ? 'Loss' : 'Losses'} Max</span>}
                                    color="long"
                                />
                            </div>
                        </div>

                        {/* Section: SL/TP Metrics */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="h-4 w-4 text-primary" />
                                <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-muted-foreground">SL/TP Metrics</h2>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/10 p-4 border border-border/40 rounded-xl">
                                <div className="text-center lg:border-r border-border/40 last:border-0">
                                    <p className="text-[9px] uppercase font-black text-muted-foreground/60 mb-1">Long Trades</p>
                                    <p className="font-mono font-bold">{filteredTrades.filter(t => t.side?.toLowerCase() === 'long' || t.side?.toLowerCase() === 'buy').length}</p>
                                </div>
                                <div className="text-center lg:border-r border-border/40 last:border-0">
                                    <p className="text-[9px] uppercase font-black text-muted-foreground/60 mb-1">Short Trades</p>
                                    <p className="font-mono font-bold">{filteredTrades.filter(t => t.side?.toLowerCase() === 'short' || t.side?.toLowerCase() === 'sell').length}</p>
                                </div>
                                <div className="text-center lg:border-r border-border/40 last:border-0">
                                    <p className="text-[9px] uppercase font-black text-muted-foreground/60 mb-1">Avg Win/Loss Ratio</p>
                                    <p className="font-mono font-bold">1:{(Math.abs(parseFloat(psychMetrics.avgWin)) / Math.max(1, Math.abs(parseFloat(psychMetrics.avgLoss)))).toFixed(2)}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[9px] uppercase font-black text-muted-foreground/60 mb-1">Account Growth</p>
                                    <p className={cn("font-mono font-bold", psychMetrics.totalNetPnL >= 0 ? "text-long" : "text-short")}>
                                        {psychMetrics.totalNetPnL >= 0 ? '+' : ''}{((psychMetrics.totalNetPnL / Math.max(1, (accounts?.[0]?.startingBalance || 10000))) * 100).toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Section: Trading Session Performance */}
                        {sessionPerformance && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-muted-foreground">Trading Session Performance</h2>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                    <SessionBlock {...sessionPerformance.asian} />
                                    <SessionBlock {...sessionPerformance.london} />
                                    <SessionBlock {...sessionPerformance.newyork} />
                                    <SessionBlock {...sessionPerformance.asianLondon} />
                                    <SessionBlock {...sessionPerformance.londonNY} />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/60 rounded-2xl bg-muted/5">
                        <Activity className="h-10 w-10 text-muted-foreground/30 mb-4" />
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/50">Journal is empty for this period</h3>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
