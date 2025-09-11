'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
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
  Plus,
  Settings,
  RefreshCw,
  Activity,
  BarChart3,
  Calendar,
  CreditCard
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountDashboardData, AccountSummary, PhaseType, AccountStatus, PropFirmTrade } from "@/types/prop-firm"

interface AccountDetailPageProps {
  params: {
    id: string
  }
}

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useI18n()
  const { user } = useAuth()
  const [accountData, setAccountData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const accountId = params.id as string

  // Fetch account details
  const fetchAccountData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/prop-firm/accounts/${accountId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch account details')
      }

      const data = await response.json()
      if (data.success) {
        setAccountData(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch account details')
      }
    } catch (error) {
      console.error('Error fetching account details:', error)
      toast({
        title: t('propFirm.toast.setupError'),
        description: t('propFirm.toast.setupErrorDescription'),
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load account data on mount
  useEffect(() => {
    if (user && accountId) {
      fetchAccountData()
    }
  }, [user, accountId])

  const getStatusColor = (status: AccountStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-500'
      case 'funded': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'passed': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getPhaseColor = (phase: PhaseType) => {
    switch (phase) {
      case 'phase_1': return 'bg-yellow-500'
      case 'phase_2': return 'bg-orange-500'
      case 'funded': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!accountData) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account Not Found</h3>
            <p className="text-muted-foreground">The requested account could not be found.</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { account, currentPhase, drawdown, progress, payoutEligibility } = accountData

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/prop-firm')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {account.name || account.number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn("text-white", getStatusColor(account.status))}>
                {t(`propFirm.status.${account.status}` as any, { count: 1 })}
              </Badge>
              <Badge className={cn("text-white", getPhaseColor(currentPhase.phaseType))}>
                {t(`propFirm.phase.${currentPhase.phaseType}` as any, { count: 1 })}
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">{account.propfirm}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccountData}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/new`)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('propFirm.trade.add')}
          </Button>
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
              {t('propFirm.metrics.balance')}
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
              {t('propFirm.metrics.equity')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.currentEquity)}</div>
            {account.openPnl && account.openPnl !== 0 && (
              <p className={cn("text-xs", account.openPnl > 0 ? "text-green-600" : "text-red-600")}>
                {t('propFirm.metrics.unrealizedPnl')}: {formatCurrency(account.openPnl)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propFirm.metrics.dailyDrawdown')}
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
              {t('propFirm.metrics.maxDrawdown')}
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
              {t('propFirm.metrics.profitTarget')} - {t(`propFirm.phase.${currentPhase.phaseType}` as any, { count: 1 })}
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
                  Ready to advance to {progress.nextPhaseType && t(`propFirm.phase.${progress.nextPhaseType}` as any, { count: 1 })}
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
                  {t('propFirm.payout.request')}
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
              <CardTitle>All Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Trade management interface would go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <CardTitle>Performance Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Detailed statistics would go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Payout management interface would go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Account configuration interface would go here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
