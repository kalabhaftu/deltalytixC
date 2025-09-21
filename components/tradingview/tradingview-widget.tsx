'use client'

import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Settings, Maximize2, Minimize2, RefreshCw } from 'lucide-react'

declare global {
  interface Window {
    TradingView: any
  }
}

export interface TradingViewConfig {
  symbol: string
  interval: string
  theme: 'light' | 'dark'
  style: string
  locale: string
  timezone: string
  toolbar_bg: string
  enable_publishing: boolean
  hide_top_toolbar: boolean
  hide_legend: boolean
  range: string
  studies: string[]
}

interface TradingViewWidgetProps {
  symbol?: string
  height?: number
  className?: string
  onSymbolChange?: (symbol: string) => void
}

export function TradingViewWidget({
  symbol = 'NASDAQ:AAPL',
  height = 600,
  className = '',
  onSymbolChange,
}: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentSymbol, setCurrentSymbol] = useState(symbol)
  const [config, setConfig] = useState<TradingViewConfig>({
    symbol: currentSymbol,
    interval: 'D',
    theme: 'light',
    style: '1',
    locale: 'en',
    timezone: 'Etc/UTC',
    toolbar_bg: '#f1f3f6',
    enable_publishing: false,
    hide_top_toolbar: false,
    hide_legend: false,
    range: 'YTD',
    studies: ['MASimple@tv-basicstudies'],
  })

  // Popular trading symbols
  const popularSymbols = [
    { value: 'NASDAQ:AAPL', label: 'Apple Inc.', category: 'Stocks' },
    { value: 'NASDAQ:TSLA', label: 'Tesla Inc.', category: 'Stocks' },
    { value: 'NASDAQ:NVDA', label: 'NVIDIA Corp.', category: 'Stocks' },
    { value: 'NYSE:SPY', label: 'SPDR S&P 500', category: 'ETF' },
    { value: 'FOREXCOM:SPXUSD', label: 'S&P 500', category: 'Index' },
    { value: 'FX_IDC:EURUSD', label: 'EUR/USD', category: 'Forex' },
    { value: 'FX_IDC:GBPUSD', label: 'GBP/USD', category: 'Forex' },
    { value: 'BITSTAMP:BTCUSD', label: 'Bitcoin', category: 'Crypto' },
    { value: 'BITSTAMP:ETHUSD', label: 'Ethereum', category: 'Crypto' },
    { value: 'COMEX:GC1!', label: 'Gold Futures', category: 'Commodities' },
    { value: 'NYMEX:CL1!', label: 'Crude Oil', category: 'Commodities' },
    { value: 'CME_MINI:ES1!', label: 'E-mini S&P 500', category: 'Futures' },
    { value: 'CME_MINI:NQ1!', label: 'E-mini NASDAQ', category: 'Futures' },
  ]

  // Time intervals
  const intervals = [
    { value: '1', label: '1 minute' },
    { value: '5', label: '5 minutes' },
    { value: '15', label: '15 minutes' },
    { value: '30', label: '30 minutes' },
    { value: '60', label: '1 hour' },
    { value: '240', label: '4 hours' },
    { value: 'D', label: '1 day' },
    { value: 'W', label: '1 week' },
    { value: 'M', label: '1 month' },
  ]

  // Chart styles
  const chartStyles = [
    { value: '1', label: 'Candlesticks' },
    { value: '0', label: 'Bars' },
    { value: '3', label: 'Line' },
    { value: '9', label: 'Area' },
    { value: '8', label: 'Renko' },
    { value: '7', label: 'Kagi' },
  ]

  // Available studies
  const availableStudies = [
    { value: 'MASimple@tv-basicstudies', label: 'Moving Average' },
    { value: 'RSI@tv-basicstudies', label: 'RSI' },
    { value: 'MACD@tv-basicstudies', label: 'MACD' },
    { value: 'BB@tv-basicstudies', label: 'Bollinger Bands' },
    { value: 'StochasticRSI@tv-basicstudies', label: 'Stochastic RSI' },
    { value: 'Volume@tv-basicstudies', label: 'Volume' },
  ]

  useEffect(() => {
    // Load TradingView script
    const script = document.createElement("script")
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: config.symbol,
      interval: config.interval,
      timezone: config.timezone,
      theme: config.theme,
      style: config.style,
      locale: config.locale,
      toolbar_bg: config.toolbar_bg,
      enable_publishing: config.enable_publishing,
      range: config.range,
      hide_top_toolbar: config.hide_top_toolbar,
      hide_legend: config.hide_legend,
      save_image: false,
      studies: config.studies,
      container_id: 'tradingview_widget',
    })

    if (container.current) {
      container.current.innerHTML = ''
      container.current.appendChild(script)
      setIsLoaded(true)
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = ''
      }
    }
  }, [config])

  const updateConfig = (key: keyof TradingViewConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSymbolChange = (newSymbol: string) => {
    setCurrentSymbol(newSymbol)
    updateConfig('symbol', newSymbol)
    onSymbolChange?.(newSymbol)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const refreshChart = () => {
    setIsLoaded(false)
    // Force re-render
    setTimeout(() => {
      updateConfig('symbol', currentSymbol)
    }, 100)
  }

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>TradingView Chart</CardTitle>
            <Badge variant="outline">Live Data</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={refreshChart}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Chart Controls */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <Label className="text-sm">Symbol</Label>
            <Select value={currentSymbol} onValueChange={handleSymbolChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(
                  popularSymbols.reduce((acc, symbol) => {
                    if (!acc[symbol.category]) {
                      acc[symbol.category] = []
                    }
                    acc[symbol.category].push(symbol)
                    return acc
                  }, {} as Record<string, typeof popularSymbols>)
                ).map(([category, symbols]) => (
                  <div key={category}>
                    <div className="px-2 py-1 text-sm font-semibold text-gray-500">
                      {category}
                    </div>
                    {symbols.map((symbol) => (
                      <SelectItem key={symbol.value} value={symbol.value}>
                        {symbol.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Interval</Label>
            <Select value={config.interval} onValueChange={(value) => updateConfig('interval', value)}>
              <SelectTrigger>
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

          <div>
            <Label className="text-sm">Style</Label>
            <Select value={config.style} onValueChange={(value) => updateConfig('style', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartStyles.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm">Theme</Label>
            <Select value={config.theme} onValueChange={(value: 'light' | 'dark') => updateConfig('theme', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Additional Controls */}
        <div className="flex flex-wrap items-center gap-4 mt-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="hide-toolbar"
              checked={config.hide_top_toolbar}
              onCheckedChange={(checked) => updateConfig('hide_top_toolbar', checked)}
            />
            <Label htmlFor="hide-toolbar" className="text-sm">Hide Toolbar</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="hide-legend"
              checked={config.hide_legend}
              onCheckedChange={(checked) => updateConfig('hide_legend', checked)}
            />
            <Label htmlFor="hide-legend" className="text-sm">Hide Legend</Label>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={container}
          id="tradingview_widget"
          style={{ 
            height: isFullscreen ? 'calc(100vh - 120px)' : `${height}px`,
            width: '100%'
          }}
          className="relative"
        >
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading TradingView chart...</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Chart Information */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div>
            Powered by TradingView • Real-time data
          </div>
          <div>
            Symbol: {currentSymbol} • Interval: {intervals.find(i => i.value === config.interval)?.label}
          </div>
        </div>
      </div>
    </Card>
  )
}

// Lightweight TradingView component for embedding in dashboards
export function TradingViewMini({ symbol = 'NASDAQ:AAPL', height = 300 }: { symbol?: string; height?: number }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      symbol,
      width: '100%',
      height: height.toString(),
      locale: 'en',
      dateRange: '12M',
      colorTheme: 'light',
      trendLineColor: 'rgba(41, 98, 255, 1)',
      underLineColor: 'rgba(41, 98, 255, 0.3)',
      underLineBottomColor: 'rgba(41, 98, 255, 0)',
      isTransparent: false,
      autosize: true,
      largeChartUrl: '',
    })

    if (container.current) {
      container.current.innerHTML = ''
      container.current.appendChild(script)
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = ''
      }
    }
  }, [symbol, height])

  return (
    <div 
      ref={container}
      style={{ height: `${height}px`, width: '100%' }}
      className="tradingview-widget-container"
    />
  )
}

// Market overview widget
export function TradingViewMarketOverview({ height = 400 }: { height?: number }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const script = document.createElement("script")
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js'
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = JSON.stringify({
      colorTheme: 'light',
      dateRange: '12M',
      showChart: true,
      locale: 'en',
      width: '100%',
      height: height.toString(),
      largeChartUrl: '',
      isTransparent: false,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      plotLineColorGrowing: 'rgba(41, 98, 255, 1)',
      plotLineColorFalling: 'rgba(41, 98, 255, 1)',
      gridLineColor: 'rgba(240, 243, 250, 0)',
      scaleFontColor: 'rgba(120, 123, 134, 1)',
      belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)',
      belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)',
      belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
      belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
      symbolActiveColor: 'rgba(41, 98, 255, 0.12)',
      tabs: [
        {
          title: 'Indices',
          symbols: [
            { s: 'FOREXCOM:SPXUSD', d: 'S&P 500' },
            { s: 'FOREXCOM:NSXUSD', d: 'US 100' },
            { s: 'FOREXCOM:DJI', d: 'Dow 30' },
            { s: 'INDEX:NKY', d: 'Nikkei 225' },
            { s: 'INDEX:DEU40', d: 'DAX Index' },
          ],
        },
        {
          title: 'Futures',
          symbols: [
            { s: 'CME_MINI:ES1!', d: 'S&P 500' },
            { s: 'CME_MINI:NQ1!', d: 'NASDAQ' },
            { s: 'NYMEX:CL1!', d: 'Crude Oil' },
            { s: 'COMEX:GC1!', d: 'Gold' },
            { s: 'CME_MINI:RTY1!', d: 'Russell 2000' },
          ],
        },
        {
          title: 'Forex',
          symbols: [
            { s: 'FX:EURUSD', d: 'EUR/USD' },
            { s: 'FX:GBPUSD', d: 'GBP/USD' },
            { s: 'FX:USDJPY', d: 'USD/JPY' },
            { s: 'FX:USDCHF', d: 'USD/CHF' },
            { s: 'FX:AUDUSD', d: 'AUD/USD' },
          ],
        },
      ],
    })

    if (container.current) {
      container.current.innerHTML = ''
      container.current.appendChild(script)
    }

    return () => {
      if (container.current) {
        container.current.innerHTML = ''
      }
    }
  }, [height])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5" />
          <span>Market Overview</span>
        </CardTitle>
        <CardDescription>
          Live market data and performance indicators
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={container}
          style={{ height: `${height}px`, width: '100%' }}
          className="tradingview-widget-container"
        />
      </CardContent>
    </Card>
  )
}
