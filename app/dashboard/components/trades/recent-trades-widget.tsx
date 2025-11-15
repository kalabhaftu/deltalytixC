'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useData } from '@/context/data-provider'
import { cn } from '@/lib/utils'

export default function RecentTradesWidget() {
  const { formattedTrades } = useData()

  // CRITICAL FIX: Group trades first to handle partial closes correctly
  // This ensures partial closes are shown as single trades, not multiple entries
  const { groupTradesByExecution } = require('@/lib/utils')
  const groupedTrades = React.useMemo(() => {
    return groupTradesByExecution(formattedTrades)
  }, [formattedTrades, groupTradesByExecution])

  // Get last 14 trades (sorted by most recent entry date)
  // Limited to fit height without scrolling
  const recentTrades = React.useMemo(() => {
    return groupedTrades
      .sort((a: any, b: any) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime())
      .slice(0, 14)
  }, [groupedTrades])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  return (
    <Card className="h-[580px] flex flex-col">
      <CardHeader className="pb-3 px-4 pt-4 shrink-0">
        <CardTitle className="text-base font-semibold">Recent Trades</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1 flex flex-col min-h-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 pb-2 border-b border-border/50 text-xs font-medium text-muted-foreground shrink-0">
            <div className="col-span-5">Date</div>
            <div className="col-span-4">Symbol</div>
            <div className="col-span-3 text-right">P&L</div>
          </div>

          {/* Trades List */}
          <div className="space-y-0.5 flex-1 overflow-hidden">
            {recentTrades.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No trades yet
              </div>
            ) : (
              recentTrades.map((trade: any, index: number) => {
                const netPnL = (trade.pnl || 0) - (trade.commission || 0)
                const isProfitable = netPnL > 0

                return (
                  <div
                    key={trade.id || index}
                    className="grid grid-cols-12 gap-2 py-2 text-xs hover:bg-muted/50 rounded-md transition-colors"
                  >
                    <div className="col-span-5 text-muted-foreground">
                      {formatDate(trade.entryDate)}
                    </div>
                    <div className="col-span-4 font-medium truncate" title={trade.symbol || trade.instrument}>
                      {trade.symbol || trade.instrument}
                    </div>
                    <div
                      className={cn(
                        'col-span-3 text-right font-semibold',
                        isProfitable
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {formatCurrency(netPnL)}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

