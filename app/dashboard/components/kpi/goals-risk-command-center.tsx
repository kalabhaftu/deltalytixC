'use client'

import * as React from 'react'
import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useData } from '@/context/data-provider'
import {
    Target,
    TrendingUp,
    TrendingDown,
    Calendar,
    Trophy,
    Settings,
    Shield,
    AlertTriangle,
    DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { startOfMonth, endOfMonth, parseISO, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { WidgetSize } from '@/app/dashboard/types/dashboard'

// ============================================================================
// TYPES
// ============================================================================

interface GoalsRiskCommandCenterProps {
    size?: WidgetSize
}

interface Goal {
    id: string
    label: string
    target: number
    current: number
    type: 'trades' | 'winrate' | 'pnl'
    period: 'weekly' | 'monthly'
    icon: React.ElementType
    color: string
}

interface RiskMetric {
    label: string
    value: string
    icon: React.ElementType
    status: 'danger' | 'warning' | 'safe' | 'neutral'
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_GOALS = {
    monthlyTrades: 20,
    winRate: 55,
    weeklyPnl: 250
}

// ============================================================================
// CIRCULAR PROGRESS RING COMPONENT
// ============================================================================

function CircularProgress({
    progress,
    size = 80,
    strokeWidth = 6,
    color,
    children
}: {
    progress: number
    size?: number
    strokeWidth?: number
    color: string
    children?: React.ReactNode
}) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const clampedProgress = Math.min(100, Math.max(0, progress))
    const offset = circumference - (clampedProgress / 100) * circumference

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="hsl(var(--muted))"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className="transition-all duration-500 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                {children}
            </div>
        </div>
    )
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({ metric }: { metric: RiskMetric }) {
    const Icon = metric.icon

    const statusStyles = {
        danger: 'border-short/30 bg-short/5',
        warning: 'border-yellow-500/30 bg-yellow-500/5',
        safe: 'border-long/30 bg-long/5',
        neutral: 'border-border bg-muted/30'
    }

    const iconStyles = {
        danger: 'text-short',
        warning: 'text-amber-500',
        safe: 'text-long',
        neutral: 'text-muted-foreground'
    }

    const valueStyles = {
        danger: 'text-short',
        warning: 'text-amber-500',
        safe: 'text-long',
        neutral: 'text-foreground'
    }

    return (
        <div className={cn(
            "p-3 rounded-xl border transition-all hover:scale-[1.02]",
            statusStyles[metric.status]
        )}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("h-3.5 w-3.5", iconStyles[metric.status])} />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                    {metric.label}
                </span>
            </div>
            <p className={cn("text-2xl font-bold tracking-tight", valueStyles[metric.status])}>
                {metric.value}
            </p>
        </div>
    )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function GoalsRiskCommandCenter({ size = 'large' }: GoalsRiskCommandCenterProps) {
    // ---------------------------------------------------------------------------
    // DATA HOOKS
    // ---------------------------------------------------------------------------
    const { formattedTrades } = useData()
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [goalTargets, setGoalTargets] = useState(DEFAULT_GOALS)
    const [tempTargets, setTempTargets] = useState(DEFAULT_GOALS)
    const [isLoading, setIsLoading] = useState(false)

    // ---------------------------------------------------------------------------
    // LOAD SAVED GOALS
    // ---------------------------------------------------------------------------
    useEffect(() => {
        const fetchGoals = async () => {
            try {
                const res = await fetch('/api/user/goals')
                if (res.ok) {
                    const data = await res.json()
                    if (data.goals) {
                        setGoalTargets(data.goals)
                        setTempTargets(data.goals)
                    }
                }
            } catch (e) {
                console.error('Failed to load goals', e)
            }
        }
        fetchGoals()
    }, [])

    // ---------------------------------------------------------------------------
    // SAVE GOALS
    // ---------------------------------------------------------------------------
    const saveGoals = async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/user/goals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tempTargets)
            })

            if (res.ok) {
                const data = await res.json()
                setGoalTargets(data.goals)
                setIsSettingsOpen(false)
            }
        } catch (e) {
            console.error('Failed to save goals', e)
        } finally {
            setIsLoading(false)
        }
    }

    // ---------------------------------------------------------------------------
    // GOALS CALCULATIONS
    // ---------------------------------------------------------------------------
    const currentStats = useMemo(() => {
        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })

        const monthTrades = (formattedTrades || []).filter(t => {
            if (!t.entryDate) return false
            const date = parseISO(t.entryDate)
            return isWithinInterval(date, { start: monthStart, end: monthEnd })
        })

        const weekTrades = (formattedTrades || []).filter(t => {
            if (!t.entryDate) return false
            const date = parseISO(t.entryDate)
            return isWithinInterval(date, { start: weekStart, end: weekEnd })
        })

        const monthWins = monthTrades.filter(t => (t.pnl || 0) > 0).length
        const weekPnL = weekTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)

        return {
            monthTrades: monthTrades.length,
            monthWinRate: monthTrades.length > 0 ? (monthWins / monthTrades.length) * 100 : 0,
            weekPnL
        }
    }, [formattedTrades])

    const goals: Goal[] = [
        {
            id: '1',
            label: 'Monthly Trades',
            target: goalTargets.monthlyTrades,
            current: currentStats.monthTrades,
            type: 'trades' as const,
            period: 'monthly' as const,
            icon: Target,
            color: 'hsl(var(--chart-3))' // Blue
        },
        {
            id: '2',
            label: 'Win Rate',
            target: goalTargets.winRate,
            current: currentStats.monthWinRate,
            type: 'winrate' as const,
            period: 'monthly' as const,
            icon: TrendingUp,
            color: 'hsl(var(--chart-profit))' // Green
        },
        {
            id: '3',
            label: 'Weekly P&L',
            target: goalTargets.weeklyPnl,
            current: Math.max(0, currentStats.weekPnL),
            type: 'pnl' as const,
            period: 'weekly' as const,
            icon: Calendar,
            color: 'hsl(var(--chart-4))' // Purple/Amber
        }
    ]

    // ---------------------------------------------------------------------------
    // RISK CALCULATIONS
    // ---------------------------------------------------------------------------
    const riskStats = useMemo(() => {
        if (!formattedTrades || formattedTrades.length === 0) {
            return {
                maxDrawdown: 0,
                avgLoss: 0,
                largestLoss: 0,
                lossStreak: 0
            }
        }

        let peak = 0
        let maxDrawdown = 0
        let runningTotal = 0

        const sorted = [...formattedTrades].sort((a, b) => {
            const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0
            const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0
            return dateA - dateB
        })

        sorted.forEach(trade => {
            runningTotal += trade.pnl || 0
            if (runningTotal > peak) {
                peak = runningTotal
            }
            const drawdown = peak - runningTotal
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown
            }
        })

        const losses = formattedTrades.filter(t => (t.pnl || 0) < 0)
        const largestLoss = Math.min(...losses.map(t => t.pnl || 0), 0)
        const avgLoss = losses.length > 0
            ? losses.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0) / losses.length
            : 0

        let lossStreak = 0
        for (let i = sorted.length - 1; i >= 0; i--) {
            if ((sorted[i].pnl || 0) < 0) {
                lossStreak++
            } else {
                break
            }
        }

        return { maxDrawdown, avgLoss, largestLoss: Math.abs(largestLoss), lossStreak }
    }, [formattedTrades])

    const riskMetrics: RiskMetric[] = [
        {
            label: 'Max Drawdown',
            value: `$${riskStats.maxDrawdown.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            icon: TrendingDown,
            status: (riskStats.maxDrawdown > 1000 ? 'danger' : riskStats.maxDrawdown > 500 ? 'warning' : 'safe') as 'danger' | 'warning' | 'safe'
        },
        {
            label: 'Largest Loss',
            value: `$${riskStats.largestLoss.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            icon: AlertTriangle,
            status: (riskStats.largestLoss > 500 ? 'danger' : riskStats.largestLoss > 200 ? 'warning' : 'safe') as 'danger' | 'warning' | 'safe'
        },
        {
            label: 'Avg Loss',
            value: `$${riskStats.avgLoss.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            icon: DollarSign,
            status: 'neutral' as const
        },
        {
            label: 'Loss Streak',
            value: riskStats.lossStreak.toString(),
            icon: Shield,
            status: (riskStats.lossStreak >= 5 ? 'danger' : riskStats.lossStreak >= 3 ? 'warning' : 'safe') as 'danger' | 'warning' | 'safe'
        }
    ]

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------
    const hasData = formattedTrades && formattedTrades.length > 0

    return (
        <Card className="h-full flex flex-col bg-card">
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between shrink-0 border-b border-border/50 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                        <CardTitle className="text-lg font-bold tracking-tight">Command Center</CardTitle>
                        <p className="text-xs text-muted-foreground">Goals & Risk Overview</p>
                    </div>
                </div>

                {/* Settings Dialog */}
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Set Your Goals</DialogTitle>
                            <DialogDescription>
                                Customize your trading targets
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="monthlyTrades">Monthly Trades Target</Label>
                                <Input
                                    id="monthlyTrades"
                                    type="number"
                                    value={tempTargets.monthlyTrades}
                                    onChange={(e) => setTempTargets(prev => ({ ...prev, monthlyTrades: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="winRate">Win Rate Target (%)</Label>
                                <Input
                                    id="winRate"
                                    type="number"
                                    value={tempTargets.winRate}
                                    onChange={(e) => setTempTargets(prev => ({ ...prev, winRate: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="weeklyPnl">Weekly P&L Target ($)</Label>
                                <Input
                                    id="weeklyPnl"
                                    type="number"
                                    value={tempTargets.weeklyPnl}
                                    onChange={(e) => setTempTargets(prev => ({ ...prev, weeklyPnl: parseInt(e.target.value) || 0 }))}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                            <Button onClick={saveGoals} disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Goals'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            {/* Content */}
            <CardContent className="flex-1 p-6">
                {hasData ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                        {/* Goals Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                                <Target className="h-3.5 w-3.5" />
                                Goals Progress
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                {goals.map((goal) => {
                                    const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0
                                    const isComplete = progress >= 100

                                    return (
                                        <div key={goal.id} className="flex flex-col items-center text-center space-y-2">
                                            <CircularProgress
                                                progress={progress}
                                                size={72}
                                                strokeWidth={5}
                                                color={isComplete ? 'hsl(var(--chart-profit))' : goal.color}
                                            >
                                                <span className="text-sm font-bold">
                                                    {progress >= 100 ? '✓' : `${Math.round(progress)}%`}
                                                </span>
                                            </CircularProgress>
                                            <div>
                                                <p className="text-xs font-medium">{goal.label}</p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {goal.type === 'pnl'
                                                        ? `$${goal.current.toFixed(0)} / $${goal.target}`
                                                        : goal.type === 'winrate'
                                                            ? `${goal.current.toFixed(0)}% / ${goal.target}%`
                                                            : `${goal.current} / ${goal.target}`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Risk Metrics Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5" />
                                Risk Metrics
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {riskMetrics.map((metric, index) => (
                                    <StatCard key={index} metric={metric} />
                                ))}
                            </div>

                            {/* Warning Alert */}
                            {riskStats.lossStreak >= 3 && (
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                    <p className="text-xs text-amber-500">
                                        Consider taking a break - {riskStats.lossStreak} losses in a row
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Empty State */
                    <div className="flex-1 flex items-center justify-center h-full">
                        <div className="text-center space-y-2">
                            <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                            <p className="text-sm text-muted-foreground">No trading data available</p>
                            <p className="text-xs text-muted-foreground">Import trades to see your goals and risk metrics</p>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
