'use client'

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Target, DollarSign, Clock } from 'lucide-react'

interface ProfessionalPositionWidgetProps {
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

export function ProfessionalPositionWidget({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  showControls = true,
  tradeData
}: ProfessionalPositionWidgetProps) {
  
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

  // Generate TradingView iframe URL with embedded Pine Script for position visualization
  const iframeUrl = useMemo(() => {
    const baseUrl = 'https://www.tradingview.com/widgetembed/'
    
    // Create Pine Script for professional position visualization
    let pineScript = ''
    if (tradeData) {
      const isLong = tradeData.side.toUpperCase() === 'LONG' || tradeData.side.toUpperCase() === 'BUY'
      const entryPrice = tradeData.entryPrice
      const exitPrice = tradeData.exitPrice
      const pnl = tradeData.pnl
      
      // Calculate implied stop loss and take profit based on actual trade
      const priceMove = Math.abs(exitPrice - entryPrice)
      const stopLoss = isLong ? entryPrice - (priceMove * 0.5) : entryPrice + (priceMove * 0.5)
      const takeProfit = isLong ? entryPrice + (priceMove * 1.5) : entryPrice - (priceMove * 1.5)
      
      pineScript = encodeURIComponent(`
//@version=5
indicator("Professional Position", overlay=true)

// Trade parameters from actual trade data
entry_price = ${entryPrice}
exit_price = ${exitPrice}
stop_loss = ${stopLoss.toFixed(5)}
take_profit = ${takeProfit.toFixed(5)}
position_side = "${isLong ? 'LONG' : 'SHORT'}"
pnl_value = ${pnl}

// Calculate risk and reward
risk = math.abs(entry_price - stop_loss)
reward = math.abs(take_profit - entry_price)
risk_reward_ratio = reward / risk

// Colors for long/short positions
position_color = position_side == "LONG" ? color.blue : color.red
profit_color = pnl_value >= 0 ? color.green : color.red

// Draw position box
if barstate.islast
    // Entry line
    line.new(bar_index - 50, entry_price, bar_index + 10, entry_price, 
             color=position_color, width=3, style=line.style_solid)
    label.new(bar_index + 15, entry_price, "Entry: " + str.tostring(entry_price), 
              color=position_color, textcolor=color.white, style=label.style_label_left, size=size.normal)
    
    // Exit line
    line.new(bar_index - 50, exit_price, bar_index + 10, exit_price, 
             color=profit_color, width=2, style=line.style_solid)
    label.new(bar_index + 15, exit_price, "Exit: " + str.tostring(exit_price) + " (P&L: $" + str.tostring(pnl_value) + ")", 
              color=profit_color, textcolor=color.white, style=label.style_label_left, size=size.normal)
    
    // Stop loss line (projected)
    line.new(bar_index - 50, stop_loss, bar_index + 10, stop_loss, 
             color=color.red, width=1, style=line.style_dashed)
    label.new(bar_index + 15, stop_loss, "Stop Loss: " + str.tostring(stop_loss), 
              color=color.red, textcolor=color.white, style=label.style_label_left, size=size.small)
    
    // Take profit line (projected)
    line.new(bar_index - 50, take_profit, bar_index + 10, take_profit, 
             color=color.green, width=1, style=line.style_dashed)
    label.new(bar_index + 15, take_profit, "Take Profit: " + str.tostring(take_profit), 
              color=color.green, textcolor=color.white, style=label.style_label_left, size=size.small)
    
    // Position box
    highest_price = math.max(entry_price, math.max(exit_price, math.max(stop_loss, take_profit)))
    lowest_price = math.min(entry_price, math.min(exit_price, math.min(stop_loss, take_profit)))
    
    // Risk/Reward ratio display
    box.new(bar_index - 45, highest_price + (highest_price - lowest_price) * 0.1, 
            bar_index - 5, highest_price + (highest_price - lowest_price) * 0.3, 
            bgcolor=color.new(position_color, 90), border_color=position_color)
    
    label.new(bar_index - 25, highest_price + (highest_price - lowest_price) * 0.2, 
              position_side + " POSITION\\nR:R = " + str.tostring(risk_reward_ratio, "#.##") + 
              "\\nRisk: $" + str.tostring(risk * 100, "#.##") + 
              "\\nReward: $" + str.tostring(reward * 100, "#.##"), 
              color=color.new(color.white, 20), textcolor=color.black, 
              style=label.style_label_center, size=size.normal)
      `)
    }

    const params = new URLSearchParams({
      frameElementId: 'tradingview_professional_position',
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

    if (pineScript) {
      params.append('studies', pineScript)
    }

    return `${baseUrl}?${params.toString()}`
  }, [symbol, calculateInterval, tradeData])

  // Generate unique key for iframe to force refresh when needed
  const iframeKey = useMemo(() => {
    if (tradeData) {
      return `${symbol}_${tradeData.entryTime.getTime()}_${tradeData.exitTime.getTime()}`
    }
    return symbol
  }, [symbol, tradeData])

  // Calculate risk/reward metrics for display
  const riskRewardMetrics = useMemo(() => {
    if (!tradeData) return null

    const isLong = tradeData.side.toUpperCase() === 'LONG' || tradeData.side.toUpperCase() === 'BUY'
    const priceMove = Math.abs(tradeData.exitPrice - tradeData.entryPrice)
    const impliedStopLoss = isLong ? tradeData.entryPrice - (priceMove * 0.5) : tradeData.entryPrice + (priceMove * 0.5)
    const impliedTakeProfit = isLong ? tradeData.entryPrice + (priceMove * 1.5) : tradeData.entryPrice - (priceMove * 1.5)
    
    const risk = Math.abs(tradeData.entryPrice - impliedStopLoss)
    const reward = Math.abs(impliedTakeProfit - tradeData.entryPrice)
    const riskRewardRatio = reward / risk

    return {
      risk,
      reward,
      riskRewardRatio,
      impliedStopLoss,
      impliedTakeProfit,
      isLong
    }
  }, [tradeData])

  return (
    <Card className={className}>
      {showControls && (
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <CardTitle>Professional Position Analysis</CardTitle>
              <Badge variant="outline" className={`${tradeData?.side.toUpperCase() === 'LONG' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                {tradeData?.side.toUpperCase() === 'LONG' ? 'LONG POSITION' : 'SHORT POSITION'}
              </Badge>
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
            title={`Professional Position Chart for ${symbol}`}
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
          
          {/* Professional Risk/Reward Analysis Overlay */}
          {tradeData && riskRewardMetrics && (
            <div className="absolute top-4 right-4 z-10 space-y-2">
              <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-xs">
                <div className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Risk/Reward Analysis
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Position Type:</span>
                    <Badge variant="outline" className={`text-xs ${riskRewardMetrics.isLong ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                      {riskRewardMetrics.isLong ? 'LONG' : 'SHORT'}
                    </Badge>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Price:</span>
                      <span className="font-medium">${tradeData.entryPrice.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Exit Price:</span>
                      <span className="font-medium">${tradeData.exitPrice.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Implied SL:</span>
                      <span className="font-medium text-red-600">${riskRewardMetrics.impliedStopLoss.toFixed(5)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Implied TP:</span>
                      <span className="font-medium text-green-600">${riskRewardMetrics.impliedTakeProfit.toFixed(5)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Risk:</span>
                      <span className="font-medium text-red-600">${(riskRewardMetrics.risk * 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reward:</span>
                      <span className="font-medium text-green-600">${(riskRewardMetrics.reward * 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-600">R:R Ratio:</span>
                      <span className={`${riskRewardMetrics.riskRewardRatio >= 2 ? 'text-green-600' : riskRewardMetrics.riskRewardRatio >= 1 ? 'text-yellow-600' : 'text-red-600'}`}>
                        1:{riskRewardMetrics.riskRewardRatio.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-600 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Actual P&L:
                      </span>
                      <span className={`${tradeData.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tradeData.pnl >= 0 ? '+' : ''}${tradeData.pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-xs">
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
            </div>
          )}
        </div>
      </CardContent>

      {/* Chart Information */}
      {showControls && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Powered by TradingView • Professional Position Analysis
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

export default ProfessionalPositionWidget
