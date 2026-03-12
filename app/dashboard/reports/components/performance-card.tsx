'use client'

import { useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DownloadSimple,
    Copy,
    Check,
    Flame,
    Shield
} from '@phosphor-icons/react'
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
            // Force a specific dimension on the clone to prevent cropping and responsive issues during capture
            const canvas = await html2canvas(cardRef.current, {
                scale: 3,
                backgroundColor: 'hsl(var(--background))',
                useCORS: true,
                onclone: (clonedDoc) => {
                    const clonedCard = clonedDoc.querySelector('[data-performance-card]') as HTMLElement
                    if (clonedCard) {
                        // High-res fixed dimensions for the capture
                        clonedCard.style.width = '800px'
                        clonedCard.style.height = '420px'
                        clonedCard.style.aspectRatio = 'unset'
                        clonedCard.style.maxWidth = 'none'
                        clonedCard.style.margin = '0'
                        clonedCard.style.padding = '32px'
                        clonedCard.style.boxSizing = 'border-box'

                        // Force font visibility and scaling consistency
                        clonedCard.style.display = 'flex'
                        clonedCard.style.flexDirection = 'column'
                        clonedCard.style.justifyContent = 'space-between'
                    }
                }
            })

            const link = document.createElement('a')
            link.download = `deltalytix-performance-${new Date().getTime()}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()

            toast.success('Premium performance card exported!')
        } catch (error) {
            console.error('Export failed:', error)
            toast.error('Failed to export. Please try again.')
        } finally {
            setIsExporting(false)
        }
    }

    const handleCopyStats = () => {
        const text = `SYSTEMATIC PERFORMANCE REPORT [${period.toUpperCase()}]

TOTAL TRADES: ${stats.totalTrades}
WIN RATE: ${stats.winRate}%
NET P&L: ${isProfit ? '+' : ''}$${stats.totalPnL.toLocaleString()}
BEST STREAK: ${stats.longestWinStreak}
ACTIVE DAYS: ${stats.tradingDays}

Verified via Deltalytix Intelligence`

        navigator.clipboard.writeText(text)
        setIsCopied(true)
        toast.success('Report text copied to clipboard')
        setTimeout(() => setIsCopied(false), 2000)
    }

    return (
        <div className="space-y-6">
            {/* The shareable card */}
            <div
                ref={cardRef}
                data-performance-card
                className="relative overflow-hidden rounded-[32px] bg-card p-8 text-card-foreground shadow-[0_32px_64px_-16px_hsl(var(--background)/0.8)] border border-border w-full aspect-[4/5] sm:aspect-[1.91/1] max-w-2xl flex flex-col justify-between"
            >
                {/* Visual Texture & Glows */}
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

                {/* CSS Noise Overlay (Replaces external image) */}
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

                {/* Header Section */}
                <div className="relative z-10 flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-1 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary),0.8)]" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Performance Intelligence</h3>
                        </div>
                        <h2 className="text-2xl font-black tracking-tighter uppercase leading-none mt-1 text-heading-text">
                            {period} <span className="text-muted-foreground italic">Audit</span>
                        </h2>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2 bg-muted/50 backdrop-blur-md border border-border px-3 py-1.5 rounded-full shadow-inner">
                            <Shield weight="light" className="h-3 w-3 text-primary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Verified Account</span>
                        </div>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2">{userName || 'TRADER_X'}</span>
                    </div>
                </div>

                {/* Main Metric Focus */}
                <div className="relative z-10 py-8 flex flex-col items-center">
                    <div className="flex flex-col items-center">
                        <span className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground mb-2">Net P&L Result</span>
                        <div className="relative">
                            <div className={cn(
                                "text-7xl font-black tracking-[calc(-0.05em)] leading-none",
                                isProfit ? "text-profit shadow-[0_0_40px_-10px_hsl(var(--chart-profit)/0.3)]" : "text-loss"
                            )}>
                                {isProfit ? '+' : ''}${Math.abs(stats.totalPnL).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </div>
                            {isProfit && (
                                <div className="absolute -top-4 -right-8">
                                    <Flame weight="light" className="h-8 w-8 text-profit animate-pulse blur-[1px]" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* High Density Grid */}
                <div className="relative z-10 grid grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border backdrop-blur-sm flex flex-col justify-center items-center group hover:bg-muted/40 transition-colors">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Execution</span>
                        <div className="text-xl font-black tracking-tighter text-heading-text">{stats.totalTrades}</div>
                        <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">Total Trades</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border backdrop-blur-sm flex flex-col justify-center items-center">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Edge Accuracy</span>
                        <div className={cn(
                            "text-xl font-black tracking-tighter",
                            parseFloat(stats.winRate) >= 50 ? "text-primary" : "text-chart-5"
                        )}>{stats.winRate}%</div>
                        <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">Win Rate</span>
                    </div>
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border backdrop-blur-sm flex flex-col justify-center items-center">
                         <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Consistency</span>
                        <div className="text-xl font-black tracking-tighter text-chart-1">{stats.longestWinStreak}</div>
                        <span className="text-[8px] font-bold text-muted-foreground/60 uppercase">Max Streak</span>
                    </div>
                </div>

                {/* Info Footer */}
                <div className="relative z-10 pt-6 flex items-center justify-between border-t border-border">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Active Horizon</span>
                            <span className="text-[10px] font-black text-foreground tracking-tighter">{stats.tradingDays} SESSIONS</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground">Volume Index</span>
                            <span className="text-[10px] font-black text-foreground tracking-tighter">{stats.avgTradesPerMonth} TRADES/MO</span>
                        </div>
                    </div>

                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5 grayscale opacity-50">
                            <div className="text-[10px] font-black tracking-tighter">DELTALYTIX</div>
                            <div className="h-3 w-3 rounded-sm bg-primary" />
                        </div>
                        <span className="text-[6px] font-bold text-muted-foreground/60 uppercase tracking-[0.3em] mt-1">High-Frequency Intelligence</span>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                    onClick={handleDownload}
                    disabled={isExporting}
                    className="w-full sm:flex-1 h-12 gap-3 bg-primary hover:bg-primary-hover active:bg-primary-press text-primary-foreground font-black uppercase tracking-tighter text-xs rounded-xl shadow-[0_8px_16px_-4px_hsl(var(--chart-profit)/0.3)] transition-all hover:translate-y-[-2px] active:translate-y-[0px]"
                >
                    <DownloadSimple weight="light" className="h-4 w-4" />
                    {isExporting ? 'Generating Premium Render...' : 'Export High-Res Image'}
                </Button>
                <Button
                    variant="outline"
                    onClick={handleCopyStats}
                    className="w-full sm:w-auto h-12 gap-3 border-border bg-card hover:bg-accent text-card-foreground font-black uppercase tracking-tighter text-xs rounded-xl transition-all"
                >
                    {isCopied ? <Check weight="light" className="h-4 w-4 text-primary" /> : <Copy weight="light" className="h-4 w-4" />}
                    {isCopied ? 'Intelligence Copied' : 'Copy Data'}
                </Button>
            </div>
        </div>
    )
}

