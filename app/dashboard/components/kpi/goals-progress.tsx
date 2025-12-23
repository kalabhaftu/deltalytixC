'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useData } from '@/context/data-provider'
import {
    Target,
    TrendingUp,
    Calendar,
    Trophy,
    Settings,
    CheckCircle2,
    X
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
} from '@/components/ui/dialog'

interface GoalsProgressProps {
    size?: string
}

interface Goal {
    id: string
    label: string
    target: number
    current: number
    type: 'trades' | 'winrate' | 'pnl'
    period: 'weekly' | 'monthly'
    icon: React.ElementType
}

// Default goals - user can customize
const DEFAULT_GOALS = {
    monthlyTrades: 20,
    winRate: 55,
    weeklyPnl: 250
}



export default function GoalsProgress({ size }: GoalsProgressProps) {
    const { formattedTrades } = useData()
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [goalTargets, setGoalTargets] = useState(DEFAULT_GOALS)
    const [tempTargets, setTempTargets] = useState(DEFAULT_GOALS)
    const [isLoading, setIsLoading] = useState(false)

    // Load saved goals from API
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

    // Calculate current progress for auto-goals
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
            type: 'trades',
            period: 'monthly',
            icon: Target
        },
        {
            id: '2',
            label: 'Win Rate',
            target: goalTargets.winRate,
            current: currentStats.monthWinRate,
            type: 'winrate',
            period: 'monthly',
            icon: TrendingUp
        },
        {
            id: '3',
            label: 'Weekly P&L',
            target: goalTargets.weeklyPnl,
            current: Math.max(0, currentStats.weekPnL),
            type: 'pnl',
            period: 'weekly',
            icon: Calendar
        }
    ]

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Goals & Targets
                </CardTitle>
                <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Settings className="h-3.5 w-3.5" />
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
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={saveGoals} disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between space-y-3">
                {goals.map((goal) => {
                    const progress = Math.min((goal.current / goal.target) * 100, 100)
                    const isComplete = goal.current >= goal.target
                    const Icon = goal.icon

                    return (
                        <div key={goal.id} className="space-y-1.5">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <Icon className={cn(
                                        "h-3.5 w-3.5",
                                        isComplete ? "text-green-500" : "text-muted-foreground"
                                    )} />
                                    <span className={cn(
                                        "text-xs",
                                        isComplete && "text-green-500 font-medium"
                                    )}>
                                        {goal.label}
                                    </span>
                                </div>
                                <span className={cn(
                                    "text-xs font-medium",
                                    isComplete ? "text-green-500" : "text-muted-foreground"
                                )}>
                                    {goal.type === 'winrate'
                                        ? `${goal.current.toFixed(0)}%`
                                        : goal.type === 'pnl'
                                            ? `$${goal.current.toLocaleString()}`
                                            : goal.current
                                    }
                                    {' / '}
                                    {goal.type === 'winrate'
                                        ? `${goal.target}%`
                                        : goal.type === 'pnl'
                                            ? `$${goal.target.toLocaleString()}`
                                            : goal.target
                                    }
                                </span>
                            </div>
                            <Progress
                                value={progress}
                                className={cn(
                                    "h-1.5",
                                    isComplete && "[&>div]:bg-green-500"
                                )}
                            />
                        </div>
                    )
                })}

                {goals.every(g => g.current >= g.target) && (
                    <p className="text-xs text-green-500 font-medium flex items-center justify-center gap-1 pt-1">
                        <CheckCircle2 className="h-3 w-3" />
                        All goals hit!
                    </p>
                )}

                {goals.some(g => g.current >= g.target) && !goals.every(g => g.current >= g.target) && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                        Keep pushing!
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
