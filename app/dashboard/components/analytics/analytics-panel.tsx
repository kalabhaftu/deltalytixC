'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Target, Award } from "lucide-react"

interface AnalyticsPanelProps {
  data?: any
  className?: string
}

export function AnalyticsPanel({ data, className }: AnalyticsPanelProps) {
  const mockMetrics = {
    winRate: 65,
    profitFactor: 1.4,
    averageWin: 150,
    averageLoss: -85,
    totalTrades: 42,
    totalPnL: 2750
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Analytics Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-medium">{mockMetrics.winRate}%</span>
            </div>
            <Progress value={mockMetrics.winRate} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Profit Factor</span>
              <span className="font-medium">{mockMetrics.profitFactor}</span>
            </div>
            <Progress value={mockMetrics.profitFactor * 30} className="h-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Win</p>
              <p className="font-medium text-green-600">${mockMetrics.averageWin}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Avg Loss</p>
              <p className="font-medium text-red-600">${mockMetrics.averageLoss}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-muted-foreground">Total P&L</span>
          </div>
          <span className={`font-semibold ${mockMetrics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${mockMetrics.totalPnL.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

export default AnalyticsPanel

