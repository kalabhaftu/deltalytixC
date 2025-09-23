'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'

interface SimplePositionChartProps {
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

export function SimplePositionChart({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  showControls = true,
  tradeData
}: SimplePositionChartProps) {
  
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

  const iframeUrl = useMemo(() => {
    const baseUrl = 'https://www.tradingview.com/widgetembed/'
    const params = new URLSearchParams()
    params.append('frameElementId', 'tradingview_simple_chart')
    params.append('symbol', symbol)
    params.append('interval', calculateInterval)
    params.append('hidesidetoolbar', '1')
    params.append('saveimage', '1')
    params.append('toolbarbg', 'f1f3f6')
    params.append('theme', 'light')
    params.append('style', '1')
    params.append('timezone', 'Etc/UTC')
    params.append('locale', 'en')
    params.append('utm_source', 'localhost')

    return `${baseUrl}?${params.toString()}`
  }, [symbol, calculateInterval])

  const iframeKey = useMemo(() => {
    if (tradeData) {
      return `${symbol}_${tradeData.entryTime.getTime()}_${tradeData.exitTime.getTime()}`
    }
    return symbol
  }, [symbol, tradeData])

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
            title={`Chart for ${symbol}`}
          />
          
        </div>
      </CardContent>

      {showControls && tradeData && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Powered by TradingView</div>
            <div className="flex items-center gap-4">
              <span>Symbol: {symbol}</span>
              <span>Interval: {calculateInterval}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default SimplePositionChart
