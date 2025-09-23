'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'

interface TradingViewIframeWidgetProps {
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

export function TradingViewIframeWidget({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  showControls = true,
  tradeData
}: TradingViewIframeWidgetProps) {
  
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

  // Generate TradingView iframe URL
  const iframeUrl = useMemo(() => {
    const baseUrl = 'https://www.tradingview.com/widgetembed/'
    const params = new URLSearchParams({
      frameElementId: 'tradingview_iframe',
      symbol: symbol,
      interval: calculateInterval,
      hidesidetoolbar: '1',
      symboledit: '1',
      saveimage: '1',
      toolbarbg: 'f1f3f6',
      studies: 'MASimple@tv-basicstudies',
      theme: 'light',
      style: '1',
      timezone: 'Etc/UTC',
      studies_overrides: '{}',
      overrides: '{}',
      enabled_features: '[]',
      disabled_features: '[]',
      locale: 'en',
      utm_source: 'localhost',
      utm_medium: 'widget_new',
      utm_campaign: 'chart',
      utm_term: symbol.replace(':', '_')
    })

    return `${baseUrl}?${params.toString()}`
  }, [symbol, calculateInterval])

  // Generate unique key for iframe to force refresh when needed
  const iframeKey = useMemo(() => {
    if (tradeData) {
      return `${symbol}_${tradeData.entryTime.getTime()}_${tradeData.exitTime.getTime()}`
    }
    return symbol
  }, [symbol, tradeData])

  return (
    <Card className={className}>
      {showControls && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <CardTitle>TradingView Chart</CardTitle>
              <Badge variant="outline">Live Data</Badge>
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
            frameBorder="0"
            allowTransparency={true}
            scrolling="no"
            style={{
              border: 'none',
              margin: 0,
              padding: 0,
              display: 'block'
            }}
            title={`TradingView Chart for ${symbol}`}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
          
          {/* Trade markers overlay - positioned absolutely */}
          {tradeData && (
            <div className="absolute top-4 left-4 z-10 space-y-2">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                <div className="text-sm font-medium text-gray-900 mb-2">
                  Trade Details
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Side:</span>
                    <span className={`font-medium ${
                      tradeData.side.toUpperCase() === 'LONG' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tradeData.side.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Entry:</span>
                    <span className="font-medium">{tradeData.entryPrice.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exit:</span>
                    <span className="font-medium">{tradeData.exitPrice.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">P&L:</span>
                    <span className={`font-medium ${
                      tradeData.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {tradeData.pnl >= 0 ? '+' : ''}${tradeData.pnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Entry Time:</span>
                    <span>{tradeData.entryTime.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Exit Time:</span>
                    <span>{tradeData.exitTime.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Chart Information */}
      {showControls && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Powered by TradingView • Real-time data
            </div>
            <div>
              Symbol: {symbol} • Interval: {calculateInterval}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default TradingViewIframeWidget
