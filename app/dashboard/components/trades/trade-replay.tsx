'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Calendar,
    Clock,
    TrendingUp,
    TrendingDown,
    Loader2,
    AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts'
import { getMarketData } from '@/app/actions/get-market-data'
import { CHART_COLORS } from '@/lib/constants'
import { getTimezoneOffset } from 'date-fns-tz'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'

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

export default function TradeReplay({ trade, onClose }: TradeReplayProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null)
    const chartRef = useRef<IChartApi | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const isLong = trade.side?.toLowerCase() === 'long' || trade.side?.toLowerCase() === 'buy'
    const isProfit = trade.pnl > 0
    const formattedDate = trade.entryDate ? format(parseISO(trade.entryDate), 'MMM d, yyyy') : 'Unknown'
    const formattedTime = trade.entryDate ? format(parseISO(trade.entryDate), 'h:mm a') : ''

    useEffect(() => {
        let isMounted = true

        const initChart = async () => {
            if (!chartContainerRef.current) return

            setIsLoading(true)
            setError(null)

            try {
                // Fetch Real Data
                const { data, error: fetchError } = await getMarketData(
                    trade.instrument,
                    '5m',
                    trade.entryDate ? new Date(trade.entryDate) : undefined,
                    trade.closeDate ? new Date(trade.closeDate) : undefined
                )

                if (fetchError || !data || data.length === 0) {
                    if (isMounted) setError(fetchError || 'No market data available for this period')
                    setIsLoading(false)
                    return
                }

                if (!isMounted) return

                // Timezone adjustment for New York
                // we shift the timestamps by the offset to "trick" lightweight charts into showing NY time
                const nyTimezone = 'America/New_York'
                const adjustedData = data.map((d: any) => {
                    const date = new Date(d.time * 1000)
                    // Get offset in milliseconds
                    const offset = getTimezoneOffset(nyTimezone, date)
                    return {
                        ...d,
                        time: (d.time + (offset / 1000)) as Time
                    }
                })

                // Create Chart
                const chart = createChart(chartContainerRef.current, {
                    layout: {
                        background: { type: ColorType.Solid, color: 'transparent' },
                        textColor: '#9ca3af',
                    },
                    grid: {
                        vertLines: { color: 'rgba(42, 46, 57, 0.05)' },
                        horzLines: { color: 'rgba(42, 46, 57, 0.05)' },
                    },
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                    handleScale: true,
                    handleScroll: true,
                    timeScale: {
                        timeVisible: true,
                        secondsVisible: false,
                        borderColor: 'rgba(42, 46, 57, 0.2)',
                    },
                    rightPriceScale: {
                        borderColor: 'rgba(42, 46, 57, 0.2)',
                        scaleMargins: {
                            top: 0.1,
                            bottom: 0.1,
                        },
                    }
                })

                const candleSeries = chart.addSeries(CandlestickSeries, {
                    upColor: CHART_COLORS.UP,
                    downColor: CHART_COLORS.DOWN,
                    borderVisible: false,
                    wickUpColor: CHART_COLORS.UP,
                    wickDownColor: CHART_COLORS.DOWN,
                })

                candleSeries.setData(adjustedData as any)

                // Plot Markers
                const markers: any[] = []

                // Need to find nearest candle time for entry/exit to place marker on top of it
                // Lightweight charts requires marker time to match a candle time exactly
                const findNearestTime = (targetTimeStr: string) => {
                    const target = new Date(targetTimeStr).getTime() / 1000
                    // Find candle with smallest time difference
                    return data.reduce((prev: any, curr: any) =>
                        Math.abs(curr.time - target) < Math.abs(prev.time - target) ? curr : prev
                    ).time
                }

                if (trade.entryDate) {
                    const entryTime = findNearestTime(trade.entryDate)
                    markers.push({
                        time: entryTime,
                        position: isLong ? 'belowBar' : 'aboveBar',
                        color: isLong ? CHART_COLORS.UP : CHART_COLORS.DOWN,
                        shape: isLong ? 'arrowUp' : 'arrowDown',
                        text: `ENTRY $${Number(trade.entryPrice).toFixed(2)}`,
                        size: 2
                    })
                }

                if (trade.closeDate && trade.closePrice) {
                    const exitTime = findNearestTime(trade.closeDate)
                    // Ensure exit marker doesn't overwrite entry if same candle (rare for 5m but possible)
                    // If same, we might barely offset or just accept overlap priority

                    markers.push({
                        time: exitTime,
                        position: isLong ? 'aboveBar' : 'belowBar',
                        color: isLong ? CHART_COLORS.DOWN : CHART_COLORS.UP, // Exit color opposite
                        shape: isLong ? 'arrowDown' : 'arrowUp',
                        text: `EXIT $${Number(trade.closePrice).toFixed(2)}`,
                        size: 2
                    })
                }

                // @ts-ignore
                createSeriesMarkers(candleSeries, markers)

                chart.timeScale().fitContent()

                chartRef.current = chart
                setIsLoading(false)

            } catch (err) {
                console.error(err)
                if (isMounted) setError('Failed to load chart')
                setIsLoading(false)
            }
        }

        initChart()

        // Robust ResizeObserver that handles exact container dimensions
        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries[0].contentRect || !chartRef.current) return
            const { width, height } = entries[0].contentRect
            // Only resize if dimensions are valid and changed
            if (width > 0 && height > 0) {
                chartRef.current.applyOptions({ width, height })
            }
        })

        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current)
        }

        return () => {
            isMounted = false
            resizeObserver.disconnect()
            if (chartRef.current) {
                chartRef.current.remove()
                chartRef.current = null
            }
        }
    }, [trade, isLong])


    return (
        <div className="w-full h-full relative">
            <div ref={chartContainerRef} className="absolute inset-0 w-full h-full" />

            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-20 transition-opacity duration-500 backdrop-blur-sm">
                    <div className="w-full h-full p-4 space-y-2">
                        <Skeleton className="h-3 w-20 mb-4" />
                        <Skeleton className="h-full w-full rounded" />
                    </div>
                </div>
            )}

            {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-20 p-6 text-center">
                    <AlertCircle className="h-10 w-10 text-destructive mb-4" />
                    <h3 className="text-sm font-semibold mb-2">Error</h3>
                    <p className="text-xs text-muted-foreground">{error}</p>
                </div>
            )}
        </div>
    )
}
