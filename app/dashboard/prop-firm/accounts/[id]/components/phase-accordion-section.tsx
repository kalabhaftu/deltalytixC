"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign, Activity, Calendar, CheckCircle2, XCircle, Clock, Trophy } from "lucide-react"
import { cn, formatPercent } from "@/lib/utils"

interface PhaseData {
  id: string
  phaseNumber: number
  phaseId: string | null
  status: 'active' | 'archived' | 'passed' | 'failed' | 'pending'
  profitTargetPercent: number
  dailyDrawdownPercent: number
  maxDrawdownPercent: number
  startDate: string
  endDate: string | null
  trades: any[]
  currentPnL?: number
  currentBalance?: number
}

interface PhaseAccordionSectionProps {
  phase: PhaseData
  accountSize: number
  isExpanded?: boolean
}

export function PhaseAccordionSection({ phase, accountSize, isExpanded = false }: PhaseAccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(isExpanded)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getStatusIcon = () => {
    switch (phase.status) {
      case 'active': return <Clock className="h-5 w-5 text-foreground" />
      case 'archived':
      case 'passed': return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'failed': return <XCircle className="h-5 w-5 text-red-500" />
      case 'pending': return <Trophy className="h-5 w-5 text-gray-400" />
      default: return null
    }
  }

  const getStatusBadge = () => {
    const variants = {
      active: 'default',
      archived: 'secondary',
      passed: 'secondary',
      failed: 'destructive',
      pending: 'outline'
    } as const
    
    const labels = {
      active: 'Active',
      archived: 'Archived (Passed)',
      passed: 'Passed',
      failed: 'Failed',
      pending: 'Pending'
    }

    return (
      <Badge variant={variants[phase.status] || 'outline'} className="ml-auto">
        {labels[phase.status]}
      </Badge>
    )
  }

  const totalTrades = phase.trades?.length || 0
  const totalPnL = phase.trades?.reduce((sum, t) => sum + (t.pnl || 0), 0) || 0
  
  // CRITICAL FIX: Use net P&L and exclude break-even trades
  const winningTrades = phase.trades?.filter(t => ((t.pnl || 0) - (t.commission || 0)) > 0).length || 0
  const losingTrades = phase.trades?.filter(t => ((t.pnl || 0) - (t.commission || 0)) < 0).length || 0
  const tradableCount = winningTrades + losingTrades
  const winRate = tradableCount > 0 ? (winningTrades / tradableCount) * 100 : 0
  const currentBalance = accountSize + totalPnL
  const profitTargetAmount = (phase.profitTargetPercent / 100) * accountSize
  const profitProgress = profitTargetAmount > 0 ? Math.min((totalPnL / profitTargetAmount) * 100, 100) : 0

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className={cn(
        "transition-all",
        phase.status === 'active' && "border-foreground/20 bg-muted/30",
        phase.status === 'failed' && "border-red-500/30 bg-red-50/30 dark:bg-red-950/10"
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <CardTitle className="text-lg">
                    Phase {phase.phaseNumber}
                    {phase.phaseId && <span className="text-sm font-normal text-muted-foreground ml-2">({phase.phaseId})</span>}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground mt-1">
                    Started: {formatDate(phase.startDate)}
                    {phase.endDate && ` • Ended: ${formatDate(phase.endDate)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge()}
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total Trades</span>
                  </div>
                  <p className="text-2xl font-bold">{totalTrades}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Total P&L</span>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold",
                    totalPnL >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {formatCurrency(totalPnL)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                  </div>
                  <p className="text-2xl font-bold">{formatPercent(winRate, 1)}</p>
                  <p className="text-xs text-muted-foreground">{winningTrades} wins</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Balance</span>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(currentBalance)}</p>
                  <p className="text-xs text-muted-foreground">
                    Start: {formatCurrency(accountSize)}
                  </p>
                </div>
              </div>

              {/* Profit Target Progress */}
              {phase.status !== 'pending' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Profit Target Progress</span>
                    <span className="font-medium">
                      {formatCurrency(totalPnL)} / {formatCurrency(profitTargetAmount)} ({formatPercent(profitProgress, 1)})
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all",
                        profitProgress >= 100 ? "bg-green-500" : "bg-foreground"
                      )}
                      style={{ width: `${Math.min(profitProgress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Phase Rules */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Profit Target</p>
                  <p className="text-sm font-medium">{formatPercent(phase.profitTargetPercent)} ({formatCurrency(profitTargetAmount)})</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Daily Drawdown</p>
                  <p className="text-sm font-medium">{formatPercent(phase.dailyDrawdownPercent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Max Drawdown</p>
                  <p className="text-sm font-medium">{formatPercent(phase.maxDrawdownPercent)}</p>
                </div>
              </div>

              {/* Recent Trades */}
              {phase.trades && phase.trades.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Recent Trades ({Math.min(5, phase.trades.length)} of {phase.trades.length})</h4>
                  <div className="space-y-2">
                    {phase.trades.slice(0, 5).map((trade, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-background rounded border">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{trade.instrument || trade.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {trade.exitTime ? new Date(trade.exitTime).toLocaleDateString() : 'Pending'}
                          </div>
                        </div>
                        <div className={cn(
                          "font-medium",
                          (trade.pnl || 0) >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(trade.pnl || 0)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {phase.status === 'pending' && (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">This phase is pending activation</p>
                  <p className="text-xs mt-1">Complete the previous phase to unlock</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

