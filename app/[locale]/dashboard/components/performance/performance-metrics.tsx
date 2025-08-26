'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, TrendingUp, DollarSign, Calendar } from "lucide-react"

interface PerformanceMetricsProps {
  metrics?: any
  className?: string
}

export function PerformanceMetrics({ metrics, className }: PerformanceMetricsProps) {
  const mockData = {
    daily: { pnl: 125.50, change: 5.2 },
    weekly: { pnl: 890.25, change: 12.8 },
    monthly: { pnl: 3450.75, change: -2.1 },
    sharpeRatio: 1.45,
    maxDrawdown: -350.00,
    consecutiveWins: 5
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Daily P&L</span>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${mockData.daily.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${mockData.daily.pnl.toFixed(2)}
              </p>
              <Badge variant={mockData.daily.change >= 0 ? "default" : "destructive"} className="text-xs">
                {mockData.daily.change >= 0 ? '+' : ''}{mockData.daily.change}%
              </Badge>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Weekly P&L</span>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${mockData.weekly.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${mockData.weekly.pnl.toFixed(2)}
              </p>
              <Badge variant={mockData.weekly.change >= 0 ? "default" : "destructive"} className="text-xs">
                {mockData.weekly.change >= 0 ? '+' : ''}{mockData.weekly.change}%
              </Badge>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium">Monthly P&L</span>
            </div>
            <div className="text-right">
              <p className={`font-semibold ${mockData.monthly.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${mockData.monthly.pnl.toFixed(2)}
              </p>
              <Badge variant={mockData.monthly.change >= 0 ? "default" : "destructive"} className="text-xs">
                {mockData.monthly.change >= 0 ? '+' : ''}{mockData.monthly.change}%
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
            <p className="font-semibold">{mockData.sharpeRatio}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Max Drawdown</p>
            <p className="font-semibold text-red-600">${mockData.maxDrawdown.toFixed(2)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default PerformanceMetrics

