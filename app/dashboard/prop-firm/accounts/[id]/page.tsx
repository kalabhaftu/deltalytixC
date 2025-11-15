'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from "@/context/auth-provider"
import { toast } from "sonner"
import { usePropFirmRealtime } from "@/hooks/use-prop-firm-realtime"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
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
import { cn, formatCurrency, formatQuantity, formatPercent } from "@/lib/utils"
import { AccountDashboardData, AccountSummary, PhaseType, AccountStatus, PropFirmTrade } from "@/types/prop-firm"
import { RealtimeStatusIndicatorV2 } from "@/components/prop-firm/realtime-status-indicator-v2"
import { AccountLoadingState } from "@/components/prop-firm/account-loading-skeleton"
import { PropFirmErrorBoundary, AccountNotFoundError, ConnectionError } from "@/components/prop-firm/account-error-boundary"
import { PhaseAccordionSection } from "./components/phase-accordion-section"
import { HistoryTab } from "./components/history-tab"

interface AccountDetailPageProps {
  params: {
    id: string
  }
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('trades')
  const [accountData, setAccountData] = useState<any>(null) // For legacy compatibility
  const [isEditingSettings, setIsEditingSettings] = useState(false)
  const [editedAccountName, setEditedAccountName] = useState('')
  const [tradesData, setTradesData] = useState<any[]>([])
  const [payoutsData, setPayoutsData] = useState<any>(null)
  const [isLoadingCompleteData, setIsLoadingCompleteData] = useState(false)
  const [dataFetchError, setDataFetchError] = useState<string | null>(null)

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

  // Legacy fetch function for backward compatibility - now handles complete data
  const fetchAccountData = async () => {
    await refetch()
    await fetchCompleteData()
  }

  // Fetch complete trade data
  const fetchCompleteTradeData = useCallback(async () => {
    try {
      const response = await fetch(`/api/prop-firm-v2/accounts/${accountId}/trades?phase=all`)
      const data = await response.json()
      return data.success ? data.data.trades : []
    } catch (error) {
      return []
    }
  }, [accountId])

  // Fetch payout data
  const fetchPayoutData = useCallback(async () => {
    try {
      const response = await fetch(`/api/prop-firm-v2/accounts/${accountId}/payouts`)
      const data = await response.json()
      return data.success ? data.data : { eligibility: null, history: [] }
    } catch (error) {
      return { eligibility: null, history: [] }
    }
  }, [accountId])

  // Fetch all complete data
  const fetchCompleteData = useCallback(async () => {
    setIsLoadingCompleteData(true)
    setDataFetchError(null)
    
    try {
      const [trades, payouts] = await Promise.all([
        fetchCompleteTradeData(),
        fetchPayoutData()
      ])
      
      setTradesData(trades)
      setPayoutsData(payouts)
    } catch (error) {
      setDataFetchError('Failed to load complete account data')
      toast.error("Data Loading Error", {
        description: "Some account data could not be loaded. Please try refreshing."
      })
    } finally {
      setIsLoadingCompleteData(false)
    }
  }, [fetchCompleteTradeData, fetchPayoutData])

  // Handle real-time data updates and error states
  useEffect(() => {
    if (realtimeError) {
      if (realtimeError.includes('404') || realtimeError.includes('not found')) {
        toast.error("Account Not Found", {
          description: "This account has been deleted or does not exist."
        })
        setTimeout(() => {
          router.push('/dashboard/prop-firm/accounts')
        }, 3000)
      } else {
        toast.error("Connection Error", {
          description: realtimeError
        })
      }
    }
  }, [realtimeError, router])

  // ✅ Fetch complete data when component mounts and account loads
  useEffect(() => {
    if (realtimeAccount && accountId) {
      fetchCompleteData()
    }
  }, [realtimeAccount, accountId, fetchCompleteData])

  // REMOVED: Transition detection moved to accounts list page to avoid showing everywhere

