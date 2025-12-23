'use client'

import { useMemo, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    ZoomIn,
    ZoomOut,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Calendar,
    Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO, differenceInDays } from 'date-fns'

interface TradeReplayProps {
    trade: {
        id: string
        entryDate: string
        closeDate?: string | null
        instrument: string
        side?: string | null
        entryPrice: string | number
        closePrice?: string | number | null
        pnl: number
        quantity: number
    }
    onClose?: () => void
}


// Maximum days back that TradingView free data supports (approximately)
const MAX_DATA_DAYS = 365

export default function TradeReplay({ trade, onClose }: TradeReplayProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isDataAvailable, setIsDataAvailable] = useState(true)
    const [isPlaying, setIsPlaying] = useState(false)

    // Check if trade is within data availability window
    const dataAvailability = useMemo(() => {
        if (!trade.entryDate) return { available: false, daysSince: 0 }

        const tradeDate = parseISO(trade.entryDate)
        const daysSince = differenceInDays(new Date(), tradeDate)

        return {
            available: daysSince <= MAX_DATA_DAYS,
            daysSince
        }
    }, [trade.entryDate])

    useEffect(() => {
        setIsDataAvailable(dataAvailability.available)
    }, [dataAvailability])

    const isProfit = trade.pnl > 0
    const formattedDate = trade.entryDate ? format(parseISO(trade.entryDate), 'MMM d, yyyy') : 'Unknown'
    const formattedTime = trade.entryDate ? format(parseISO(trade.entryDate), 'h:mm a') : ''

    if (!isDataAvailable) {
        return (
            <Card className="w-full">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-amber-500" />
                            Trade Replay
                        </CardTitle>
                        <Badge variant="secondary">{trade.instrument}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">This trade is from a while back!</h3>
                        <p className="text-sm text-muted-foreground max-w-md mb-4">
                            TradingView's free data only goes back about a year, so we can't show the chart for this {dataAvailability.daysSince}-day-old trade.
                            But don't worry — your trade data is still safely stored.
                        </p>

                        {/* Trade Summary Card */}
                        <div className="w-full max-w-sm bg-muted/50 rounded-lg p-4 mt-2">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="text-left">
                                    <p className="text-muted-foreground">Entry Price</p>
                                    <p className="font-medium">${Number(trade.entryPrice).toFixed(2)}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-muted-foreground">Exit Price</p>
                                    <p className="font-medium">${trade.closePrice ? Number(trade.closePrice).toFixed(2) : 'Open'}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-muted-foreground">Side</p>
                                    <p className={cn(
                                        "font-medium",
                                        trade.side?.toLowerCase() === 'long' || trade.side?.toLowerCase() === 'buy' ? 'text-green-500' : 'text-red-500'
                                    )}>
                                        {(trade.side || 'Unknown').toUpperCase()}
                                    </p>
                                </div>
                                <div className="text-left">
                                    <p className="text-muted-foreground">P&L</p>
                                    <p className={cn(
                                        "font-medium",
                                        isProfit ? 'text-green-500' : 'text-red-500'
                                    )}>
                                        {isProfit ? '+' : ''}${trade.pnl.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Trade Replay</CardTitle>
                        <Badge variant={trade.side?.toLowerCase() === 'long' || trade.side?.toLowerCase() === 'buy' ? 'default' : 'destructive'}>
                            {(trade.side || 'Unknown').toUpperCase()}
                        </Badge>
                        <Badge variant="secondary">{trade.instrument}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{formattedDate}</span>
                        <Clock className="h-4 w-4 ml-2" />
                        <span>{formattedTime}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Chart Container */}
                <div
                    ref={containerRef}
                    className="w-full h-[400px] bg-muted/30 rounded-lg flex items-center justify-center border border-border/50"
                >
                    <div className="text-center text-muted-foreground">
                        <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">Chart visualization coming soon!</p>
                        <p className="text-xs mt-1">TradingView integration in progress</p>
                    </div>
                </div>

                {/* Trade Info Bar */}
                <div className="flex items-center justify-between mt-4 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-xs text-muted-foreground">Entry</p>
                            <p className="font-medium text-green-500 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                ${Number(trade.entryPrice).toFixed(2)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Exit</p>
                            <p className="font-medium text-red-500 flex items-center gap-1">
                                <TrendingDown className="h-3 w-3" />
                                ${trade.closePrice ? Number(trade.closePrice).toFixed(2) : 'Open'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Qty</p>
                            <p className="font-medium">{trade.quantity}</p>
                        </div>
                    </div>

                    <div className={cn(
                        "text-xl font-bold",
                        isProfit ? "text-green-500" : "text-red-500"
                    )}>
                        {isProfit ? '+' : ''}${trade.pnl.toFixed(2)}
                    </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-2 mt-4">
                    <Button variant="outline" size="icon" disabled>
                        <SkipBack className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="default"
                        size="icon"
                        className="h-10 w-10"
                        onClick={() => setIsPlaying(!isPlaying)}
                        disabled
                    >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </Button>
                    <Button variant="outline" size="icon" disabled>
                        <SkipForward className="h-4 w-4" />
                    </Button>
                    <div className="border-l border-border h-6 mx-2" />
                    <Button variant="outline" size="icon" disabled>
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" disabled>
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground mt-3">
                    Full chart replay coming in a future update
                </p>
            </CardContent>
        </Card>
    )
}
