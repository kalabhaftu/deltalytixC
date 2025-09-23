'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, TrendingUp, ArrowUp, ArrowDown, DollarSign, Clock, BarChart3 } from 'lucide-react'

interface ChartWithPositionOverlayProps {
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

export function ChartWithPositionOverlay({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  showControls = true,
  tradeData
}: ChartWithPositionOverlayProps) {
  
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

  // Calculate risk/reward metrics and position levels
  const positionMetrics = useMemo(() => {
    if (!tradeData) return null

    const isLong = tradeData.side.toUpperCase() === 'LONG' || tradeData.side.toUpperCase() === 'BUY'
    const entryPrice = tradeData.entryPrice
    const exitPrice = tradeData.exitPrice
    const pnl = tradeData.pnl
    
    // Calculate position metrics
    const actualMove = exitPrice - entryPrice
    const actualMovePercent = (actualMove / entryPrice) * 100
    
    // Calculate implied risk management levels based on actual trade
    const priceRange = Math.abs(actualMove)
    const stopLoss = isLong ? entryPrice - (priceRange * 0.6) : entryPrice + (priceRange * 0.6)
    const takeProfit = isLong ? entryPrice + (priceRange * 1.8) : entryPrice - (priceRange * 1.8)
    
    const risk = Math.abs(entryPrice - stopLoss)
    const reward = Math.abs(takeProfit - entryPrice)
    const riskRewardRatio = reward / risk

    // Calculate price levels for visualization
    const allPrices = [entryPrice, exitPrice, stopLoss, takeProfit]
    const maxPrice = Math.max(...allPrices)
    const minPrice = Math.min(...allPrices)
    const priceRange_viz = maxPrice - minPrice
    const padding = priceRange_viz * 0.1

    return {
      isLong,
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      risk,
      reward,
      riskRewardRatio,
      actualMove,
      actualMovePercent,
      pnl,
      maxPrice: maxPrice + padding,
      minPrice: minPrice - padding,
      priceRange: priceRange_viz + (padding * 2)
    }
  }, [tradeData])

  // Generate TradingView iframe URL
  const iframeUrl = useMemo(() => {
    const baseUrl = 'https://www.tradingview.com/widgetembed/'
    const params = new URLSearchParams({
      frameElementId: 'tradingview_position_chart',
      symbol: symbol,
      interval: calculateInterval,
      hidesidetoolbar: '1',
      symboledit: '1',
      saveimage: '1',
      toolbarbg: 'f1f3f6',
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

  // Generate unique key for iframe
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
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Professional Position Analysis</CardTitle>
              {positionMetrics && (
                <Badge 
                  variant="outline" 
                  className={`${positionMetrics.isLong ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}
                >
                  {positionMetrics.isLong ? 'LONG POSITION' : 'SHORT POSITION'}
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
          className="relative overflow-hidden rounded-lg bg-gray-50"
        >
          {/* TradingView Chart */}
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
            title={`Position Chart for ${symbol}`}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
          
          {/* Professional Position Overlay */}
          {tradeData && positionMetrics && (
            <>
              {/* Position Analysis Panel */}
              <div className="absolute top-4 left-4 z-10">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border min-w-[280px]">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5" />
                    <span className="font-bold text-gray-900">Risk/Reward Analysis</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${positionMetrics.isLong ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}
                    >
                      {positionMetrics.isLong ? 'LONG' : 'SHORT'}
                    </Badge>
                  </div>
                  
                  {/* Price Levels */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center py-1 px-2 bg-blue-50 rounded">
                      <span className="flex items-center gap-1 text-blue-700">
                        <ArrowUp className="h-3 w-3" />
                        Entry Price:
                      </span>
                      <span className="font-bold text-blue-700">${positionMetrics.entryPrice.toFixed(5)}</span>
                    </div>
                    
                    <div className={`flex justify-between items-center py-1 px-2 rounded ${positionMetrics.pnl >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <span className={`flex items-center gap-1 ${positionMetrics.pnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {positionMetrics.pnl >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        Exit Price:
                      </span>
                      <span className={`font-bold ${positionMetrics.pnl >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        ${positionMetrics.exitPrice.toFixed(5)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1 px-2 bg-red-50 rounded">
                      <span className="flex items-center gap-1 text-red-700">
                        <ArrowDown className="h-3 w-3" />
                        Implied Stop Loss:
                      </span>
                      <span className="font-bold text-red-700">${positionMetrics.stopLoss.toFixed(5)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center py-1 px-2 bg-green-50 rounded">
                      <span className="flex items-center gap-1 text-green-700">
                        <Target className="h-3 w-3" />
                        Implied Take Profit:
                      </span>
                      <span className="font-bold text-green-700">${positionMetrics.takeProfit.toFixed(5)}</span>
                    </div>
                  </div>
                  
                  {/* Risk/Reward Metrics */}
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-2 bg-red-50 rounded">
                        <div className="text-red-600 font-semibold">Risk</div>
                        <div className="text-red-700 font-bold">${(positionMetrics.risk * 100).toFixed(2)}</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="text-green-600 font-semibold">Reward</div>
                        <div className="text-green-700 font-bold">${(positionMetrics.reward * 100).toFixed(2)}</div>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-center p-2 bg-gray-50 rounded">
                      <div className="text-gray-600 text-sm">Risk:Reward Ratio</div>
                      <div className={`font-bold text-lg ${positionMetrics.riskRewardRatio >= 2 ? 'text-green-600' : positionMetrics.riskRewardRatio >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                        1:{positionMetrics.riskRewardRatio.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Summary */}
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border">
                  <div className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Performance Summary
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual P&L:</span>
                      <span className={`font-bold ${positionMetrics.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {positionMetrics.pnl >= 0 ? '+' : ''}${positionMetrics.pnl.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price Move:</span>
                      <span className={`font-bold ${positionMetrics.actualMove >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {positionMetrics.actualMove >= 0 ? '+' : ''}{positionMetrics.actualMove.toFixed(5)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Move %:</span>
                      <span className={`font-bold ${positionMetrics.actualMovePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {positionMetrics.actualMovePercent >= 0 ? '+' : ''}{positionMetrics.actualMovePercent.toFixed(3)}%
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-xs pt-1 border-t">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Duration:
                      </span>
                      <span className="text-gray-700">
                        {Math.round((tradeData.exitTime.getTime() - tradeData.entryTime.getTime()) / (1000 * 60))} min
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Position Visualization Lines */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
                  <div className="text-xs text-gray-600 mb-2 text-center">Position Visualization</div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-blue-500"></div>
                      <span>Entry</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-3 h-0.5 ${positionMetrics.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Exit</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-red-300 border-dashed border"></div>
                      <span>Stop Loss</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-0.5 bg-green-300 border-dashed border"></div>
                      <span>Take Profit</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>

      {/* Chart Information */}
      {showControls && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Powered by TradingView • Professional Risk/Reward Analysis
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

export default ChartWithPositionOverlay
