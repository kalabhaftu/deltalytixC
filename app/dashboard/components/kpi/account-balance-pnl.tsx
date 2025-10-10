'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { useData } from '@/context/data-provider'
import { useAccounts } from '@/hooks/use-accounts'
import { useTradeStatistics } from '@/hooks/use-trade-statistics'
import { cn } from '@/lib/utils'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { calculateBalanceInfo } from '@/lib/utils/balance-calculator'

interface AccountBalancePnlProps {
  size?: string
}

export default function AccountBalancePnl({ size }: AccountBalancePnlProps) {
  const { accountNumbers, formattedTrades } = useData()
  const { accounts } = useAccounts()
  
  // Filter accounts based on selection
  const filteredAccounts = React.useMemo(() => {
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) return []
    // If no filter is set (empty array), return empty array to show no data
    if (!accountNumbers || accountNumbers.length === 0) return []
    // Otherwise, filter to selected accounts by matching account number (phaseId) ONLY
    // This ensures we only get the exact phases selected, not all phases of a master account
    return accounts.filter(acc => accountNumbers.includes(acc.number))
  }, [accounts, accountNumbers])
  
  // ✅ USE UNIFIED CALCULATOR - Single source of truth for all balance calculations
  // This replaces the old custom logic (lines 39-71) with centralized, tested functions
  const balanceInfo = React.useMemo(() => {
    return calculateBalanceInfo(filteredAccounts, formattedTrades)
  }, [filteredAccounts, formattedTrades])
  
  const totalBalance = balanceInfo.currentBalance
  const netPnl = balanceInfo.netPnL
  
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
    <Card className="w-full h-24">
      <CardContent className="p-4 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground font-medium">
                Account Balance & P&L
              </span>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center cursor-help">
                      <HelpCircle className="h-2 w-2 text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={5} className="max-w-[300px]">
                    <p>
                      {accountNumbers && accountNumbers.length > 0
                        ? `Balance for ${accountNumbers.length} selected account${accountNumbers.length > 1 ? 's' : ''} with net P&L (profit/loss) including fees.`
                        : 'Current total balance across all accounts with net P&L (profit/loss) including fees.'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-foreground">
                {formatCompactCurrency(totalBalance)}
              </span>
              <div className="text-xs">
                <span className="text-muted-foreground">P&L:</span>
                <span className={cn(
                  "ml-1 font-medium",
                  netPnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCompactCurrency(netPnl)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
