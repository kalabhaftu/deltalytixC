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
import { cn, BREAK_EVEN_THRESHOLD } from '@/lib/utils'
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
    const hasFetchedRef = useRef<boolean>(false)
    const lastFetchIdRef = useRef<string>('')

    const isLong = trade.side?.toLowerCase() === 'long' || trade.side?.toLowerCase() === 'buy'
    const isProfit = trade.pnl > BREAK_EVEN_THRESHOLD
    const isLoss = trade.pnl < -BREAK_EVEN_THRESHOLD
    const formattedDate = trade.entryDate ? format(parseISO(trade.entryDate), 'MMM d, yyyy') : 'Unknown'
    const formattedTime = trade.entryDate ? format(parseISO(trade.entryDate), 'h:mm a') : ''

    const initChart = async (force: boolean = false) => {
        if (!chartContainerRef.current) return

        // Prevent redundant fetches for the same trade in the same mount cycle
        if (!force && hasFetchedRef.current && lastFetchIdRef.current === trade.id) {
            console.log(`TradeReplay: Skipping redundant fetch for ${trade.id}`)
            return
        }

        setIsLoading(true)
        setError(null)

        console.count(`TradeReplay_Effect_Run_${trade.id}`)
        console.log(`[CLIENT_TRACE] initChart for ${trade.instrument} ${trade.entryDate} (ID: ${trade.id})${force ? ' [FORCE]' : ''}`)

        lastFetchIdRef.current = trade.id
        hasFetchedRef.current = true

        try {
            // Fetch Real Data
            const { data, error: fetchError } = await getMarketData(
                trade.instrument,
                '5m',
                trade.entryDate ? new Date(trade.entryDate) : undefined,
                trade.closeDate ? new Date(trade.closeDate) : undefined,
                trade.id,
                force
            )

            if (fetchError || !data || data.length === 0) {
                setError(fetchError || 'No market data available for this period')
                setIsLoading(false)
                return
            }

            // Timezone adjustment for New York
            const nyTimezone = 'America/New_York'
            const adjustedData = data.map((d: any) => {
                const date = new Date(d.time * 1000)
                const offset = getTimezoneOffset(nyTimezone, date)
                return {
                    ...d,
                    time: (d.time + (offset / 1000)) as Time
                }
            })

            console.log(`[CLIENT] Chart Data: ${adjustedData.length} bars. Range: ${new Date((adjustedData[0].time as number) * 1000).toISOString()} to ${new Date((adjustedData[adjustedData.length - 1].time as number) * 1000).toISOString()}`)

            // Create Chart
            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: 'white' },
                    textColor: 'black',
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.03)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.03)' },
                },
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
                handleScale: true,
                handleScroll: true,
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderColor: 'rgba(42, 46, 57, 0.1)',
                },
                rightPriceScale: {
                    borderColor: 'rgba(42, 46, 57, 0.1)',
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                    },
                }
            })

            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#83b885',
                downColor: 'black',
                borderVisible: true,
                borderColor: 'black',
                wickVisible: true,
                wickUpColor: 'black',
                wickDownColor: 'black',
                borderUpColor: '#83b885',
                borderDownColor: 'black',
            })

            candleSeries.setData(adjustedData as any)

            // Plot Markers - CRITICAL: Use adjustedData to find times
            const markers: any[] = []

            const findNearestAdjustedTime = (targetTimeStr: string) => {
                const targetDate = new Date(targetTimeStr)
                const targetUnix = targetDate.getTime() / 1000
                const offset = getTimezoneOffset(nyTimezone, targetDate)
                const targetAdjusted = targetUnix + (offset / 1000)

                return adjustedData.reduce((prev: any, curr: any) =>
                    Math.abs(Number(curr.time) - targetAdjusted) < Math.abs(Number(prev.time) - targetAdjusted) ? curr : prev
                ).time
            }

            if (trade.entryDate) {
                try {
                    const entryTime = findNearestAdjustedTime(trade.entryDate)
                    markers.push({
                        time: entryTime,
                        position: isLong ? 'belowBar' : 'aboveBar',
                        color: '#2962FF', // Entry: TV Blue
                        shape: isLong ? 'arrowUp' : 'arrowDown',
                        text: `$${Number(trade.entryPrice).toFixed(2)}`,
                        size: 1
                    })
                } catch (e) { console.warn('Failed to place entry marker', e) }
            }

            if (trade.closeDate && trade.closePrice) {
                try {
                    const exitTime = findNearestAdjustedTime(trade.closeDate)
                    markers.push({
                        time: exitTime,
                        position: isLong ? 'aboveBar' : 'belowBar',
                        color: '#F44336', // Exit: TV Red
                        shape: isLong ? 'arrowDown' : 'arrowUp',
                        text: `$${Number(trade.closePrice).toFixed(2)}`,
                        size: 1
                    })
                } catch (e) { console.warn('Failed to place exit marker', e) }
            }

            // @ts-ignore
            createSeriesMarkers(candleSeries, markers)
            chart.timeScale().fitContent()

            // Dynamic Sizing Logic - NOT TO BE PUSHED
            const updateMarkerSize = () => {
                const range = chart.timeScale().getVisibleRange();
                if (!range || !range.from || !range.to) return;

                // Estimate visible bars by looking at adjustedData
                const visibleBars = adjustedData.filter(d =>
                    (d.time as number) >= (range.from as number) &&
                    (d.time as number) <= (range.to as number)
                ).length;

                // User Request: Smaller when zoomed in, Bigger when zoomed out
                // map visibleBars (e.g. 10 to 500) to size (0 to 4)
                let newSize = 1;
                if (visibleBars > 300) newSize = 4;
                else if (visibleBars > 150) newSize = 3;
                else if (visibleBars > 50) newSize = 2;
                else newSize = 1;

                const updatedMarkers = markers.map(m => ({ ...m, size: newSize }));
                // @ts-ignore
                createSeriesMarkers(candleSeries, updatedMarkers);
            };

            chart.timeScale().subscribeVisibleTimeRangeChange(updateMarkerSize);

            chartRef.current = chart
            setIsLoading(false)

        } catch (err) {
            console.error(err)
            setError('Failed to load chart')
            setIsLoading(false)
        }
    }

    useEffect(() => {
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
            if (chartRef.current) {
                chartRef.current.remove()
                chartRef.current = null
            }
            resizeObserver.disconnect()
        }
    }, [trade.id, trade.instrument, trade.entryDate, trade.closeDate, isLong])


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
                    <h3 className="text-sm font-semibold mb-2">Market Data Error</h3>
                    <p className="text-xs text-muted-foreground mb-4">{error}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            hasFetchedRef.current = false;
                            initChart(true);
                        }}
                    >
                        Try Force Refresh
                    </Button>
                </div>
            )}
        </div>
    )
}
