'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { usePropFirmRealtime } from "@/hooks/use-prop-firm-realtime"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft,
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  Shield,
  DollarSign,
  Clock,
  Settings,
  RefreshCw,
  Activity,
  BarChart3,
  Calendar,
  CreditCard
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountDashboardData, AccountSummary, PhaseType, AccountStatus, PropFirmTrade } from "@/types/prop-firm"
import { PhaseTransitionDialog } from "@/app/dashboard/components/prop-firm/phase-transition-dialog"
import { RealtimeStatusIndicator, RealtimeMetrics } from "@/components/prop-firm/realtime-status-indicator"
import { AccountLoadingState } from "@/components/prop-firm/account-loading-skeleton"
import { PropFirmErrorBoundary, AccountNotFoundError, ConnectionError } from "@/components/prop-firm/account-error-boundary"

interface AccountDetailPageProps {
  params: {
    id: string
  }
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [showTransitionDialog, setShowTransitionDialog] = useState(false)
  const [accountData, setAccountData] = useState<any>(null) // For legacy compatibility

  const accountId = params.id as string
  
  // Use real-time hook for live updates
  const { 
    account: realtimeAccount, 
    drawdown: realtimeDrawdown, 
    isLoading, 
    error: realtimeError, 
    lastUpdated, 
    refetch, 
    isPolling 
  } = usePropFirmRealtime({ 
    accountId, 
    pollInterval: 30000,
    enabled: !!accountId 
  })

  // Legacy fetch function for backward compatibility - now handled by real-time hook
  const fetchAccountData = async () => {
    await refetch()
  }

  // Handle real-time data updates and error states
  useEffect(() => {
    if (realtimeError) {
      if (realtimeError.includes('404') || realtimeError.includes('not found')) {
        toast({
          title: "Account Not Found",
          description: "This account has been deleted or does not exist.",
          variant: "destructive"
        })
        setTimeout(() => {
          router.push('/dashboard/prop-firm/accounts')
        }, 3000)
      } else {
        toast({
          title: "Loading...",
          description: realtimeError,
          variant: "destructive"
        })
      }
    }
  }, [realtimeError, router])

  // Sync real-time data with legacy state for compatibility
  useEffect(() => {
    if (realtimeAccount && realtimeDrawdown) {
      // Create compatible data structure
      const compatibleData = {
        account: realtimeAccount,
        currentPhase: {
          phaseType: realtimeAccount.currentPhase || 'evaluation',
          phaseStatus: 'active' // Assume active if we're getting real-time data
        },
        drawdown: realtimeDrawdown,
        progress: {
          profitProgress: realtimeAccount.profitTargetProgress || 0,
          canProgress: false, // Will be determined by backend
          nextPhaseType: null
        }
      }
      setAccountData(compatibleData)
    }
  }, [realtimeAccount, realtimeDrawdown])