  // Sync real-time data with legacy state for compatibility
  useEffect(() => {
    if (realtimeAccount) {
      // Create compatible data structure with proper null checks
      const compatibleData = {
        account: {
          id: realtimeAccount.id,
          name: realtimeAccount.accountName || 'Unnamed Account',
          number: realtimeAccount.currentPhase?.phaseId || `master-${realtimeAccount.id}`,
          currentBalance: realtimeAccount.currentBalance ?? realtimeAccount.accountSize ?? 0,
          currentEquity: realtimeAccount.currentEquity ?? realtimeAccount.currentBalance ?? realtimeAccount.accountSize ?? 0,
          startingBalance: realtimeAccount.accountSize ?? 0,
          status: realtimeAccount.status || 'active',
          evaluationType: realtimeAccount.evaluationType || 'two_step',
          createdAt: realtimeAccount.lastUpdated || new Date().toISOString(),
          timezone: 'UTC',
          dailyResetTime: '00:00',
          drawdownModeMax: 'static',
          dailyDrawdownType: 'percent',
          dailyDrawdownAmount: realtimeAccount.currentPhase?.dailyDrawdownPercent ?? 5,
          maxDrawdownType: 'percent',
          maxDrawdownAmount: realtimeAccount.currentPhase?.maxDrawdownPercent ?? 10,
          ddIncludeOpenPnl: false,
          profitSplitPercent: realtimeAccount.currentPhase?.profitSplitPercent,
          payoutCycleDays: realtimeAccount.currentPhase?.payoutCycleDays,
          minDaysToFirstPayout: realtimeAccount.currentPhase?.minTradingDays,
          openPnl: 0
        },
        currentPhase: {
          phaseNumber: realtimeAccount.currentPhase?.phaseNumber ?? 1,
          status: realtimeAccount.currentPhase?.status || 'active',
          profitTarget: realtimeAccount.currentPhase && realtimeAccount.accountSize 
            ? (realtimeAccount.currentPhase.profitTargetPercent / 100) * realtimeAccount.accountSize 
            : 0,
          netProfitSincePhaseStart: realtimeAccount.currentPnL ?? 0,
          phaseDisplayInfo: {
            label: (realtimeAccount.currentPhase?.phaseNumber ?? 1) === 1 ? 'Phase 1' : 
                   (realtimeAccount.currentPhase?.phaseNumber ?? 1) === 2 ? 'Phase 2' : 
                   (realtimeAccount.currentPhase?.phaseNumber ?? 1) >= 3 ? 'Funded' : 'Phase 1',
            color: (realtimeAccount.currentPhase?.phaseNumber ?? 1) === 1 ? 'bg-foreground text-background' : 
                   (realtimeAccount.currentPhase?.phaseNumber ?? 1) === 2 ? 'bg-foreground text-background' : 
                   'bg-green-600 text-white',
            accountNumber: realtimeAccount.currentPhase?.phaseId || realtimeAccount.accountName
          }
        },
        drawdown: {
          dailyDrawdownRemaining: realtimeDrawdown?.dailyDrawdownRemaining ?? 0,
          maxDrawdownRemaining: realtimeDrawdown?.maxDrawdownRemaining ?? 0,
          dailyStartBalance: realtimeDrawdown?.dailyStartBalance ?? realtimeAccount.accountSize ?? 0,
          highestEquity: realtimeDrawdown?.highestEquity ?? realtimeAccount.accountSize ?? 0,
          currentEquity: realtimeDrawdown?.currentEquity ?? realtimeAccount.currentBalance ?? realtimeAccount.accountSize ?? 0,
          isBreached: realtimeDrawdown?.isBreached ?? false,
          breachType: realtimeDrawdown?.breachType
        },
        progress: {
          profitProgress: realtimeAccount.profitTargetProgress ?? 0,
          canProgress: false, // Will be determined by backend
          nextPhaseNumber: null,
          nextPhaseType: realtimeAccount.currentPhase?.phaseNumber === 1 ? 'phase2' : 
                        realtimeAccount.currentPhase?.phaseNumber === 2 ? 'funded' : null
        },
        recentTrades: tradesData || [], // ✅ Complete trade data
        payoutEligibility: payoutsData?.eligibility || null, // ✅ Real eligibility
        payouts: payoutsData?.history || [], // ✅ Real payout history
        phases: realtimeAccount.phases || []
      }
      setAccountData(compatibleData)
    }
  }, [realtimeAccount, realtimeDrawdown, tradesData, payoutsData])

  // Initialize edited account name when account data loads
  useEffect(() => {
    if (accountData?.account?.name) {
      setEditedAccountName(accountData.account.name)
    }
  }, [accountData?.account?.name])

  // (Removed duplicate phase transition detection - handled by the useEffect above)

