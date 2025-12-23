'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    Trophy,
    Target,
    Calendar,
    DollarSign,
    Activity,
    Brain,
    Download,
    Share2,
    ChevronDown,
    Flame,
    Zap,
    Clock,
    AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { useData } from '@/context/data-provider'
import { format, startOfYear, endOfYear, startOfMonth, endOfMonth, subYears, differenceInDays, parseISO, getMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import { PerformanceCard } from './components/performance-card'

// Friendly stat card component
function StatCard({
    icon: Icon,
    label,
    value,
    subValue,
    trend,
    className
}: {
    icon: React.ElementType
    label: string
    value: string | number
    subValue?: string
    trend?: 'up' | 'down' | 'neutral'
    className?: string
}) {
    return (
        <div className={cn(
            "flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm",
            className
        )}>
            <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                trend === 'up' ? "bg-green-500/10 text-green-500" :
                    trend === 'down' ? "bg-red-500/10 text-red-500" :
                        "bg-muted text-muted-foreground"
            )}>
                <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold truncate">{value}</p>
                {subValue && (
                    <p className="text-xs text-muted-foreground">{subValue}</p>
                )}
            </div>
        </div>
    )
}

// Section header component
function SectionHeader({
    icon: Icon,
    title,
    description
}: {
    icon: React.ElementType
    title: string
    description?: string
}) {
    return (
        <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h2 className="text-lg font-semibold">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
        </div>
    )
}

// Monthly breakdown bar
function MonthlyBar({ month, value, max }: { month: string, value: number, max: number }) {
    const percentage = max > 0 ? (value / max) * 100 : 0

    return (
        <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-12">{month}</span>
            <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                />
            </div>
            <span className="text-sm font-medium w-8 text-right">{value}</span>
        </div>
    )
}