  const getStatusVariant = (status: AccountStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'outline'
      case 'funded': return 'default'
      case 'failed': return 'destructive'
      case 'passed': return 'secondary'
      default: return 'outline'
    }
  }

  const getPhaseColor = (phase: PhaseType) => {
    switch (phase) {
      case 'phase_1': return 'bg-chart-3 text-white'
      case 'phase_2': return 'bg-chart-5 text-white'
      case 'funded': return 'bg-chart-1 text-white'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Handle loading state
  if (isLoading && !accountData) {
    return (
      <div className="container mx-auto p-6">
        <AccountLoadingState />
      </div>
    )
  }

  // Handle connection errors
  if (realtimeError && realtimeError.includes('404')) {
    return (
      <AccountNotFoundError 
        accountId={accountId}
        onRetry={refetch}
        onGoBack={() => router.push('/dashboard/accounts')}
      />
    )
  }

  // Handle no data state
  if (!accountData) {
    return (
      <div className="container mx-auto p-6">
        {realtimeError ? (
          <ConnectionError error={realtimeError} onRetry={refetch} />
        ) : (
          <AccountNotFoundError 
            accountId={accountId}
            onRetry={refetch}
            onGoBack={() => router.push('/dashboard/accounts')}
          />
        )}
      </div>
    )
  }

  const { account, currentPhase, drawdown, progress, payoutEligibility } = accountData

  return (
    <PropFirmErrorBoundary onReset={() => window.location.reload()}>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/accounts')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {account.name || account.number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusVariant(account.status)} className="text-xs">
                {account.status === 'active' ? 'Active' : account.status === 'funded' ? 'Funded' : account.status === 'failed' ? 'Failed' : account.status}
              </Badge>
              <Badge className={cn("text-white", getPhaseColor(currentPhase.phaseType))}>
                {currentPhase.phaseType === 'phase1' ? 'Phase 1' : currentPhase.phaseType === 'phase2' ? 'Phase 2' : currentPhase.phaseType === 'funded' ? 'Funded' : currentPhase.phaseType}
              </Badge>
              <RealtimeStatusIndicator 
                isPolling={isPolling} 
                lastUpdated={lastUpdated} 
                error={realtimeError} 
              />
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{account.propfirm}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAccountData}
              disabled={isLoading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            <RealtimeMetrics isLoading={isLoading} lastUpdated={lastUpdated} />
          </div>
        </div>
      </div>

      {/* Risk Alert */}
      {drawdown.isBreached && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Account has breached {drawdown.breachType} limits. 
            {drawdown.breachType === 'daily_drawdown' 
              ? ' Daily drawdown limit exceeded.' 
              : ' Maximum drawdown limit exceeded.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Account Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Starting: {formatCurrency(account.startingBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Open P&L
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.currentEquity)}</div>
            {account.openPnl && account.openPnl !== 0 && (
              <p className={cn("text-xs", account.openPnl > 0 ? "text-green-600" : "text-red-600")}>
                Unrealized: {formatCurrency(account.openPnl)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Drawdown
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", 
              drawdown.dailyDrawdownRemaining < 500 ? "text-red-600" : "text-green-600"
            )}>
              {formatCurrency(drawdown.dailyDrawdownRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">
              Daily start: {formatCurrency(drawdown.dailyStartBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Daily Loss
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold",
              drawdown.maxDrawdownRemaining < 1000 ? "text-red-600" : "text-green-600"
            )}>
              {formatCurrency(drawdown.maxDrawdownRemaining)}
            </div>
            <p className="text-xs text-muted-foreground">
              Peak: {formatCurrency(drawdown.highestEquity)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      {currentPhase.profitTarget && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Profit Target - {currentPhase.phaseType === 'phase1' ? 'Phase 1' : currentPhase.phaseType === 'phase2' ? 'Phase 2' : currentPhase.phaseType === 'funded' ? 'Funded' : currentPhase.phaseType}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{formatPercentage(progress.profitProgress)}</span>
              </div>
              <Progress value={Math.min(progress.profitProgress, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Current: {formatCurrency(currentPhase.netProfitSincePhaseStart)}</span>
                <span>Target: {formatCurrency(currentPhase.profitTarget)}</span>
              </div>
              {progress.canProgress && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <TrendingUp className="h-4 w-4" />
                  Ready to advance to {progress.nextPhaseType && (progress.nextPhaseType === 'phase1' ? 'Phase 1' : progress.nextPhaseType === 'phase2' ? 'Phase 2' : progress.nextPhaseType === 'funded' ? 'Funded' : progress.nextPhaseType)}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payout Eligibility for Funded Accounts */}
      {currentPhase.phaseType === 'funded' && payoutEligibility && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payout Eligibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Status</span>
                <Badge variant={payoutEligibility.isEligible ? "default" : "secondary"}>
                  {payoutEligibility.isEligible ? "Eligible" : "Not Eligible"}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Days since funded</span>
                  <div className="font-medium">{payoutEligibility.daysSinceFunded}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Days since last payout</span>
                  <div className="font-medium">{payoutEligibility.daysSinceLastPayout}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Profit since last payout</span>
                  <div className="font-medium">{formatCurrency(payoutEligibility.netProfitSinceLastPayout)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Min profit required</span>
                  <div className="font-medium">
                    {payoutEligibility.minProfitRequired 
                      ? formatCurrency(payoutEligibility.minProfitRequired) 
                      : "None"}
                  </div>
                </div>
              </div>
              {payoutEligibility.blockers.length > 0 && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Blockers:</h4>
                  {payoutEligibility.blockers.map((blocker: string, index: number) => (
                    <div key={index} className="text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      {blocker}
                    </div>
                  ))}
                </div>
              )}
              {payoutEligibility.isEligible && (
                <Button 
                  onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/payouts/new`)}
                  className="w-full"
                >
                  Request Payout
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(!accountData.recentActivity?.trades || accountData.recentActivity.trades.length === 0) ? (
                    <p className="text-muted-foreground text-center py-4">No recent trades</p>
                  ) : (
                    accountData.recentActivity.trades.slice(0, 5).map((trade: PropFirmTrade) => (
                      <div key={trade.id} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{trade.symbol || trade.instrument}</div>
                          <div className="text-sm text-muted-foreground">
                            {trade.entryTime ? new Date(trade.entryTime).toLocaleDateString() : trade.entryDate}
                          </div>
                        </div>
                        <div className={cn("font-medium", 
                          (trade.realizedPnl || trade.pnl) > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {formatCurrency(trade.realizedPnl || trade.pnl)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Evaluation Type</span>
                      <div className="font-medium">{account.evaluationType}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timezone</span>
                      <div className="font-medium">{account.timezone}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Daily Reset</span>
                      <div className="font-medium">{account.dailyResetTime}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max DD Mode</span>
                      <div className="font-medium">{account.drawdownModeMax}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Trades</span>
                <Badge variant="secondary">
                  {accountData.recentActivity?.trades?.length || 0} Total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(!accountData.recentActivity?.trades || accountData.recentActivity.trades.length === 0) ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No trades found</p>
                  </div>
                ) : (
                  <>
                    {/* Phase Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {accountData.account.phases?.map((phase: any) => {
                        const phaseTradeCount = accountData.recentActivity.trades.filter((t: any) => t.phaseId === phase.id).length
                        const phasePnL = accountData.recentActivity.trades
                          .filter((t: any) => t.phaseId === phase.id)
                          .reduce((sum: number, t: any) => sum + (t.realizedPnl || t.pnl || 0), 0)
                        
                        return (
                          <Card key={phase.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant={phase.phaseStatus === 'active' ? 'default' : phase.phaseStatus === 'passed' ? 'secondary' : 'destructive'}>
                                {(phase?.phaseType || 'evaluation').replace('_', ' ').toUpperCase()}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {phase.phaseStatus}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Trades:</span>
                                <span className="font-medium">{phaseTradeCount}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>P&L:</span>
                                <span className={cn("font-medium", phasePnL >= 0 ? "text-green-600" : "text-red-600")}>
                                  {formatCurrency(phasePnL)}
                                </span>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>

                    {/* Recent Trades Table */}
                    <div className="border rounded-lg">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="border-b bg-muted/50">
                            <tr className="text-left">
                              <th className="p-3 font-medium">Symbol</th>
                              <th className="p-3 font-medium">Side</th>
                              <th className="p-3 font-medium">Quantity</th>
                              <th className="p-3 font-medium">Entry</th>
                              <th className="p-3 font-medium">Exit</th>
                              <th className="p-3 font-medium">P&L</th>
                              <th className="p-3 font-medium">Phase</th>
                              <th className="p-3 font-medium">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accountData.recentActivity.trades.slice(0, 20).map((trade: PropFirmTrade, index: number) => (
                              <tr key={trade.id} className={cn("border-b", index % 2 === 0 ? "bg-background" : "bg-muted/25")}>
                                <td className="p-3 font-medium">{trade.symbol || trade.instrument}</td>
                                <td className="p-3">
                                  <Badge variant={trade.side?.toUpperCase() === 'BUY' ? 'default' : 'secondary'}>
                                    {trade.side?.toUpperCase() || 'N/A'}
                                  </Badge>
                                </td>
                                <td className="p-3">{trade.quantity}</td>
                                <td className="p-3 text-sm">{trade.entryPrice}</td>
                                <td className="p-3 text-sm">{trade.closePrice}</td>
                                <td className={cn("p-3 font-medium", (trade.realizedPnl || trade.pnl) >= 0 ? "text-green-600" : "text-red-600")}>
                                  {formatCurrency(trade.realizedPnl || trade.pnl)}
                                </td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-xs">
                                    {(trade.phase?.phaseType || 'evaluation').replace('_', ' ')}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                  {trade.entryTime ? new Date(trade.entryTime).toLocaleDateString() : 
                                   trade.entryDate ? new Date(trade.entryDate).toLocaleDateString() : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {accountData.recentActivity.trades.length > 20 && (
                      <div className="text-center py-4">
                        <Button variant="outline" size="sm">
                          View All Trades ({accountData.recentActivity.trades.length})
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="space-y-6">
            {/* Overall Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-2xl font-bold">{accountData.recentActivity?.trades?.length || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(() => {
                        const trades = accountData.recentActivity?.trades || []
                        const winningTrades = trades.filter((t: any) => (t.realizedPnl || t.pnl) > 0).length
                        const losingTrades = trades.filter((t: any) => (t.realizedPnl || t.pnl) < 0).length
                        const tradableTradesCount = winningTrades + losingTrades
                        return tradableTradesCount > 0 ? Math.round((winningTrades / tradableTradesCount) * 100) : 0
                      })()}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={cn("text-2xl font-bold", 
                      (accountData.recentActivity?.trades?.reduce((sum: number, t: any) => sum + (t.realizedPnl || t.pnl || 0), 0) || 0) >= 0 
                        ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(accountData.recentActivity?.trades?.reduce((sum: number, t: any) => sum + (t.realizedPnl || t.pnl || 0), 0) || 0)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Avg Trade</p>
                    <p className={cn("text-2xl font-bold",
                      (accountData.recentActivity?.trades?.length > 0 
                        ? (accountData.recentActivity.trades.reduce((sum: number, t: any) => sum + (t.realizedPnl || t.pnl || 0), 0) / accountData.recentActivity.trades.length)
                        : 0) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {accountData.recentActivity?.trades?.length > 0 
                        ? formatCurrency(accountData.recentActivity.trades.reduce((sum: number, t: any) => sum + (t.realizedPnl || t.pnl || 0), 0) / accountData.recentActivity.trades.length)
                        : formatCurrency(0)
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phase-by-Phase Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Phase Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accountData.account.phases?.map((phase: any) => {
                    const phaseTrades = accountData.recentActivity?.trades?.filter((t: any) => t.phaseId === phase.id) || []
                    const phasePnL = phaseTrades.reduce((sum: number, t: any) => sum + (t.realizedPnl || t.pnl || 0), 0)
                    // Calculate win rate excluding break-even trades (industry standard)
                    const winningTrades = phaseTrades.filter((t: any) => (t.realizedPnl || t.pnl) > 0).length
                    const losingTrades = phaseTrades.filter((t: any) => (t.realizedPnl || t.pnl) < 0).length
                    const tradableTradesCount = winningTrades + losingTrades
                    const phaseWinRate = tradableTradesCount > 0 
                      ? Math.round((winningTrades / tradableTradesCount) * 100)
                      : 0
                    
                    return (
                      <Card key={phase.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={phase.phaseStatus === 'active' ? 'default' : phase.phaseStatus === 'passed' ? 'secondary' : 'destructive'}>
                              {(phase?.phaseType || 'evaluation').replace('_', ' ').toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {phase.phaseStatus} • Started {new Date(phase.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {phase.profitTarget && (
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Target</p>
                              <p className="font-medium">{formatCurrency(phase.profitTarget)}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Trades</p>
                            <p className="font-medium text-lg">{phaseTrades.length}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Win Rate</p>
                            <p className="font-medium text-lg text-green-600">{phaseWinRate}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">P&L</p>
                            <p className={cn("font-medium text-lg", phasePnL >= 0 ? "text-green-600" : "text-red-600")}>
                              {formatCurrency(phasePnL)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg per Trade</p>
                            <p className={cn("font-medium text-lg", 
                              phaseTrades.length > 0 ? (phasePnL / phaseTrades.length >= 0 ? "text-green-600" : "text-red-600") : ""
                            )}>
                              {phaseTrades.length > 0 ? formatCurrency(phasePnL / phaseTrades.length) : formatCurrency(0)}
                            </p>
                          </div>
                        </div>
                        
                        {phase.profitTarget && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Progress to Target</span>
                              <span>{Math.min(Math.round((phasePnL / phase.profitTarget) * 100), 100)}%</span>
                            </div>
                            <Progress value={Math.min((phasePnL / phase.profitTarget) * 100, 100)} className="h-2" />
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Trading Instruments */}
          <Card>
            <CardHeader>
                <CardTitle>Instrument Performance</CardTitle>
            </CardHeader>
            <CardContent>
                {(() => {
                  const instrumentStats = (accountData.recentActivity?.trades || []).reduce((acc: any, trade: any) => {
                    const symbol = trade.symbol || trade.instrument || 'Unknown'
                    if (!acc[symbol]) {
                      acc[symbol] = { trades: 0, pnl: 0, wins: 0, losses: 0 }
                    }
                    acc[symbol].trades++
                    acc[symbol].pnl += (trade.realizedPnl || trade.pnl || 0)
                    const tradePnl = (trade.realizedPnl || trade.pnl || 0)
                    if (tradePnl > 0) {
                      acc[symbol].wins++
                    } else if (tradePnl < 0) {
                      acc[symbol].losses++
                    }
                    return acc
                  }, {})
                  
                  const sortedInstruments = Object.entries(instrumentStats)
                    .sort(([,a]: any, [,b]: any) => b.trades - a.trades)
                    .slice(0, 10)
                  
                  return (
                    <div className="space-y-3">
                      {sortedInstruments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">No trading data available</p>
                      ) : (
                        sortedInstruments.map(([symbol, stats]: any) => (
                          <div key={symbol} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="font-medium">{symbol}</div>
                              <Badge variant="outline">{stats.trades} trades</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="text-center">
                                <p className="text-muted-foreground">Win Rate</p>
                                <p className="font-medium text-green-600">
                                  {(() => {
                                    const tradableTradesCount = stats.wins + stats.losses
                                    return tradableTradesCount > 0 ? Math.round((stats.wins / tradableTradesCount) * 100) : 0
                                  })()}%
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-muted-foreground">Total P&L</p>
                                <p className={cn("font-medium", stats.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                                  {formatCurrency(stats.pnl)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                })()}
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="payouts">
          <div className="space-y-6">
            {/* Payout Eligibility */}
            {currentPhase.phaseType === 'funded' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payout Eligibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accountData.payoutEligibility ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge variant={accountData.payoutEligibility.isEligible ? "default" : "secondary"}>
                          {accountData.payoutEligibility.isEligible ? "Eligible" : "Not Eligible"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Days Since Funded:</span>
                          <span className="font-medium ml-2">{accountData.payoutEligibility.daysSinceFunded}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Days Since Last Payout:</span>
                          <span className="font-medium ml-2">{accountData.payoutEligibility.daysSinceLastPayout}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Net Profit Available:</span>
                          <span className="font-medium ml-2">{formatCurrency(accountData.payoutEligibility.netProfitSinceLastPayout)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min Days Required:</span>
                          <span className="font-medium ml-2">{accountData.payoutEligibility.minDaysRequired}</span>
                        </div>
                      </div>
                      {accountData.payoutEligibility.blockers?.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Blockers:</p>
                          <ul className="text-sm text-red-600 space-y-1">
                            {accountData.payoutEligibility.blockers.map((blocker: string, index: number) => (
                              <li key={index}>• {blocker}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {accountData.payoutEligibility.isEligible && (
                        <Button className="w-full">
                          Request Payout ({formatCurrency(accountData.payoutEligibility.profitSplitAmount || 0)})
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Payout eligibility calculation not available</p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Payout History */}
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Payout History</span>
                  <Badge variant="outline">
                    {accountData.account.payouts?.length || 0} Total
                  </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {(!accountData.account.payouts || accountData.account.payouts.length === 0) ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payout history</p>
                    {currentPhase.phaseType !== 'funded' && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Payouts are only available for funded accounts
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accountData.account.payouts.map((payout: any) => (
                      <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">
                            {formatCurrency(payout.amountPaid || payout.amount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payout.paidAt ? new Date(payout.paidAt).toLocaleDateString() : 
                             new Date(payout.date || payout.createdAt).toLocaleDateString()}
                          </div>
                          {payout.notes && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {payout.notes}
                            </div>
                          )}
                        </div>
                        <Badge variant={
                          payout.status === 'PAID' ? 'default' : 
                          payout.status === 'PENDING' ? 'secondary' : 'destructive'
                        }>
                          {payout.status || 'COMPLETED'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
            </CardContent>
          </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Account Number</label>
                      <p className="font-medium">{account.number}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Account Name</label>
                      <p className="font-medium">{account.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Prop Firm</label>
                      <p className="font-medium">{account.propfirm}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Starting Balance</label>
                      <p className="font-medium">{formatCurrency(account.startingBalance)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Account Status</label>
                      <Badge variant={
                        account.status === 'active' ? 'default' :
                        account.status === 'funded' ? 'default' :
                        account.status === 'failed' ? 'destructive' : 'secondary'
                      }>
                        {account.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Current Phase</label>
                      <p className="font-medium">{(currentPhase?.phaseType || 'evaluation').replace('_', ' ').toUpperCase()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Phase Status</label>
                      <Badge variant={
                        currentPhase?.phaseStatus === 'active' ? 'default' :
                        currentPhase?.phaseStatus === 'passed' ? 'secondary' : 'destructive'
                      }>
                        {(currentPhase?.phaseStatus || 'active').toUpperCase()}
                      </Badge>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Created Date</label>
                      <p className="font-medium">{new Date(account.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Evaluation Type</label>
                      <p className="font-medium">{(account?.evaluationType || 'two_step').replace('_', '-').toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trading Rules */}
            <Card>
              <CardHeader>
                <CardTitle>Trading Rules & Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Daily Drawdown Limit</label>
                      <p className="font-medium text-red-600">
                        {account.dailyDrawdownType === 'percent' 
                          ? `${account.dailyDrawdownAmount}% (${formatCurrency(account.startingBalance * (account.dailyDrawdownAmount / 100))})`
                          : formatCurrency(account.dailyDrawdownAmount)
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Max Drawdown Limit</label>
                      <p className="font-medium text-red-600">
                        {account.maxDrawdownType === 'percent' 
                          ? `${account.maxDrawdownAmount}% (${formatCurrency(account.startingBalance * (account.maxDrawdownAmount / 100))})`
                          : formatCurrency(account.maxDrawdownAmount)
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Drawdown Mode</label>
                      <p className="font-medium">{account.drawdownModeMax.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Timezone</label>
                      <p className="font-medium">{account.timezone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Daily Reset Time</label>
                      <p className="font-medium">{account.dailyResetTime}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Include Open P&L in DD</label>
                      <Badge variant={account.ddIncludeOpenPnl ? 'default' : 'secondary'}>
                        {account.ddIncludeOpenPnl ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payout Settings */}
            {account.profitSplitPercent && (
              <Card>
                <CardHeader>
                  <CardTitle>Payout Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Profit Split</label>
                        <p className="font-medium">{account.profitSplitPercent}% (You) / {100 - account.profitSplitPercent}% (Firm)</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Payout Cycle</label>
                        <p className="font-medium">Every {account.payoutCycleDays} days</p>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Min Days to First Payout</label>
                        <p className="font-medium">{account.minDaysToFirstPayout} days</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Reset on Payout</label>
                        <Badge variant={account.resetOnPayout ? 'default' : 'secondary'}>
                          {account.resetOnPayout ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Reduce Balance by Payout</label>
                        <Badge variant={account.reduceBalanceByPayout ? 'default' : 'secondary'}>
                          {account.reduceBalanceByPayout ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      {account.payoutEligibilityMinProfit && (
                        <div>
                          <label className="text-sm text-muted-foreground">Min Profit for Payout</label>
                          <p className="font-medium">{formatCurrency(account.payoutEligibilityMinProfit)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Breach History */}
            {accountData.recentActivity?.breaches && accountData.recentActivity.breaches.length > 0 && (
          <Card>
            <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Breach History
                  </CardTitle>
            </CardHeader>
            <CardContent>
                  <div className="space-y-4">
                    {accountData.recentActivity.breaches.map((breach: any) => (
                      <div key={breach.id} className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                        <div>
                          <div className="font-medium text-red-800">
                            {(breach?.breachType || 'drawdown').replace('_', ' ').toUpperCase()} BREACH
                          </div>
                          <div className="text-sm text-red-600">
                            {breach.description}
                          </div>
                          <div className="text-xs text-red-500 mt-1">
                            {new Date(breach.breachTime).toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-red-600">Amount: {formatCurrency(breach.breachAmount)}</div>
                          <div className="text-sm text-red-600">Limit: {formatCurrency(breach.breachThreshold)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
            </CardContent>
          </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Phase Transition Dialog */}
      {showTransitionDialog && accountData && (
        <PhaseTransitionDialog
          isOpen={showTransitionDialog}
          onClose={() => setShowTransitionDialog(false)}
          accountId={accountId}
          currentPhase={accountData.currentPhase}
          nextPhaseType={accountData.progress?.nextPhaseType}
          startingBalance={accountData.account.startingBalance}
        />
      )}
    </div>
    </PropFirmErrorBoundary>
  )
}