  // Handler for saving settings
  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`/api/prop-firm-v2/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountName: editedAccountName })
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      toast.success("Settings updated successfully")
      setIsEditingSettings(false)
      await refetch()
    } catch (error) {
      toast.error("Failed to update settings")
    }
  }

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

  const formatCurrency = (amount: number | undefined | null) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount ?? 0)
  }

  const formatPercentage = (value: number | undefined | null) => {
    return formatPercent(value ?? 0, 1)
  }

  // Handle loading state - show loading while fetching data
  if (isLoading || (!accountData && !realtimeError)) {
    return (
      <div className="container mx-auto p-6">
        <AccountLoadingState />
      </div>
    )
  }

  // Handle connection errors (404 or other errors)
  if (realtimeError) {
    if (realtimeError.includes('404') || realtimeError.includes('not found')) {
      return (
        <AccountNotFoundError 
          accountId={accountId}
          onRetry={refetch}
          onGoBack={() => router.push('/dashboard/accounts')}
        />
      )
    }
    // Other connection errors
    return (
      <div className="container mx-auto p-6">
        <ConnectionError error={realtimeError} onRetry={refetch} />
      </div>
    )
  }

  // Final check - if no data and no error, something went wrong
  if (!accountData) {
    return (
      <div className="container mx-auto p-6">
        <AccountNotFoundError
          accountId={accountId}
          onRetry={refetch}
          onGoBack={() => router.push('/dashboard/accounts')}
        />
      </div>
    )
  }

  const { account, currentPhase, drawdown, progress, payoutEligibility } = accountData

  return (
    <PropFirmErrorBoundary onReset={() => window.location.reload()}>
      <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/accounts')}
            className="w-fit"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(account.status)} className="text-xs">
              {account.status === 'active' ? 'Active' : (account.currentPhase || 1) >= 3 ? 'Funded' : account.status === 'failed' ? 'Failed' : account.status}
            </Badge>
            {currentPhase?.phaseDisplayInfo && (
              <Badge variant="outline">
                {currentPhase.phaseDisplayInfo.label}
              </Badge>
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">•</span>
            <span className="text-sm text-muted-foreground">{realtimeAccount?.propFirmName || 'Prop Firm'}</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">•</span>
            <span className="text-xs sm:text-sm text-muted-foreground truncate">
              ID: {account.id}
            </span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAccountData}
          disabled={isLoading}
          className="w-fit"
        >
          <RefreshCw className={cn("h-4 w-4 sm:mr-2", isLoading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
              Daily Drawdown
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
              Resets daily at {account.dailyResetTime || '5:00 PM'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Max Drawdown
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
              {account.drawdownModeMax === 'trailing'
                ? `Peak: ${formatCurrency(drawdown.highestEquity)}`
                : `From starting balance`
              }
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
              Profit Target - {(realtimeAccount?.currentPhase?.phaseNumber ?? 1) >= 3 ? 'Funded' : (realtimeAccount?.currentPhase?.phaseNumber ?? 1) === 2 ? 'Phase 2' : 'Phase 1'}
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
      {(realtimeAccount?.currentPhase?.phaseNumber ?? 1) >= 3 && payoutEligibility && (
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="trades">Trades</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Account Details</TabsTrigger>
        </TabsList>

        <TabsContent value="trades">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Trades</span>
                <div className="flex items-center gap-2">
                  {isLoadingCompleteData && (
                    <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Badge variant="secondary">
                    {accountData?.recentTrades?.length || 0} Total
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
              <CardContent>
                {isLoadingCompleteData ? (
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading trade data...</p>
                  </div>
                ) : dataFetchError ? (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-4" />
                    <p className="text-red-600 mb-2">{dataFetchError}</p>
                    <Button variant="outline" onClick={fetchCompleteData}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                ) : (
                <div className="space-y-4">
                  {(!accountData?.recentTrades || accountData.recentTrades.length === 0) ? (
                    <div className="text-center py-8">
                      <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No trades found</p>
                    </div>
                  ) : (
                    <>
                      {/* Phase Breakdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        {accountData?.phases?.map((phase: any) => {
                          const phaseTradeCount = accountData.recentTrades.filter((t: any) => 
                            t.phase?.id === phase.id || t.phaseAccountId === phase.id
                          ).length
                          const phasePnL = (accountData.recentTrades
                            .filter((t: any) => t.phase?.id === phase.id || t.phaseAccountId === phase.id)
                            .reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)) || 0
                        
                        return (
                          <Card key={phase.id} className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge 
                                variant={phase.status === 'active' ? 'default' : phase.status === 'passed' ? 'secondary' : 'destructive'}
                                className={cn(
                                  phase.phaseNumber === 1 ? 'bg-blue-600 hover:bg-blue-700' : 
                                  phase.phaseNumber === 2 ? 'bg-red-600 hover:bg-red-700' : 
                                  phase.phaseNumber >= 3 ? 'bg-green-600 hover:bg-green-700' : ''
                                )}
                              >
                                {phase.phaseNumber === 1 ? 'PHASE 1' : phase.phaseNumber === 2 ? 'PHASE 2' : phase.phaseNumber >= 3 ? 'FUNDED' : `PHASE ${phase.phaseNumber}`}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {phase.status}
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
                            {accountData.recentTrades.slice(0, 20).map((trade: any, index: number) => (
                              <tr key={trade.id || index} className={cn("border-b", index % 2 === 0 ? "bg-background" : "bg-muted/25")}>
                                <td className="p-3 font-medium">{trade.instrument || trade.symbol || 'N/A'}</td>
                                <td className="p-3">
                                  <Badge variant={(trade.side?.toUpperCase() || 'N/A') === 'BUY' ? 'default' : 'secondary'}>
                                    {trade.side?.toUpperCase() || 'N/A'}
                                  </Badge>
                                </td>
                                <td className="p-3">{formatQuantity(trade.quantity)}</td>
                                <td className="p-3 text-sm">{trade.entryPrice || 'N/A'}</td>
                                <td className="p-3 text-sm">{trade.exitPrice || trade.closePrice || 'N/A'}</td>
                                <td className={cn("p-3 font-medium", (trade.pnl || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                                  {formatCurrency(trade.pnl || 0)}
                                </td>
                                <td className="p-3">
                                  <Badge variant="outline" className="text-xs">
                                    {trade.phase ? (
                                     trade.phase.phaseNumber >= 3 ? 'Funded' :
                                     trade.phase.phaseNumber === 2 ? 'Phase 2' :
                                     'Phase 1'
                                   ) : 'Phase 1'}
                                  </Badge>
                                </td>
                                <td className="p-3 text-sm text-muted-foreground">
                                  {trade.exitTime ? new Date(trade.exitTime).toLocaleDateString() : 
                                   trade.entryTime ? new Date(trade.entryTime).toLocaleDateString() :
                                   trade.entryDate ? new Date(trade.entryDate).toLocaleDateString() : 
                                   trade.closeDate ? new Date(trade.closeDate).toLocaleDateString() : 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {accountData.recentTrades.length > 20 && (
                      <div className="text-center py-4">
                        <Button variant="outline" size="sm">
                          View All Trades ({accountData.recentTrades.length})
                        </Button>
                      </div>
                    )}
                  </>
                )}
                </div>
              )}
              </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="space-y-6">
            {isLoadingCompleteData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading statistics...</p>
                  </div>
                </CardContent>
              </Card>
            ) : dataFetchError ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-4" />
                    <p className="text-red-600 mb-2">{dataFetchError}</p>
                    <Button variant="outline" onClick={fetchCompleteData}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
            <>
            {/* Overall Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-2xl font-bold">{accountData?.recentTrades?.length || 0}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {(() => {
                        const trades = accountData?.recentTrades || []
                        const winningTrades = trades.filter((t: any) => (t.pnl || 0) > 0).length
                        const losingTrades = trades.filter((t: any) => (t.pnl || 0) < 0).length
                        const tradableTradesCount = winningTrades + losingTrades
                        return tradableTradesCount > 0 ? Math.round((winningTrades / tradableTradesCount) * 100) : 0
                      })()}%
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total P&L</p>
                    <p className={cn("text-2xl font-bold",
                      ((accountData?.recentTrades?.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) ?? 0) >= 0)
                        ? "text-green-600" : "text-red-600"
                    )}>
                      {formatCurrency(accountData?.recentTrades?.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) ?? 0)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Avg Trade</p>
                    <p className={cn("text-2xl font-bold",
                      ((accountData?.recentTrades?.length ?? 0) > 0
                        ? ((accountData.recentTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) ?? 0) / accountData.recentTrades.length)
                        : 0) >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {(accountData?.recentTrades?.length ?? 0) > 0
                        ? formatCurrency((accountData.recentTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) ?? 0) / accountData.recentTrades.length)
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
                  {accountData?.phases?.map((phase: any) => {
                    const phaseTrades = accountData?.recentTrades?.filter((t: any) => 
                      t.phase?.id === phase.id || t.phaseAccountId === phase.id
                    ) || []
                    const phasePnL = phaseTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) || 0
                    // Calculate win rate excluding break-even trades (industry standard)
                    const winningTrades = phaseTrades.filter((t: any) => (t.pnl || 0) > 0).length
                    const losingTrades = phaseTrades.filter((t: any) => (t.pnl || 0) < 0).length
                    const tradableTradesCount = winningTrades + losingTrades
                    const phaseWinRate = tradableTradesCount > 0
                      ? Math.round((winningTrades / tradableTradesCount) * 100)
                      : 0
                    
                    return (
                      <Card key={phase.id} className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <Badge 
                              variant={phase.status === 'active' ? 'default' : phase.status === 'passed' ? 'secondary' : 'destructive'}
                              className={cn(
                                phase.phaseNumber === 1 ? 'bg-blue-600 hover:bg-blue-700 w-fit' : 
                                phase.phaseNumber === 2 ? 'bg-red-600 hover:bg-red-700 w-fit' : 
                                phase.phaseNumber >= 3 ? 'bg-green-600 hover:bg-green-700 w-fit' : 'w-fit'
                              )}
                            >
                              {phase.phaseNumber === 1 ? 'PHASE 1' : phase.phaseNumber === 2 ? 'PHASE 2' : phase.phaseNumber >= 3 ? 'FUNDED' : `PHASE ${phase.phaseNumber}`}
                            </Badge>
                            <span className="text-xs sm:text-sm text-muted-foreground">
                              {phase.status} • Started {new Date(phase.startDate).toLocaleDateString()}
                            </span>
                          </div>
                          {phase.profitTarget && (
                            <div className="text-left sm:text-right">
                              <p className="text-xs sm:text-sm text-muted-foreground">Target</p>
                              <p className="font-medium">{formatCurrency(phase.profitTarget)}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
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
                  const instrumentStats = (accountData?.recentTrades || []).reduce((acc: any, trade: any) => {
                    const symbol = trade.instrument || trade.symbol || 'Unknown'
                    if (!acc[symbol]) {
                      acc[symbol] = { trades: 0, pnl: 0, wins: 0, losses: 0 }
                    }
                    acc[symbol].trades++
                    const tradePnl = trade.pnl || 0
                    acc[symbol].pnl += tradePnl
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
                          <div key={symbol} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="font-medium truncate">{symbol}</div>
                              <Badge variant="outline" className="shrink-0">{stats.trades} trades</Badge>
                            </div>
                            <div className="flex items-center gap-4 sm:gap-6 text-sm">
                              <div className="text-left sm:text-center">
                                <p className="text-xs text-muted-foreground">Win Rate</p>
                                <p className="font-medium text-green-600">
                                  {(() => {
                                    const tradableTradesCount = stats.wins + stats.losses
                                    return tradableTradesCount > 0 ? Math.round((stats.wins / tradableTradesCount) * 100) : 0
                                  })()}%
                                </p>
                              </div>
                              <div className="text-left sm:text-center">
                                <p className="text-xs text-muted-foreground">Total P&L</p>
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
          </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="payouts">
          <div className="space-y-6">
            {isLoadingCompleteData ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Loading payout data...</p>
                  </div>
                </CardContent>
              </Card>
            ) : dataFetchError ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-4" />
                    <p className="text-red-600 mb-2">{dataFetchError}</p>
                    <Button variant="outline" onClick={fetchCompleteData}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
            <>
            {/* Payout Eligibility */}
            {(realtimeAccount?.currentPhase?.phaseNumber ?? 1) >= 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payout Eligibility
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {accountData?.payoutEligibility ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Status:</span>
                        <Badge variant={accountData.payoutEligibility.isEligible ? "default" : "secondary"}>
                          {accountData.payoutEligibility.isEligible ? "Eligible" : "Not Eligible"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Calculating payout eligibility...</p>
                    </div>
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
                    {accountData?.payouts?.length || 0} Total
                  </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {(!accountData?.payouts || accountData.payouts.length === 0) ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payout history</p>
                    {(realtimeAccount?.currentPhase?.phaseNumber ?? 1) < 3 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Payouts are only available for funded accounts
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accountData.payouts.map((payout: any) => (
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
          </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <HistoryTab
            accountName={account?.name || account?.number || 'Unknown'}
            propFirmName={realtimeAccount?.propFirmName || 'Prop Firm'}
            accountSize={realtimeAccount?.accountSize || account?.startingBalance || 0}
            breaches={accountData?.phases?.flatMap((phase: any) => phase.breaches || []) || []}
            phases={
              realtimeAccount?.phases?.map((phase: any) => {
                // Use complete trade data filtered by phase
                const phaseTrades = accountData?.recentTrades?.filter((t: any) => 
                  t.phase?.id === phase.id || t.phaseAccountId === phase.id
                ) || []
                
                const totalPnL = phaseTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0)
                const winningTrades = phaseTrades.filter((t: any) => (t.pnl || 0) > 0).length
                const losingTrades = phaseTrades.filter((t: any) => (t.pnl || 0) < 0).length
                const tradableCount = winningTrades + losingTrades
                const winRate = tradableCount > 0 ? (winningTrades / tradableCount) * 100 : 0
                
                // Fix profit target calculation
                const profitTargetAmount = ((phase.profitTargetPercent || 0) / 100) * (realtimeAccount?.accountSize || 0)
                const profitProgress = profitTargetAmount > 0 ? Math.min((totalPnL / profitTargetAmount) * 100, 100) : 0

                // Find best and worst trades
                let bestTrade = undefined
                let worstTrade = undefined
                
                if (phaseTrades.length > 0) {
                  const sortedByPnl = [...phaseTrades].sort((a, b) => 
                    (b.pnl || 0) - (a.pnl || 0)
                  )
                  const best = sortedByPnl[0]
                  const worst = sortedByPnl[sortedByPnl.length - 1]
                  
                  if (best && (best.pnl || 0) > 0) {
                    bestTrade = {
                      symbol: best.instrument || best.symbol || 'N/A',
                      pnl: best.pnl || 0,
                      date: best.exitTime || best.closeDate || best.entryTime || best.entryDate
                    }
                  }
                  
                  if (worst && (worst.pnl || 0) < 0) {
                    worstTrade = {
                      symbol: worst.instrument || worst.symbol || 'N/A',
                      pnl: worst.pnl || 0,
                      date: worst.exitTime || worst.closeDate || worst.entryTime || worst.entryDate
                    }
                  }
                }

                return {
                  id: phase.id,
                  phaseNumber: phase.phaseNumber,
                  phaseId: phase.phaseId,
                  status: phase.status,
                  startDate: phase.startDate,
                  endDate: phase.endDate,
                  totalTrades: phaseTrades.length,
                  totalPnL,
                  winRate,
                  profitTargetPercent: phase.profitTargetPercent,
                  profitProgress,
                  bestTrade,
                  worstTrade
                }
              }) || []
            }
          />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Account Number</label>
                      <p className="font-medium">{account.number}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Account Name</label>
                      {isEditingSettings ? (
                        <div className="flex gap-2 mt-1">
                          <Input 
                            value={editedAccountName} 
                            onChange={(e) => setEditedAccountName(e.target.value)}
                            className="max-w-xs"
                          />
                          <Button onClick={handleSaveSettings} size="sm">Save</Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setIsEditingSettings(false)
                              setEditedAccountName(account.name || '')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.name || 'N/A'}</p>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setIsEditingSettings(true)}
                          >
                            Edit
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Prop Firm</label>
                      <p className="font-medium">{realtimeAccount?.propFirmName || 'Prop Firm'}</p>
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
                        {account.status?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-muted-foreground">Current Phase</label>
                      <p className="font-medium">{currentPhase?.phaseNumber === 1 ? 'PHASE 1' : currentPhase?.phaseNumber === 2 ? 'PHASE 2' : currentPhase?.phaseNumber >= 3 ? 'FUNDED' : `PHASE ${currentPhase?.phaseNumber || 1}`}</p>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground">Phase Status</label>
                      <Badge variant={
                        currentPhase?.status === 'active' ? 'default' :
                        currentPhase?.status === 'passed' ? 'secondary' : 'destructive'
                      }>
                        {(currentPhase?.status || 'active').toUpperCase()}
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                      <p className="font-medium">{account.drawdownModeMax?.toUpperCase() || 'STATIC'}</p>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-muted-foreground">Profit Split</label>
                        <p className="font-medium">{formatPercent(account.profitSplitPercent)} (You) / {formatPercent(100 - account.profitSplitPercent)} (Firm)</p>
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

          </div>
        </TabsContent>
      </Tabs>

    </div>
    </PropFirmErrorBoundary>
  )
}
