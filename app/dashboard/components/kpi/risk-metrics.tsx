'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/context/data-provider'
import {
    Shield,
    TrendingDown,
    AlertTriangle,
    Percent,
    DollarSign
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseISO, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'

interface RiskMetricsProps {
    size?: string
}

export default function RiskMetrics({ size }: RiskMetricsProps) {
    const { formattedTrades, accounts } = useData()

    const riskStats = useMemo(() => {
        if (!formattedTrades || formattedTrades.length === 0) {
            return {
                maxDrawdown: 0,
                avgLossPercent: 0,
                largestLoss: 0,
                riskPerTrade: 0,
                lossStreak: 0
            }
        }

        // Calculate max drawdown
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

        // Calculate losses
        const losses = formattedTrades.filter(t => (t.pnl || 0) < 0)
        const largestLoss = Math.min(...losses.map(t => t.pnl || 0), 0)
        const avgLoss = losses.length > 0
            ? losses.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0) / losses.length
            : 0

        // Calculate current loss streak
        let lossStreak = 0
        for (let i = sorted.length - 1; i >= 0; i--) {
            if ((sorted[i].pnl || 0) < 0) {
                lossStreak++
            } else {
                break
            }
        }

        return {
            maxDrawdown,
            avgLossPercent: avgLoss,
            largestLoss: Math.abs(largestLoss),
            riskPerTrade: avgLoss,
            lossStreak
        }
    }, [formattedTrades])

    const metrics = [
        {
            label: 'Max Drawdown',
            value: `$${riskStats.maxDrawdown.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: TrendingDown,
            status: riskStats.maxDrawdown > 1000 ? 'danger' : riskStats.maxDrawdown > 500 ? 'warning' : 'safe'
        },
        {
            label: 'Largest Loss',
            value: `$${riskStats.largestLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: AlertTriangle,
            status: riskStats.largestLoss > 500 ? 'danger' : riskStats.largestLoss > 200 ? 'warning' : 'safe'
        },
        {
            label: 'Avg Loss',
            value: `$${riskStats.avgLossPercent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: DollarSign,
            status: 'neutral'
        },
        {
            label: 'Loss Streak',
            value: riskStats.lossStreak.toString(),
            icon: Shield,
            status: riskStats.lossStreak >= 5 ? 'danger' : riskStats.lossStreak >= 3 ? 'warning' : 'safe'
        }
    ]

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Risk Metrics
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                <div className="grid grid-cols-2 gap-3">
                    {metrics.map((metric, index) => {
                        const Icon = metric.icon
                        return (
                            <div
                                key={index}
                                className={cn(
                                    "p-3 rounded-lg border",
                                    metric.status === 'danger' && "border-red-500/30 bg-red-500/5",
                                    metric.status === 'warning' && "border-amber-500/30 bg-amber-500/5",
                                    metric.status === 'safe' && "border-green-500/30 bg-green-500/5",
                                    metric.status === 'neutral' && "border-border bg-muted/30"
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className={cn(
                                        "h-3 w-3",
                                        metric.status === 'danger' && "text-red-500",
                                        metric.status === 'warning' && "text-amber-500",
                                        metric.status === 'safe' && "text-green-500",
                                        metric.status === 'neutral' && "text-muted-foreground"
                                    )} />
                                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                                </div>
                                <p className={cn(
                                    "text-lg font-bold",
                                    metric.status === 'danger' && "text-red-500",
                                    metric.status === 'warning' && "text-amber-500",
                                    metric.status === 'safe' && "text-green-500"
                                )}>
                                    {metric.value}
                                </p>
                            </div>
                        )
                    })}
                </div>

                {riskStats.lossStreak >= 3 && (
                    <p className="text-xs text-amber-500 mt-3 text-center flex items-center justify-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Consider taking a break - {riskStats.lossStreak} losses in a row
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
