'use client'

import React, { useMemo, useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3 } from 'lucide-react'

interface ProfessionalChartWithPositionProps {
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

export function ProfessionalChartWithPosition({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  showControls = true,
  tradeData
}: ProfessionalChartWithPositionProps) {
  
  const [selectedInterval, setSelectedInterval] = useState('15')
  const [widget, setWidget] = useState<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const intervals = [
    { value: '1', label: '1 minute' },
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '240', label: '4 hours' },
    { value: 'D', label: '1 day' }
  ]

  // Convert UTC trade times to UTC-4 (EST/EDT)
  const convertToChartTimezone = (utcDate: Date) => {
    // Trade data is in UTC (UTC+0), chart shows UTC-4
    // So we need to subtract 4 hours from UTC time for display
    return new Date(utcDate.getTime() - (4 * 60 * 60 * 1000))
  }

  useEffect(() => {
    if (!containerRef.current || !tradeData) return

    let isMounted = true

    const loadTradingViewScript = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.TradingView) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
        script.onload = () => {
          if (window.TradingView) {
            resolve()
          } else {
            reject(new Error('TradingView failed to load'))
          }
        }
        script.onerror = () => reject(new Error('Failed to load TradingView'))
        document.head.appendChild(script)
      })
    }

    const initChart = async () => {
      try {
        await loadTradingViewScript()
        
        if (!isMounted || !containerRef.current) return

        const chartTimezone = 'America/New_York' // UTC-4
        const entryTimeChart = convertToChartTimezone(tradeData.entryTime)
        const exitTimeChart = convertToChartTimezone(tradeData.exitTime)

        const widgetInstance = new window.TradingView.widget({
          container_id: containerRef.current.id,
          symbol: symbol,
          interval: selectedInterval,
          timezone: chartTimezone,
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          width: '100%',
          height: height,
          studies: [],
          show_popup_button: true,
          studies_overrides: {},
          overrides: {},
          enabled_features: [
            'study_templates',
            'side_toolbar_in_fullscreen_mode',
            'header_symbol_search',
            'header_resolutions',
            'compare_symbol'
          ],
          disabled_features: [
            'use_localstorage_for_settings'
          ]
        })

        widgetInstance.onChartReady(() => {
          if (!isMounted) return

          const chart = widgetInstance.activeChart()
          
          try {
            const isLong = tradeData.side.toUpperCase() === 'LONG' || tradeData.side.toUpperCase() === 'BUY'
            
            // Create position drawing using TradingView's built-in tools
            const positionTool = isLong ? 'LineToolRiskRewardLong' : 'LineToolRiskRewardShort'
            
            // Calculate stop loss and take profit based on actual trade
            const actualMove = tradeData.exitPrice - tradeData.entryPrice
            const stopLoss = isLong 
              ? tradeData.entryPrice - Math.abs(actualMove) * 0.5 
              : tradeData.entryPrice + Math.abs(actualMove) * 0.5
            const takeProfit = isLong 
              ? tradeData.entryPrice + Math.abs(actualMove) * 1.5 
              : tradeData.entryPrice - Math.abs(actualMove) * 1.5

            // Create the position drawing
            const entryTimestamp = Math.floor(entryTimeChart.getTime() / 1000)
            
            const points = [
              { time: entryTimestamp, price: tradeData.entryPrice },
              { time: entryTimestamp, price: stopLoss },
              { time: entryTimestamp, price: takeProfit }
            ]

            chart.createMultipointShape(points, {
              shape: positionTool,
              disableSelection: false,
              disableSave: false,
              disableUndo: false,
              overrides: {
                transparency: 80,
                backgroundColor: isLong ? '#2196F3' : '#F44336',
                borderColor: isLong ? '#1976D2' : '#D32F2F'
              }
            })

            // Add actual exit marker
            const exitTimestamp = Math.floor(exitTimeChart.getTime() / 1000)
            chart.createMultipointShape([
              { time: exitTimestamp, price: tradeData.exitPrice }
            ], {
              shape: 'LineToolCircle',
              overrides: {
                color: tradeData.pnl >= 0 ? '#4CAF50' : '#F44336',
                radius: 8
              }
            })

            console.log('TradingView position drawing created')

          } catch (error) {
            console.error('Error creating position drawing:', error)
          }
        })

        setWidget(widgetInstance)

      } catch (error) {
        console.error('Error initializing chart:', error)
      }
    }

    // Generate unique container ID
    if (containerRef.current) {
      containerRef.current.id = `tradingview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      initChart()
    }

    return () => {
      isMounted = false
      if (widget && widget.remove) {
        try {
          widget.remove()
        } catch (error) {
          console.warn('Error removing widget:', error)
        }
      }
    }
  }, [symbol, selectedInterval, tradeData, height])

  const handleIntervalChange = (newInterval: string) => {
    setSelectedInterval(newInterval)
    if (widget && widget.activeChart) {
      widget.activeChart().setResolution(newInterval)
    }
  }

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
              <Select value={selectedInterval} onValueChange={handleIntervalChange}>
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
          ref={containerRef}
          style={{
            height: `${height}px`,
            width: '100%'
          }}
          className="relative overflow-hidden rounded-lg"
        />
      </CardContent>

      {showControls && tradeData && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Powered by TradingView Charting Library • UTC-4 Timezone</div>
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

declare global {
  interface Window {
    TradingView: {
      widget: new (config: any) => any
    }
  }
}

export default ProfessionalChartWithPosition
