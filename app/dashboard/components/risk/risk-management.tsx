'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, AlertTriangle, CheckCircle, TrendingDown } from "lucide-react"
import { formatPercent } from "@/lib/utils"

interface RiskManagementProps {
  riskData?: any
  className?: string
}

export function RiskManagement({ riskData, className }: RiskManagementProps) {
  const mockRiskData = {
    dailyDrawdown: {
      current: 150,
      limit: 500,
      percentage: 30
    },
    maxDrawdown: {
      current: 750,
      limit: 2000,
      percentage: 37.5
    },
    positionSize: {
      current: 10000,
      maxAllowed: 50000,
      percentage: 20
    },
    riskLevel: 'medium' as 'low' | 'medium' | 'high'
  }

  const getRiskColor = (percentage: number) => {
    if (percentage < 50) return 'text-green-600'
    if (percentage < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Shield className="h-4 w-4" />
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <div className="flex items-center gap-2">
            {getRiskIcon(mockRiskData.riskLevel)}
            <AlertDescription>
              Current risk level: <span className="font-medium capitalize">{mockRiskData.riskLevel}</span>
            </AlertDescription>
          </div>
        </Alert>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Daily Drawdown
              </span>
              <span className={getRiskColor(mockRiskData.dailyDrawdown.percentage)}>
                ${mockRiskData.dailyDrawdown.current} / ${mockRiskData.dailyDrawdown.limit}
              </span>
            </div>
            <Progress 
              value={mockRiskData.dailyDrawdown.percentage} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(mockRiskData.dailyDrawdown.percentage, 1)} of daily limit used
            </p>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Max Drawdown
              </span>
              <span className={getRiskColor(mockRiskData.maxDrawdown.percentage)}>
                ${mockRiskData.maxDrawdown.current} / ${mockRiskData.maxDrawdown.limit}
              </span>
            </div>
            <Progress 
              value={mockRiskData.maxDrawdown.percentage} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(mockRiskData.maxDrawdown.percentage, 1)} of maximum drawdown limit
            </p>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Position Size
              </span>
              <span className={getRiskColor(mockRiskData.positionSize.percentage)}>
                ${mockRiskData.positionSize.current.toLocaleString()} / ${mockRiskData.positionSize.maxAllowed.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={mockRiskData.positionSize.percentage} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formatPercent(mockRiskData.positionSize.percentage)} of maximum position size
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default RiskManagement

