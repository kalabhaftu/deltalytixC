'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3 } from 'lucide-react'
import { useTheme } from 'next-themes'

interface WorkingPositionChartProps {
  symbol?: string
  height?: number
  className?: string
  showControls?: boolean
  tradeData?: {
    entryTime: Date
    exitTime: Date
    entryPrice: number
    exitPrice: number
    side: string
    pnl: number
  }
}

export function WorkingPositionChart({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  showControls = true,
  tradeData
}: WorkingPositionChartProps) {
  
  const [selectedInterval, setSelectedInterval] = useState('15')
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])
  
  const intervals = [
    { value: '1', label: '1 minute' },
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '240', label: '4 hours' },
    { value: 'D', label: '1 day' }
  ]

  // Create TradingView widget URL with position visualization
  const iframeUrl = useMemo(() => {
    if (!mounted) return ''
    
    const isDark = resolvedTheme === 'dark'
    const baseUrl = 'https://www.tradingview.com/widgetembed/'
    const params = new URLSearchParams()
    
    params.append('frameElementId', 'tradingview_chart')
    params.append('symbol', symbol)
    params.append('interval', selectedInterval)
    params.append('timezone', 'America/New_York') // UTC-4
    params.append('theme', isDark ? 'dark' : 'light')
    params.append('style', '1')
    params.append('locale', 'en')
    params.append('toolbar_bg', isDark ? '2a2e39' : 'f1f3f6')
    params.append('enable_publishing', 'false')
    params.append('hide_top_toolbar', 'false')
    params.append('hide_legend', 'false')
    params.append('allow_symbol_change', 'true')
    params.append('save_image', 'false')
    
    // Remove volume indicator and configure theme-aware overrides
    params.append('studies_overrides', JSON.stringify({
      "volume.volume.color.0": "rgba(0,0,0,0)",
      "volume.volume.color.1": "rgba(0,0,0,0)", 
      "volume.volume.transparency": 100
    }))
    
    params.append('overrides', JSON.stringify({
      "paneProperties.background": isDark ? "#1e222d" : "#ffffff",
      "paneProperties.backgroundGradientStartColor": isDark ? "#1e222d" : "#ffffff",
      "paneProperties.backgroundGradientEndColor": isDark ? "#1e222d" : "#ffffff",
      "paneProperties.backgroundType": "solid",
      "paneProperties.vertGridProperties.color": isDark ? "#2a2e39" : "#e1e1e1",
      "paneProperties.horzGridProperties.color": isDark ? "#2a2e39" : "#e1e1e1",
      "symbolWatermarkProperties.transparency": 90,
      "scalesProperties.textColor": isDark ? "#d1d4dc" : "#131722",
      "scalesProperties.backgroundColor": isDark ? "#1e222d" : "#ffffff"
    }))
    
    params.append('disabled_features', JSON.stringify([
      "use_localstorage_for_settings",
      "volume_force_overlay", 
      "create_volume_indicator_by_default"
    ]))
    
    params.append('utm_source', 'localhost')

    // Navigate chart to trade date range (minimal URL parameters)
    if (tradeData) {
      // Calculate chart time range to show the trade period
      const entryTime = tradeData.entryTime.getTime()
      const exitTime = tradeData.exitTime.getTime()
      const tradeDuration = exitTime - entryTime
      
      // Add padding before and after the trade
      const padding = Math.max(tradeDuration * 0.3, 2 * 60 * 60 * 1000) // 30% padding or 2 hours minimum
      const chartStartTime = entryTime - padding
      
      // Convert to TradingView format (seconds since epoch) - only set start time to navigate back
      const fromTimestamp = Math.floor(chartStartTime / 1000)
      
      // Use 'from' parameter to navigate to historical data
      params.append('from', fromTimestamp.toString())
      
      // Add minimal Pine Script for position markers (very short to avoid URL length issues)
      const entryTimeSeconds = Math.floor(entryTime / 1000)
      const exitTimeSeconds = Math.floor(exitTime / 1000)
      
      const miniScript = `//@version=5
indicator("Trade",overlay=true)
et=${entryTimeSeconds}
xt=${exitTimeSeconds}
ep=${tradeData.entryPrice}
xp=${tradeData.exitPrice}
if time>=et and time<=xt
    line.new(et,ep,xt,xp,color=${tradeData.pnl >= 0 ? 'color.green' : 'color.red'},width=2,xloc=xloc.bar_time)
if time==et
    label.new(et,ep,"ENTRY",xloc=xloc.bar_time,color=color.gray,textcolor=color.white,style=label.style_label_down)
if time==xt
    label.new(xt,xp,"EXIT",xloc=xloc.bar_time,color=${tradeData.pnl >= 0 ? 'color.green' : 'color.red'},textcolor=color.white,style=label.style_label_up)`

      try {
        const encoded = encodeURIComponent(miniScript.replace(/\s+/g, ' ').trim())
        if (encoded.length < 3000) {
          params.append('studies', encoded)
        }
      } catch (e) {
        console.warn('Pine Script failed')
      }
    }

    return `${baseUrl}?${params.toString()}`
  }, [symbol, selectedInterval, tradeData, mounted, resolvedTheme])

  const iframeKey = useMemo(() => {
    if (tradeData && mounted) {
      return `${symbol}_${selectedInterval}_${tradeData.entryTime.getTime()}_${tradeData.exitTime.getTime()}_${resolvedTheme}`
    }
    return `${symbol}_${selectedInterval}_${resolvedTheme}`
  }, [symbol, selectedInterval, tradeData, mounted, resolvedTheme])

  const positionType = tradeData?.side.toUpperCase() === 'LONG' || tradeData?.side.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT'

  return (
    <Card className={className}>
      {showControls && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Position Chart</CardTitle>
              {tradeData && (
                <Badge 
                  variant="outline" 
                  className={`${positionType === 'LONG' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                >
                  {positionType} POSITION
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Select value={selectedInterval} onValueChange={setSelectedInterval}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intervals.map((interval) => (
                    <SelectItem key={interval.value} value={interval.value}>
                      {interval.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent className="p-0">
        <div
          style={{
            height: `${height}px`,
            width: '100%'
          }}
          className="relative overflow-hidden rounded-lg"
        >
          {mounted && iframeUrl ? (
            <iframe
              key={iframeKey}
              src={iframeUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{
                border: 'none',
                margin: 0,
                padding: 0,
                display: 'block'
              }}
              title={`Position Chart for ${symbol}`}
              allow="fullscreen"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
              <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
            </div>
          )}
          
        </div>
      </CardContent>

      {showControls && tradeData && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Powered by TradingView • UTC-4 Timezone</div>
            <div className="flex items-center gap-4">
              <span>Symbol: {symbol}</span>
              <span>Timeframe: {intervals.find(i => i.value === selectedInterval)?.label}</span>
              <span className={`font-medium ${tradeData.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                P&L: {tradeData.pnl >= 0 ? '+' : ''}${tradeData.pnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default WorkingPositionChart
