'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

interface TradeChartProps {
  trades?: any[]
  className?: string
}

export function TradeChart({ trades = [], className }: TradeChartProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Trade Performance Chart
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <div className="text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Trade chart visualization will be implemented here.</p>
            <p className="text-sm mt-2">Trades: {trades.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TradeChart

