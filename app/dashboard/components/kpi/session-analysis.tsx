'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/context/data-provider'
import {
    Globe,
    Sun,
    Moon,
    Sunrise,
    TrendingUp,
    TrendingDown
} from 'lucide-react'
import { cn, classifyTrade } from '@/lib/utils'
import { parseISO, getHours, format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { useUserStore } from '@/store/user-store'

interface SessionAnalysisProps {
    size?: string
}

// Market sessions in UTC
const SESSIONS = {
    asia: { start: 0, end: 8, name: 'Asia', icon: Moon, color: 'text-purple-500' },
    london: { start: 8, end: 14, name: 'London', icon: Sunrise, color: 'text-blue-500' },
    newYork: { start: 14, end: 21, name: 'New York', icon: Sun, color: 'text-amber-500' },
    overlap: { start: 13, end: 17, name: 'Overlap', icon: Globe, color: 'text-long' }
}

function getSession(hour: number): keyof typeof SESSIONS | null {
    if (hour >= 0 && hour < 8) return 'asia'
    if (hour >= 8 && hour < 14) return 'london'
    if (hour >= 14 && hour < 21) return 'newYork'
    return null
}

export default function SessionAnalysis({ size }: SessionAnalysisProps) {
    const { formattedTrades } = useData()
    const timezone = useUserStore((state) => state.timezone) || 'UTC'

    const sessionStats = useMemo(() => {
        if (!formattedTrades || formattedTrades.length === 0) {
            return null
        }

        const stats: Record<string, { trades: number; wins: number; pnl: number }> = {
            asia: { trades: 0, wins: 0, pnl: 0 },
            london: { trades: 0, wins: 0, pnl: 0 },
            newYork: { trades: 0, wins: 0, pnl: 0 }
        }

        formattedTrades.forEach(trade => {
            if (!trade.entryDate) return

            try {
                const date = parseISO(trade.entryDate)
                const utcHour = date.getUTCHours()
                const session = getSession(utcHour)

                if (session && stats[session]) {
                    stats[session].trades++
                    stats[session].pnl += trade.pnl || 0
                    if (classifyTrade(trade.pnl || 0) === 'win') {
                        stats[session].wins++
                    }
                }
            } catch (e) {
                // Invalid date, skip
            }
        })

        return stats
    }, [formattedTrades])

    if (!sessionStats) {
        return (
            <Card className="h-full">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4 text-blue-500" />
                        Session Analysis
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No trade data available
                    </p>
                </CardContent>
            </Card>
        )
    }

    const sessions = [
        { key: 'asia', ...SESSIONS.asia, ...sessionStats.asia },
        { key: 'london', ...SESSIONS.london, ...sessionStats.london },
        { key: 'newYork', ...SESSIONS.newYork, ...sessionStats.newYork }
    ]

    const bestSession = sessions.reduce((best, current) =>
        current.pnl > best.pnl ? current : best
        , sessions[0])

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Session Analysis
                </CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-3", size === 'small' && "space-y-2 p-3")}>
                {sessions.map(session => {
                    const Icon = session.icon
                    const winRate = session.trades > 0 ? (session.wins / session.trades * 100).toFixed(0) : 0
                    const isPositive = session.pnl >= 0
                    const isBest = session.key === bestSession.key && session.pnl > 0

                    return (
                        <div
                            key={session.key}
                            className={cn(
                                "flex items-center justify-between p-3 rounded-lg border",
                                isBest ? "bg-long/10 border-long/30" : "bg-muted/30 border-border/50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className={cn("h-5 w-5", session.color)} />
                                <div>
                                    <p className="font-medium text-sm">{session.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {session.trades} trades · {winRate}% win
                                    </p>
                                </div>
                            </div>
                            <div className={cn(
                                "text-right font-semibold",
                                isPositive ? "text-long" : "text-short"
                            )}>
                                {isPositive ? '+' : ''}${session.pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                        </div>
                    )
                })}

                {bestSession.pnl > 0 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                        Best performance: {bestSession.name} session
                    </p>
                )}
            </CardContent>
        </Card>
    )
}
