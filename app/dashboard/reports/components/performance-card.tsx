'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Download,
    Share2,
    Copy,
    Check,
    TrendingUp,
    TrendingDown,
    Target,
    Flame,
    Calendar,
    BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import html2canvas from 'html2canvas'

interface PerformanceCardProps {
    period: string
    stats: {
        totalTrades: number
        winRate: string
        totalPnL: number
        longestWinStreak: number
        longestLoseStreak: number
        tradingDays: number
        avgTradesPerMonth: number
    }
    userName?: string
}

export function PerformanceCard({ period, stats, userName }: PerformanceCardProps) {
    const cardRef = useRef<HTMLDivElement>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [isCopied, setIsCopied] = useState(false)

    const isProfit = stats.totalPnL >= 0

    const handleDownload = async () => {
        if (!cardRef.current) return

        setIsExporting(true)
        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                backgroundColor: null,
                useCORS: true,
            })

            const link = document.createElement('a')
            link.download = `trading-performance-${period.toLowerCase().replace(' ', '-')}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()

            toast.success('Performance card downloaded! 📸')
        } catch (error) {
            toast.error('Oops, something went wrong. Try again!')
        } finally {
            setIsExporting(false)
        }
    }

    const handleCopyStats = () => {
        const text = `My ${period} Trading Performance

• Total Trades: ${stats.totalTrades}
• Win Rate: ${stats.winRate}%
• Total P&L: ${isProfit ? '+' : ''}$${stats.totalPnL.toLocaleString()}
• Best Win Streak: ${stats.longestWinStreak}
• Trading Days: ${stats.tradingDays}

#Trading #TradingPerformance #Deltalytix`

        navigator.clipboard.writeText(text)
        setIsCopied(true)
        toast.success('Stats copied! Ready to paste 📋')

        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <div className="space-y-4">
            {/* The shareable card */}
            <div
                ref={cardRef}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-2xl"
            >
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-green-500/10 to-transparent rounded-full blur-2xl" />

                {/* Header */}
                <div className="relative flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                            <BarChart3 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold">Trading Performance</h3>
                            <p className="text-sm text-white/60">{period}</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="border-white/20 text-white/80">
                        {userName || 'Trader'}
                    </Badge>
                </div>

                {/* Main P&L */}
                <div className="relative mb-6 text-center">
                    <p className="text-sm text-white/60 mb-1">Total P&L</p>
                    <p className={cn(
                        "text-4xl font-bold",
                        isProfit ? "text-green-400" : "text-red-400"
                    )}>
                        {isProfit ? '+' : ''}${stats.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                </div>

                {/* Stats grid */}
                <div className="relative grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                        <Target className="h-4 w-4 mx-auto mb-1 text-white/60" />
                        <p className="text-xl font-bold">{stats.totalTrades}</p>
                        <p className="text-xs text-white/60">Trades</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                        <TrendingUp className="h-4 w-4 mx-auto mb-1 text-green-400" />
                        <p className="text-xl font-bold">{stats.winRate}%</p>
                        <p className="text-xs text-white/60">Win Rate</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-white/5 backdrop-blur-sm">
                        <Flame className="h-4 w-4 mx-auto mb-1 text-orange-400" />
                        <p className="text-xl font-bold">{stats.longestWinStreak}</p>
                        <p className="text-xs text-white/60">Best Streak</p>
                    </div>
                </div>

                {/* Bottom stats */}
                <div className="relative flex items-center justify-between text-sm text-white/60">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{stats.tradingDays} active days</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>~{stats.avgTradesPerMonth} trades/month</span>
                    </div>
                </div>

                {/* Watermark */}
                <div className="absolute bottom-2 right-4 text-xs text-white/30">
                    deltalytix
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
                <Button
                    onClick={handleDownload}
                    disabled={isExporting}
                    className="flex-1 gap-2"
                >
                    <Download className="h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Download Image'}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleCopyStats}
                    className="gap-2"
                >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {isCopied ? 'Copied!' : 'Copy Stats'}
                </Button>
            </div>
        </div>
    )
}
