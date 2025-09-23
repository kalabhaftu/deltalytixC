'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'

// TradingView Charting Library types
declare global {
  interface Window {
    TradingView: any
  }
}

interface TradingViewChartingLibraryProps {
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

export function TradingViewChartingLibrary({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  showControls = true,
  tradeData
}: TradingViewChartingLibraryProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const [widget, setWidget] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Calculate appropriate interval based on trade duration
  const calculateInterval = () => {
    if (!tradeData) return '1D'
    
    const timeDiff = tradeData.exitTime.getTime() - tradeData.entryTime.getTime()
    const hours = timeDiff / (1000 * 60 * 60)
    
    if (hours <= 1) return '1'
    if (hours <= 4) return '5'
    if (hours <= 24) return '15'
    if (hours <= 72) return '60'
    return '1D'
  }

  useEffect(() => {
    let isMounted = true

    const loadTradingViewLibrary = () => {
      return new Promise<void>((resolve, reject) => {
        if (window.TradingView && window.TradingView.widget) {
          resolve()
          return
        }

        const script = document.createElement('script')
        script.src = 'https://charting-library.tradingview-widget.com/charting_library/charting_library.js'
        script.async = true
        script.onload = () => {
          if (window.TradingView && window.TradingView.widget) {
            resolve()
          } else {
            reject(new Error('TradingView library failed to load'))
          }
        }
        script.onerror = () => reject(new Error('Failed to load TradingView library'))
        document.head.appendChild(script)
      })
    }

    const initializeChart = async () => {
      try {
        await loadTradingViewLibrary()
        
        if (!chartContainerRef.current || !isMounted) return

        // Generate unique container ID
        const containerId = `tradingview_chart_${Date.now()}`
        chartContainerRef.current.id = containerId

        const widgetOptions = {
          container_id: containerId,
          width: '100%',
          height: height,
          symbol: symbol,
          interval: calculateInterval(),
          timezone: 'Etc/UTC',
          theme: 'light',
          style: '1',
          locale: 'en',
          toolbar_bg: '#f1f3f6',
          enable_publishing: false,
          hide_top_toolbar: !showControls,
          hide_legend: false,
          save_image: false,
          studies: [],
          overrides: {},
          enabled_features: [
            'study_templates',
            'side_toolbar_in_fullscreen_mode'
          ],
          disabled_features: [
            'use_localstorage_for_settings',
            'volume_force_overlay'
          ],
          debug: false,
          autosize: true
        }

        const chartWidget = new window.TradingView.widget(widgetOptions)
        
        chartWidget.onChartReady(() => {
          if (!isMounted) return

          setWidget(chartWidget)
          setIsLoaded(true)

          // Create position drawing after chart is ready
          if (tradeData) {
            createPositionDrawing(chartWidget, tradeData)
          }
        })

      } catch (error) {
        console.error('Error initializing TradingView chart:', error)
      }
    }

    initializeChart()

    return () => {
      isMounted = false
      if (widget && widget.remove) {
        try {
          widget.remove()
        } catch (error) {
          console.warn('Error removing TradingView widget:', error)
        }
      }
    }
  }, [symbol, height, showControls, tradeData])

  const createPositionDrawing = (chartWidget: any, trade: typeof tradeData) => {
    if (!trade) return

    try {
      const chart = chartWidget.activeChart()
      if (!chart) return

      const isLong = trade.side.toUpperCase() === 'LONG' || trade.side.toUpperCase() === 'BUY'
      
      // Convert dates to timestamps (in seconds for TradingView)
      const entryTimestamp = Math.floor(trade.entryTime.getTime() / 1000)
      const exitTimestamp = Math.floor(trade.exitTime.getTime() / 1000)
      
      // Calculate position levels
      const entryPrice = trade.entryPrice
      const exitPrice = trade.exitPrice
      
      // Calculate implied stop loss and take profit based on actual trade
      const actualMove = exitPrice - entryPrice
      const stopLoss = isLong 
        ? entryPrice - Math.abs(actualMove) * 0.5 
        : entryPrice + Math.abs(actualMove) * 0.5
      const takeProfit = isLong 
        ? entryPrice + Math.abs(actualMove) * 1.5 
        : entryPrice - Math.abs(actualMove) * 1.5

      // Create the actual TradingView Long/Short Position drawing tool
      const positionToolName = isLong ? 'LineToolRiskRewardLong' : 'LineToolRiskRewardShort'
      
      // Define points for the position drawing (entry, stop loss, take profit)
      const points = [
        { time: entryTimestamp, price: entryPrice },    // Entry point
        { time: entryTimestamp, price: stopLoss },      // Stop loss point  
        { time: entryTimestamp, price: takeProfit }     // Take profit point
      ]

      // Create the professional position drawing using TradingView's built-in tools
      const positionDrawing = chart.createMultipointShape(points, {
        shape: positionToolName,
        disableSelection: false,
        disableSave: false,
        disableUndo: false,
        overrides: {
          // Customize the position drawing appearance
          transparency: 80,
          backgroundColor: isLong ? '#2196F3' : '#F44336',
          borderColor: isLong ? '#1976D2' : '#D32F2F',
          textColor: '#FFFFFF'
        }
      })

      // Add a time range rectangle to show the actual trade duration (like the blue box in your image)
      const timeRangePoints = [
        { time: entryTimestamp, price: Math.max(entryPrice, exitPrice) + Math.abs(actualMove) * 0.1 },
        { time: exitTimestamp, price: Math.min(entryPrice, exitPrice) - Math.abs(actualMove) * 0.1 }
      ]

      chart.createMultipointShape(timeRangePoints, {
        shape: 'LineToolRectangle',
        disableSelection: true,
        overrides: {
          backgroundColor: isLong ? 'rgba(33, 150, 243, 0.15)' : 'rgba(244, 67, 54, 0.15)',
          borderColor: isLong ? '#2196F3' : '#F44336',
          borderWidth: 1,
          transparency: 85
        }
      })

      // Mark the actual exit point
      chart.createMultipointShape([
        { time: exitTimestamp, price: exitPrice }
      ], {
        shape: 'LineToolCircle',
        overrides: {
          color: trade.pnl >= 0 ? '#4CAF50' : '#F44336',
          transparency: 0
        }
      })

      console.log(`${positionToolName} drawing created successfully`)

    } catch (error) {
      console.error('Error creating position drawing:', error)
      
      // Fallback: Create simple rectangle if advanced tools fail
      try {
        const fallbackChart = chartWidget.activeChart()
        if (!fallbackChart) return

        const entryTimestamp = Math.floor(trade.entryTime.getTime() / 1000)
        const exitTimestamp = Math.floor(trade.exitTime.getTime() / 1000)
        const isLong = trade.side.toUpperCase() === 'LONG' || trade.side.toUpperCase() === 'BUY'
        
        // Create simple time/price rectangle (like the blue box in your image)
        const rectanglePoints = [
          { time: entryTimestamp, price: Math.max(trade.entryPrice, trade.exitPrice) },
          { time: exitTimestamp, price: Math.min(trade.entryPrice, trade.exitPrice) }
        ]

        fallbackChart.createMultipointShape(rectanglePoints, {
          shape: 'LineToolRectangle',
          overrides: {
            backgroundColor: isLong ? 'rgba(33, 150, 243, 0.2)' : 'rgba(244, 67, 54, 0.2)',
            borderColor: isLong ? '#2196F3' : '#F44336',
            borderWidth: 2
          }
        })
        
        console.log('Fallback rectangle drawing created')
      } catch (fallbackError) {
        console.error('Fallback drawing also failed:', fallbackError)
      }
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
              <CardTitle>Position Chart Analysis</CardTitle>
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
          ref={chartContainerRef}
          style={{
            height: `${height}px`,
            width: '100%'
          }}
          className="relative"
        >
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading TradingView Chart...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {showControls && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Powered by TradingView Charting Library • Position Visualization
            </div>
            <div>
              Symbol: {symbol} • Interval: {calculateInterval()}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default TradingViewChartingLibrary
