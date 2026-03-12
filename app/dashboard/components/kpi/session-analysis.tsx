'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/context/data-provider'
import { getTradingSession, MarketSession } from '@/lib/time-utils'
import { classifyTrade, cn } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import {
    Globe,
    Moon,
    Sun,
    SunHorizon
} from "@phosphor-icons/react"
import { useMemo } from 'react'

interface SessionAnalysisProps {
    size?: string
}

// Market sessions in NY time (for display metadata)
const SESSION_META: Record<MarketSession, { name: string; icon: any; color: string }> = {
    'New York': { name: 'New York', icon: Sun, color: 'text-amber-500' },
    'London': { name: 'London', icon: SunHorizon, color: 'text-blue-500' },
    'Asia': { name: 'Asia', icon: Moon, color: 'text-purple-500' },
    'Outside Session': { name: 'Outside Session', icon: Globe, color: 'text-muted-foreground' }
}

export default function SessionAnalysis({ size }: SessionAnalysisProps) {
    const { formattedTrades } = useData()
    const timezone = useUserStore((state) => state.timezone) || 'America/New_York'

    const sessionStats = useMemo(() => {
        if (!formattedTrades || formattedTrades.length === 0) {
            return null
        }

        const stats: Record<string, { trades: number; wins: number; pnl: number }> = {
            'New York': { trades: 0, wins: 0, pnl: 0 },
            'London': { trades: 0, wins: 0, pnl: 0 },
            'Asia': { trades: 0, wins: 0, pnl: 0 },
            'Outside Session': { trades: 0, wins: 0, pnl: 0 }
        }

        formattedTrades.forEach(trade => {
            if (!trade.entryDate) return

            try {
                const session = getTradingSession(trade.entryDate)

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
                        <Globe weight="light" className="h-4 w-4 text-blue-500" />
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
        { key: 'New York', ...SESSION_META['New York'], ...sessionStats['New York'] },
        { key: 'London', ...SESSION_META['London'], ...sessionStats['London'] },
        { key: 'Asia', ...SESSION_META['Asia'], ...sessionStats['Asia'] },
        { key: 'Outside Session', ...SESSION_META['Outside Session'], ...sessionStats['Outside Session'] }
    ]

    const bestSession = sessions.reduce((best, current) =>
        current.pnl > best.pnl ? current : best
        , sessions[0])

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Globe weight="light" className="h-4 w-4 text-blue-500" />
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
                                <Icon weight="light" className={cn("h-5 w-5", session.color)} />
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
