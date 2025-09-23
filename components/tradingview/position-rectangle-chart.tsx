'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'

interface PositionRectangleChartProps {
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

export function PositionRectangleChart({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  showControls = true,
  tradeData
}: PositionRectangleChartProps) {
  
  // Calculate appropriate interval based on trade duration
  const calculateInterval = useMemo(() => {
    if (!tradeData) return 'D'
    
    const timeDiff = tradeData.exitTime.getTime() - tradeData.entryTime.getTime()
    const hours = timeDiff / (1000 * 60 * 60)
    
    if (hours <= 1) return '1'
    if (hours <= 4) return '5'
    if (hours <= 24) return '15'
    if (hours <= 72) return '60'
    return 'D'
  }, [tradeData])

  // Create Pine Script for position rectangle visualization
  const pineScript = useMemo(() => {
    if (!tradeData) return ''

    const isLong = tradeData.side.toUpperCase() === 'LONG' || tradeData.side.toUpperCase() === 'BUY'
    const entryTimestamp = Math.floor(tradeData.entryTime.getTime() / 1000)
    const exitTimestamp = Math.floor(tradeData.exitTime.getTime() / 1000)
    
    return `
//@version=5
indicator("Position Rectangle", overlay=true)

// Trade data
entry_time = ${entryTimestamp}
exit_time = ${exitTimestamp}
entry_price = ${tradeData.entryPrice}
exit_price = ${tradeData.exitPrice}
is_long = ${isLong}
pnl = ${tradeData.pnl}

// Position rectangle color
rect_color = is_long ? color.new(color.blue, 85) : color.new(color.red, 85)
border_color = is_long ? color.blue : color.red

// Create the position rectangle (like the blue box in your image)
if barstate.islast
    // Calculate rectangle coordinates
    top_price = math.max(entry_price, exit_price)
    bottom_price = math.min(entry_price, exit_price)
    
    // Add padding to make rectangle more visible
    price_diff = math.abs(exit_price - entry_price)
    padding = price_diff > 0 ? price_diff * 0.1 : entry_price * 0.001
    
    // Create the shaded rectangle spanning the trade duration
    box.new(
        left=entry_time, 
        top=top_price + padding, 
        right=exit_time, 
        bottom=bottom_price - padding,
        bgcolor=rect_color,
        border_color=border_color,
        border_width=2,
        border_style=line.style_solid
    )
    
    // Add entry marker
    label.new(
        x=entry_time, 
        y=entry_price, 
        text="ENTRY\\n" + str.tostring(entry_price), 
        color=border_color, 
        textcolor=color.white, 
        style=label.style_label_right,
        size=size.normal
    )
    
    // Add exit marker
    exit_color = pnl >= 0 ? color.green : color.red
    label.new(
        x=exit_time, 
        y=exit_price, 
        text="EXIT\\n" + str.tostring(exit_price) + "\\nP&L: $" + str.tostring(pnl), 
        color=exit_color, 
        textcolor=color.white, 
        style=label.style_label_left,
        size=size.normal
    )
    
    // Add position type label
    mid_time = math.round((entry_time + exit_time) / 2)
    mid_price = (top_price + bottom_price) / 2
    
    label.new(
        x=mid_time, 
        y=mid_price, 
        text=is_long ? "LONG POSITION" : "SHORT POSITION", 
        color=color.new(color.white, 20), 
        textcolor=border_color, 
        style=label.style_label_center,
        size=size.large
    )
`
  }, [tradeData])

  // Generate TradingView widget URL with Pine Script
  const iframeUrl = useMemo(() => {
    const baseUrl = 'https://www.tradingview.com/widgetembed/'
    
    const params = new URLSearchParams()
    params.append('frameElementId', 'tradingview_position_rectangle')
    params.append('symbol', symbol)
    params.append('interval', calculateInterval)
    params.append('hidesidetoolbar', '1')
    params.append('symboledit', '1')
    params.append('saveimage', '1')
    params.append('toolbarbg', 'f1f3f6')
    params.append('theme', 'light')
    params.append('style', '1')
    params.append('timezone', 'Etc/UTC')
    params.append('studies_overrides', '{}')
    params.append('overrides', '{}')
    params.append('enabled_features', '[]')
    params.append('disabled_features', 'use_localstorage_for_settings')
    params.append('locale', 'en')
    params.append('utm_source', 'localhost')
    params.append('utm_medium', 'widget_new')
    params.append('utm_campaign', 'chart')
    params.append('utm_term', symbol.replace(':', '_'))

    // Skip Pine Script to avoid URI too large error - use simple approach
    // Will create basic rectangle overlay instead

    return `${baseUrl}?${params.toString()}`
  }, [symbol, calculateInterval, pineScript])

  // Generate unique key for iframe
  const iframeKey = useMemo(() => {
    if (tradeData) {
      return `${symbol}_position_${tradeData.entryTime.getTime()}_${tradeData.exitTime.getTime()}`
    }
    return `${symbol}_position`
  }, [symbol, tradeData])

  const positionType = tradeData?.side.toUpperCase() === 'LONG' || tradeData?.side.toUpperCase() === 'BUY' ? 'LONG' : 'SHORT'

  return (
    <Card className={className}>
      {showControls && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Position Visualization</CardTitle>
              {tradeData && (
                <Badge 
                  variant="outline" 
                  className={`${positionType === 'LONG' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                >
                  {positionType} POSITION
                </Badge>
              )}
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
          <iframe
            key={iframeKey}
            src={iframeUrl}
            width="100%"
            height="100%"
            style={{
              border: 'none',
              margin: 0,
              padding: 0,
              display: 'block'
            }}
            title={`Position Rectangle Chart for ${symbol}`}
          />
        </div>
      </CardContent>

      {showControls && tradeData && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Powered by TradingView • Position Rectangle Visualization
            </div>
            <div className="flex items-center gap-4">
              <span>Symbol: {symbol}</span>
              <span>Interval: {calculateInterval}</span>
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

export default PositionRectangleChart
