/**
 * Rebuilt Realtime Status Indicator for Prop Firm Accounts
 * Compatible with the new prop firm system architecture
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  DollarSign,
  Target,
  Calendar,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
// PropFirmEngine import removed - no longer used
// PropFirmAccountFilters import removed - no longer used

interface PropFirmAccountStatus {
  id: string
  name?: string
  firmType: string
  status: 'active' | 'failed' | 'passed' | 'funded'
  currentPhase?: {
    id: string
    phaseNumber: number
    status: 'active' | 'passed' | 'failed' | 'pending'
    currentEquity: number
    startingBalance: number
    profitTarget: number
    daysTraded: number
    minTradingDays: number
    maxTradingDays?: number
  }
  drawdown?: {
    currentEquity: number
    dailyDrawdownUsed: number
    dailyDrawdownLimit: number
    dailyDrawdownRemaining: number
    maxDrawdownUsed: number
    maxDrawdownLimit: number
    maxDrawdownRemaining: number
    isBreached: boolean
    breachType?: 'daily_drawdown' | 'max_drawdown'
  }
  progress?: {
    profitProgress: number
    profitProgressPercent: number
    readyToAdvance: boolean
    failureReasons: string[]
  }
  statistics?: {
    totalTrades: number
    winRate: number
    profitFactor: number
    currentStreak: number
  }
  lastUpdate?: Date
}

interface RealtimeStatusIndicatorProps {
  accountId?: string
  refreshInterval?: number
  className?: string
  compact?: boolean
  showActions?: boolean
}

export function RealtimeStatusIndicatorV2({
  accountId,
  refreshInterval = 30000, // 30 seconds
  className,
  compact = false,
  showActions = true
}: RealtimeStatusIndicatorProps) {
  const [accountStatus, setAccountStatus] = useState<PropFirmAccountStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch account status
  const fetchAccountStatus = useCallback(async (showRefreshing = false) => {
    if (!accountId) return

    try {
      if (showRefreshing) setIsRefreshing(true)
      
      const response = await fetch(`/api/prop-firm/accounts/${accountId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch account status')
      }

      const data = await response.json()
      
      // Transform API response to component format
      const status: PropFirmAccountStatus = {
        id: data.account.id,
        name: data.account.name,
        firmType: data.account.firmType,
        status: data.account.status,
        currentPhase: data.currentPhase ? {
          id: data.currentPhase.id,
          phaseNumber: data.currentPhase.phaseType === 'funded' ? 3 : data.currentPhase.phaseType === 'phase_2' ? 2 : 1,
          status: data.currentPhase.status,
          currentEquity: data.currentPhase.currentEquity,
          startingBalance: data.currentPhase.startingBalance,
          profitTarget: data.currentPhase.profitTarget,
          daysTraded: data.currentPhase.daysTraded,
          minTradingDays: data.currentPhase.minTradingDays,
          maxTradingDays: data.currentPhase.maxTradingDays,
        } : undefined,
        drawdown: data.drawdown,
        progress: data.progress,
        statistics: data.statistics,
        lastUpdate: new Date(),
      }

      setAccountStatus(status)
      setError(null)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
      if (showRefreshing) setIsRefreshing(false)
    }
  }, [accountId])

  // Manual refresh
  const handleRefresh = useCallback(() => {
    fetchAccountStatus(true)
  }, [fetchAccountStatus])

  // Initial load only - disable polling for performance
  useEffect(() => {
    if (!accountId) return

    fetchAccountStatus()

    // PERFORMANCE FIX: Disable automatic polling that was causing constant requests
    // Users can manually refresh if needed
    
  }, [accountId, fetchAccountStatus]) // fetchAccountStatus is stable via useCallback

  // Render loading state
  if (isLoading) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Loading account status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render error state
  if (error || !accountStatus) {
    return (
      <Card className={cn('w-full border-destructive', className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">{error || 'Account not found'}</span>
            </div>
            {showActions && (
              <Button size="sm" variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-foreground'
      case 'passed': return 'bg-long'
      case 'funded': return 'bg-foreground'
      case 'failed': return 'bg-short'
      default: return 'bg-muted-foreground'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-3 w-3" />
      case 'passed': return <CheckCircle className="h-3 w-3" />
      case 'funded': return <DollarSign className="h-3 w-3" />
      case 'failed': return <AlertTriangle className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatPercent = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`
  }

  // Calculate key metrics
  const currentProfit = accountStatus.currentPhase ? 
    accountStatus.currentPhase.currentEquity - accountStatus.currentPhase.startingBalance : 0
  
  const profitPercent = accountStatus.currentPhase && accountStatus.currentPhase.startingBalance > 0 ? 
    (currentProfit / accountStatus.currentPhase.startingBalance) * 100 : 0

  const profitTargetProgress = accountStatus.progress ? 
    accountStatus.progress.profitProgressPercent : 0

  const dailyDrawdownPercent = accountStatus.drawdown && accountStatus.drawdown.dailyDrawdownLimit > 0 ? 
    (accountStatus.drawdown.dailyDrawdownUsed / accountStatus.drawdown.dailyDrawdownLimit) * 100 : 0

  const maxDrawdownPercent = accountStatus.drawdown && accountStatus.drawdown.maxDrawdownLimit > 0 ? 
    (accountStatus.drawdown.maxDrawdownUsed / accountStatus.drawdown.maxDrawdownLimit) * 100 : 0

  // Compact view
  if (compact) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Badge className={getStatusColor(accountStatus.status)}>
                {getStatusIcon(accountStatus.status)}
                <span className="ml-1 text-xs">{accountStatus.status.toUpperCase()}</span>
              </Badge>
              <div>
                <p className="text-sm font-medium">{accountStatus.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(accountStatus.currentPhase?.phaseNumber ?? 1) >= 3 ? 'FUNDED' :
                   (accountStatus.currentPhase?.phaseNumber ?? 1) === 2 ? 'PHASE 2' :
                   'PHASE 1'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn(
                'text-sm font-bold',
                currentProfit >= 0 ? 'text-long' : 'text-short'
              )}>
                {formatCurrency(currentProfit)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPercent(profitPercent)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Full detailed view
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center space-x-2">
              <span>{accountStatus.name}</span>
              <Badge className={getStatusColor(accountStatus.status)}>
                {getStatusIcon(accountStatus.status)}
                <span className="ml-1">{accountStatus.status.toUpperCase()}</span>
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {accountStatus.firmType} • {(accountStatus.currentPhase?.phaseNumber ?? 1) >= 3 ? 'FUNDED' :
               (accountStatus.currentPhase?.phaseNumber ?? 1) === 2 ? 'PHASE 2' :
               'PHASE 1'}
            </p>
          </div>
          {showActions && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn('h-3 w-3 mr-1', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Equity and Profit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center space-x-1 mb-1">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Current Equity</span>
            </div>
            <p className="text-lg font-bold">
              {formatCurrency(accountStatus.currentPhase?.currentEquity || 0)}
            </p>
          </div>
          <div>
            <div className="flex items-center space-x-1 mb-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Profit/Loss</span>
            </div>
            <p className={cn(
              'text-lg font-bold',
              currentProfit >= 0 ? 'text-long' : 'text-short'
            )}>
              {formatCurrency(currentProfit)} ({formatPercent(profitPercent)})
            </p>
          </div>
        </div>

        {/* Profit Target Progress */}
        {accountStatus.currentPhase && accountStatus.currentPhase.phaseNumber < 3 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1">
                <Target className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Profit Target</span>
              </div>
              <span className="text-xs font-medium">
                {formatPercent(profitTargetProgress)} / 100%
              </span>
            </div>
            <Progress value={Math.min(profitTargetProgress, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(accountStatus.currentPhase.profitTarget - currentProfit)} remaining
            </p>
          </div>
        )}

        {/* Drawdown Status */}
        {accountStatus.drawdown && (
          <div className="space-y-2">
            {/* Daily Drawdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Daily Drawdown</span>
                <span className={cn(
                  'text-xs font-medium',
                  dailyDrawdownPercent > 60 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {formatPercent(dailyDrawdownPercent)} used
                </span>
              </div>
              <Progress 
                value={dailyDrawdownPercent} 
                className={cn(
                  'h-1',
                  dailyDrawdownPercent > 60 ? '[&>div]:bg-destructive' : ''
                )}
              />
            </div>

            {/* Max Drawdown */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Max Drawdown</span>
                <span className={cn(
                  'text-xs font-medium',
                  maxDrawdownPercent > 60 ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  {formatPercent(maxDrawdownPercent)} used
                </span>
              </div>
              <Progress 
                value={maxDrawdownPercent} 
                className={cn(
                  'h-1',
                  maxDrawdownPercent > 60 ? '[&>div]:bg-destructive' : ''
                )}
              />
            </div>

            {/* Breach Warning */}
            {accountStatus.drawdown.isBreached && (
              <div className="flex items-center space-x-2 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  {accountStatus.drawdown.breachType?.replace('_', ' ').toUpperCase()} BREACH
                </span>
              </div>
            )}
          </div>
        )}

        {/* Trading Progress */}
        {accountStatus.currentPhase && (
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-muted-foreground">Trading Days</span>
              <p className="font-medium">
                {accountStatus.currentPhase.daysTraded} / {accountStatus.currentPhase.minTradingDays}
                {accountStatus.currentPhase.maxTradingDays && ` (max ${accountStatus.currentPhase.maxTradingDays})`}
              </p>
            </div>
            {accountStatus.statistics && (
              <div>
                <span className="text-muted-foreground">Win Rate</span>
                <p className="font-medium">{formatPercent(accountStatus.statistics.winRate)}</p>
              </div>
            )}
          </div>
        )}

        {/* Ready to Advance */}
        {accountStatus.progress?.readyToAdvance && (
          <div className="flex items-center space-x-2 p-2 bg-long/10 border border-long/20 rounded-md">
            <CheckCircle className="h-4 w-4 text-long" />
            <span className="text-sm font-medium text-long">
              Ready to advance to next phase!
            </span>
          </div>
        )}

        {/* Last Update */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>Live</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