export default function ReportsPage() {
    const { formattedTrades, accounts } = useData()
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
                backgroundColor: '#09090b', // zinc-950
                useCORS: true,
                ignoreElements: (element) => {
                    // Ignore the header buttons during capture
                    return element.classList.contains('no-export')
                }
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

    // Calculate date range based on selected period
    const dateRange = useMemo(() => {
        const now = new Date()
        switch (selectedPeriod) {
            case 'this-year':
                return { from: startOfYear(now), to: endOfYear(now) }
            case 'last-year':
                const lastYear = subYears(now, 1)
                return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
            case 'all-time':
                return { from: new Date(2000, 0, 1), to: now }
            default:
                return { from: startOfYear(now), to: endOfYear(now) }
        }
    }, [selectedPeriod])

    // Filter trades by date range
    const filteredTrades = useMemo(() => {
        if (!formattedTrades) return []
        return formattedTrades.filter(trade => {
            const tradeDate = trade.entryDate ? parseISO(trade.entryDate) : null
            if (!tradeDate) return false
            return tradeDate >= dateRange.from && tradeDate <= dateRange.to
        })
    }, [formattedTrades, dateRange])

    // Calculate trading activity stats
    const tradingActivity = useMemo(() => {
        if (filteredTrades.length === 0) return null

        const tradeDates = filteredTrades
            .map(t => t.entryDate ? format(parseISO(t.entryDate), 'yyyy-MM-dd') : null)
            .filter(Boolean) as string[]

        const uniqueDays = new Set(tradeDates)
        const tradesPerDay: Record<string, number> = {}
        tradeDates.forEach(date => {
            tradesPerDay[date] = (tradesPerDay[date] || 0) + 1
        })

        const maxTradesDay = Math.max(...Object.values(tradesPerDay), 0)
        const monthsInRange = Math.max(1, Math.ceil(differenceInDays(dateRange.to, dateRange.from) / 30))

        const wins = filteredTrades.filter(t => (t.pnl || 0) > 0).length
        const winRate = filteredTrades.length > 0 ? (wins / filteredTrades.length) * 100 : 0

        return {
            totalTrades: filteredTrades.length,
            winRate: winRate.toFixed(1),
            avgTradesPerMonth: Math.round(filteredTrades.length / monthsInRange),
            maxTradesPerDay: maxTradesDay,
            tradingDaysActive: uniqueDays.size
        }
    }, [filteredTrades, dateRange])

    // Calculate funding performance (prop firm accounts)
    const fundingPerformance = useMemo(() => {
        if (!accounts) return null

        const propFirmAccounts = accounts.filter(acc =>
            (acc as any).accountType === 'prop-firm' || (acc as any).propfirm
        )

        const fundedAccounts = propFirmAccounts.filter(acc => {
            const phase = (acc as any).currentPhase || (acc as any).currentPhaseDetails?.phaseNumber
            const evalType = (acc as any).currentPhaseDetails?.evaluationType
            if (evalType === 'Two Step') return phase >= 3
            if (evalType === 'One Step') return phase >= 2
            if (evalType === 'Instant') return phase >= 1
            return phase >= 3
        })

        const failedPhase1 = propFirmAccounts.filter(acc => {
            const status = (acc as any).status
            const phase = (acc as any).currentPhase || 1
            return status === 'failed' && phase === 1
        }).length

        const failedPhase2 = propFirmAccounts.filter(acc => {
            const status = (acc as any).status
            const phase = (acc as any).currentPhase || 1
            return status === 'failed' && phase === 2
        }).length

        return {
            fundedPassed: fundedAccounts.length,
            failedNoPayoutCount: 0, // Would need payout data
            failedAfterPayoutCount: 0, // Would need payout data
            activeFunded: fundedAccounts.filter(acc => (acc as any).status === 'active').length,
            failedPhase1,
            failedPhase2,
            totalChallenges: propFirmAccounts.length
        }
    }, [accounts])

    // Calculate payout performance
    const payoutPerformance = useMemo(() => {
        // This would need actual payout data from prop firm accounts
        // For now, calculate from trade PnL on funded accounts
        const totalPnL = filteredTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

        return {
            totalPayouts: 0, // Would need payout records
            totalAmount: totalPnL > 0 ? totalPnL : 0,
            largestPayout: 0,
            avgPayoutPerAccount: 0
        }
    }, [filteredTrades])

    // Calculate monthly breakdown
    const monthlyBreakdown = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthlyData: Record<number, { trades: number, pnl: number }> = {}

        filteredTrades.forEach(trade => {
            if (!trade.entryDate) return
            const month = getMonth(parseISO(trade.entryDate))
            if (!monthlyData[month]) {
                monthlyData[month] = { trades: 0, pnl: 0 }
            }
            monthlyData[month].trades++
            monthlyData[month].pnl += trade.pnl || 0
        })

        return months.map((name, index) => ({
            name,
            trades: monthlyData[index]?.trades || 0,
            pnl: monthlyData[index]?.pnl || 0
        }))
    }, [filteredTrades])

    // Calculate psychological metrics
    const psychMetrics = useMemo(() => {
        if (filteredTrades.length === 0) return null

        // Sort trades by date
        const sorted = [...filteredTrades].sort((a, b) => {
            const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0
            const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0
            return dateA - dateB
        })

        // Calculate streaks
        let currentStreak = 0
        let maxWinStreak = 0
        let maxLoseStreak = 0
        let tempStreak = 0
        let lastWasWin: boolean | null = null

        sorted.forEach(trade => {
            const isWin = (trade.pnl || 0) > 0
            if (lastWasWin === null) {
                tempStreak = 1
                lastWasWin = isWin
            } else if (isWin === lastWasWin) {
                tempStreak++
            } else {
                if (lastWasWin) {
                    maxWinStreak = Math.max(maxWinStreak, tempStreak)
                } else {
                    maxLoseStreak = Math.max(maxLoseStreak, tempStreak)
                }
                tempStreak = 1
                lastWasWin = isWin
            }
        })

        // Final streak
        if (lastWasWin) {
            maxWinStreak = Math.max(maxWinStreak, tempStreak)
        } else {
            maxLoseStreak = Math.max(maxLoseStreak, tempStreak)
        }

        const wins = sorted.filter(t => (t.pnl || 0) > 0)
        const losses = sorted.filter(t => (t.pnl || 0) < 0)
        const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl || 0), 0) / wins.length : 0
        const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0) / losses.length) : 0

        return {
            longestWinStreak: maxWinStreak,
            longestLoseStreak: maxLoseStreak,
            avgWin: avgWin.toFixed(2),
            avgLoss: avgLoss.toFixed(2),
            totalNetPnL: sorted.reduce((sum, t) => sum + (t.pnl || 0), 0)
        }
    }, [filteredTrades])

    // Simulate loading
    useEffect(() => {
        setIsLoading(true)
        const timer = setTimeout(() => setIsLoading(false), 500)
        return () => clearTimeout(timer)
    }, [selectedPeriod])

    const maxMonthlyTrades = Math.max(...monthlyBreakdown.map(m => m.trades), 1)
    const periodLabel = selectedPeriod === 'this-year' ? new Date().getFullYear() :
        selectedPeriod === 'last-year' ? new Date().getFullYear() - 1 :
            'All Time'

    return (
        <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 pb-20 md:pb-8" id="report-content">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
                            <BarChart3 className="h-8 w-8 text-primary" />
                            Your Trading Report
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Here's how you've been doing, {periodLabel}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="no-export flex items-center gap-3">
                            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="this-year">This Year</SelectItem>
                                    <SelectItem value="last-year">Last Year</SelectItem>
                                    <SelectItem value="all-time">All Time</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button
                                variant="outline"
                                size="icon"
                                title="Download Report"
                                onClick={handleDownloadReport}
                                disabled={isExporting}
                            >
                                <Download className="h-4 w-4" />
                            </Button>



                            {/* Share Dialog */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon" title="Share">
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Share Your Performance</DialogTitle>
                                        <DialogDescription>
                                            Download or copy your stats for social media
                                        </DialogDescription>
                                    </DialogHeader>
                                    {tradingActivity && psychMetrics && (
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
                                    )}
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    // Loading skeleton
                    <div className="space-y-6">
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                            {[1, 2, 3, 4].map(i => (
                                <Skeleton key={i} className="h-24 rounded-xl" />
                            ))}
                        </div>
                        <Skeleton className="h-64 rounded-xl" />
                    </div>
                ) : !tradingActivity || filteredTrades.length === 0 ? (
                    // Empty state
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No trades yet for this period</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-md">
                                Once you start trading and logging your trades, you'll see your performance breakdown here.
                                Keep pushing!
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-8">
                        {/* Section 1: Trading Activity */}
                        <Card>
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={Activity}
                                    title="Trading Activity"
                                    description="Your trading activity breakdown"
                                />
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
                                    <StatCard
                                        icon={Target}
                                        label="Total Trades"
                                        value={tradingActivity.totalTrades}
                                        subValue="trades taken"
                                        trend="neutral"
                                    />
                                    <StatCard
                                        icon={TrendingUp}
                                        label="Win Rate"
                                        value={`${tradingActivity.winRate}%`}
                                        trend={parseFloat(tradingActivity.winRate) >= 50 ? 'up' : 'down'}
                                    />
                                    <StatCard
                                        icon={Calendar}
                                        label="Avg/Month"
                                        value={tradingActivity.avgTradesPerMonth}
                                        subValue="trades per month"
                                        trend="neutral"
                                    />
                                    <StatCard
                                        icon={Zap}
                                        label="Max/Day"
                                        value={tradingActivity.maxTradesPerDay}
                                        subValue="in a single day"
                                        trend="neutral"
                                    />
                                    <StatCard
                                        icon={Clock}
                                        label="Active Days"
                                        value={tradingActivity.tradingDaysActive}
                                        subValue="days traded"
                                        trend="neutral"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 2: Funding Performance */}
                        {fundingPerformance && fundingPerformance.totalChallenges > 0 && (
                            <Card>
                                <CardHeader className="pb-4">
                                    <SectionHeader
                                        icon={Trophy}
                                        title="Funding Performance"
                                        description="How you're doing with prop firms"
                                    />
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                                        <StatCard
                                            icon={Trophy}
                                            label="Funded Passed"
                                            value={fundingPerformance.fundedPassed}
                                            subValue="accounts funded"
                                            trend="up"
                                        />
                                        <StatCard
                                            icon={Target}
                                            label="Active Funded"
                                            value={fundingPerformance.activeFunded}
                                            subValue="currently active"
                                            trend="neutral"
                                        />
                                        <StatCard
                                            icon={AlertTriangle}
                                            label="Failed Phase 1"
                                            value={fundingPerformance.failedPhase1}
                                            trend="down"
                                        />
                                        <StatCard
                                            icon={BarChart3}
                                            label="Total Challenges"
                                            value={fundingPerformance.totalChallenges}
                                            subValue="challenges taken"
                                            trend="neutral"
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Section 3: Monthly Breakdown */}
                        <Card>
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={Calendar}
                                    title="Monthly Breakdown"
                                    description="Trades per month"
                                />
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {monthlyBreakdown.map((month) => (
                                        <MonthlyBar
                                            key={month.name}
                                            month={month.name}
                                            value={month.trades}
                                            max={maxMonthlyTrades}
                                        />
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Section 4: Psychological Metrics */}
                        {psychMetrics && (
                            <Card>
                                <CardHeader className="pb-4">
                                    <SectionHeader
                                        icon={Brain}
                                        title="Psychological Stability"
                                        description="Your mental game stats"
                                    />
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                                        <StatCard
                                            icon={Flame}
                                            label="Longest Win Streak"
                                            value={psychMetrics.longestWinStreak}
                                            subValue="trades in a row"
                                            trend="up"
                                        />
                                        <StatCard
                                            icon={TrendingDown}
                                            label="Longest Lose Streak"
                                            value={psychMetrics.longestLoseStreak}
                                            subValue="trades in a row"
                                            trend="down"
                                        />
                                        <StatCard
                                            icon={TrendingUp}
                                            label="Avg Win"
                                            value={`$${psychMetrics.avgWin}`}
                                            trend="up"
                                        />
                                        <StatCard
                                            icon={TrendingDown}
                                            label="Avg Loss"
                                            value={`$${psychMetrics.avgLoss}`}
                                            trend="down"
                                        />
                                    </div>

                                    <Separator className="my-6" />

                                    <div className="flex items-center justify-center">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground mb-1">Total Net P&L</p>
                                            <p className={cn(
                                                "text-4xl font-bold",
                                                psychMetrics.totalNetPnL >= 0 ? "text-green-500" : "text-red-500"
                                            )}>
                                                ${psychMetrics.totalNetPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Motivational Footer */}
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">
                                {psychMetrics && psychMetrics.totalNetPnL >= 0
                                    ? "You're doing great! Keep up the solid work!"
                                    : "Every trader has setbacks. Keep learning and improving!"}
                            </p>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    )
}
