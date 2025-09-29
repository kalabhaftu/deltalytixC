'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useData } from '@/context/data-provider'
import { cn } from '@/lib/utils'

interface AccountBalancePnlProps {
  size?: string
}

export default function AccountBalancePnl({ size }: AccountBalancePnlProps) {
  const { dashboardStats } = useData()
  
  // Extract real data
  const accountBalance = dashboardStats?.totalBalance || 0
  const totalPnl = dashboardStats?.totalPnl || 0
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatCompactCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        minimumFractionDigits: 2,
      }).format(amount)
    }
    return formatCurrency(amount)
  }

  return (
    <Card className="w-full h-20 border border-border/20 shadow-sm bg-white dark:bg-gray-900">
      <CardContent className="p-4 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium">
                Account Balance & P&L
              </span>
              <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center">
                <span className="text-[8px] text-muted-foreground">i</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-foreground">
                {formatCompactCurrency(accountBalance)}
              </span>
              <div className="text-xs">
                <span className="text-muted-foreground">P&L:</span>
                <span className={cn(
                  "ml-1 font-medium",
                  totalPnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCompactCurrency(totalPnl)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
