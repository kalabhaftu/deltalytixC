'use client'

import { useState } from 'react'
import { useI18n } from "@/locales/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  BarChart3,
  Users,
  Target,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountStatus, PhaseType, AccountSummary as BaseAccountSummary } from "@/types/prop-firm"

interface AccountSummary extends BaseAccountSummary {
  propfirm: string
  currentEquity: number
  currentBalance: number
  totalTrades: number
  totalPayouts: number
  hasRecentBreach: boolean
  createdAt: string
  updatedAt: string
}

interface PropFirmDashboardProps {
  accounts: AccountSummary[]
  isLoading?: boolean
  onRefresh?: () => void
  onCreateAccount?: () => void
  onViewAccount?: (accountId: string) => void
  onAddTrade?: (accountId: string) => void
  onRequestPayout?: (accountId: string) => void
  onResetAccount?: (accountId: string) => void
}

export function PropFirmDashboard({
  accounts,
  isLoading = false,
  onRefresh,
  onCreateAccount,
  onViewAccount,
  onAddTrade,
  onRequestPayout,
  onResetAccount
}: PropFirmDashboardProps) {
  const t = useI18n()
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Calculate dashboard metrics with safe defaults
  const metrics = {
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter(a => a.status === 'active').length,
    fundedAccounts: accounts.filter(a => a.status === 'funded').length,
    failedAccounts: accounts.filter(a => a.status === 'failed').length,
    totalEquity: accounts.reduce((sum, a) => sum + (isFinite(a.currentEquity) ? a.currentEquity : 0), 0),
    totalBalance: accounts.reduce((sum, a) => sum + (isFinite(a.currentBalance) ? a.currentBalance : 0), 0),
    accountsAtRisk: accounts.filter(a => 
      (isFinite(a.dailyDrawdownRemaining) && a.dailyDrawdownRemaining < 500) || 
      (isFinite(a.maxDrawdownRemaining) && a.maxDrawdownRemaining < 1000)
    ).length
  }

  // Group accounts by status
  const accountsByStatus = {
    active: accounts.filter(a => a.status === 'active'),
    funded: accounts.filter(a => a.status === 'funded'),
    failed: accounts.filter(a => a.status === 'failed'),
    passed: accounts.filter(a => a.status === 'passed')
  }

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
    if (!isFinite(amount) || isNaN(amount)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    if (!isFinite(value) || isNaN(value)) return '0%'
    return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propFirm.title')}</h1>
          <p className="text-muted-foreground">
            Manage your prop firm evaluation accounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={onCreateAccount}>
            <Plus className="h-4 w-4 mr-2" />
            {t('propFirm.account.create')}
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAccounts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{metrics.activeAccounts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funded</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.fundedAccounts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalEquity)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Accounts</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('propFirm.accounts.empty.title')}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {t('propFirm.accounts.empty.description')}
              </p>
              <Button onClick={onCreateAccount}>
                <Plus className="h-4 w-4 mr-2" />
                {t('propFirm.account.create')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">
                {t('propFirm.tabs.all')} ({accounts.length})
              </TabsTrigger>
              <TabsTrigger value="active">
                {t('propFirm.tabs.active')} ({accountsByStatus.active.length})
              </TabsTrigger>
              <TabsTrigger value="funded">
                {t('propFirm.tabs.funded')} ({accountsByStatus.funded.length})
              </TabsTrigger>
              {accountsByStatus.failed.length > 0 && (
                <TabsTrigger value="failed">
                  {t('propFirm.tabs.failed')} ({accountsByStatus.failed.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onView={() => onViewAccount?.(account.id)}
                    onAddTrade={() => onAddTrade?.(account.id)}
                    onRequestPayout={() => onRequestPayout?.(account.id)}
                    onReset={() => onResetAccount?.(account.id)}
                    formatCurrency={formatCurrency}
                    formatPercentage={formatPercentage}
                    getStatusColor={getStatusColor}
                    getPhaseColor={getPhaseColor}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="active">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accountsByStatus.active.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onView={() => onViewAccount?.(account.id)}
                    onAddTrade={() => onAddTrade?.(account.id)}
                    onRequestPayout={() => onRequestPayout?.(account.id)}
                    onReset={() => onResetAccount?.(account.id)}
                    formatCurrency={formatCurrency}
                    formatPercentage={formatPercentage}
                    getStatusColor={getStatusColor}
                    getPhaseColor={getPhaseColor}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="funded">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accountsByStatus.funded.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onView={() => onViewAccount?.(account.id)}
                    onAddTrade={() => onAddTrade?.(account.id)}
                    onRequestPayout={() => onRequestPayout?.(account.id)}
                    onReset={() => onResetAccount?.(account.id)}
                    formatCurrency={formatCurrency}
                    formatPercentage={formatPercentage}
                    getStatusColor={getStatusColor}
                    getPhaseColor={getPhaseColor}
                  />
                ))}
              </div>
            </TabsContent>

            {accountsByStatus.failed.length > 0 && (
              <TabsContent value="failed">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accountsByStatus.failed.map((account) => (
                    <AccountCard
                      key={account.id}
                      account={account}
                      onView={() => onViewAccount?.(account.id)}
                      onAddTrade={() => onAddTrade?.(account.id)}
                      onRequestPayout={() => onRequestPayout?.(account.id)}
                      onReset={() => onResetAccount?.(account.id)}
                      formatCurrency={formatCurrency}
                      formatPercentage={formatPercentage}
                      getStatusColor={getStatusColor}
                      getPhaseColor={getPhaseColor}
                    />
                  ))}
                </div>
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </div>
  )
}

interface AccountCardProps {
  account: AccountSummary
  onView: () => void
  onAddTrade: () => void
  onRequestPayout: () => void
  onReset: () => void
  formatCurrency: (amount: number) => string
  formatPercentage: (value: number) => string
  getStatusColor: (status: AccountStatus) => string
  getPhaseColor: (phase: PhaseType) => string
}

function AccountCard({
  account,
  onView,
  onAddTrade,
  onRequestPayout,
  onReset,
  formatCurrency,
  formatPercentage,
  getStatusColor,
  getPhaseColor
}: AccountCardProps) {
  const t = useI18n()

  // Only show risk warning if there are trades and the account is approaching drawdown limits
  const isAtRisk = account.totalTrades > 0 && (
    (isFinite(account.dailyDrawdownRemaining) && account.dailyDrawdownRemaining < 500) ||
    (isFinite(account.maxDrawdownRemaining) && account.maxDrawdownRemaining < 1000)
  )

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{account.name || account.number}</h3>
            <p className="text-sm text-muted-foreground">{account.propfirm}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(getStatusColor(account.status), 'text-white')}>
              {t(`propFirm.status.${account.status}`)}
            </Badge>
            <Badge variant="outline" className={cn(getPhaseColor(account.currentPhase), 'text-white')}>
              {t(`propFirm.phase.${account.currentPhase}`)}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Equity and Balance */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Equity</p>
            <p className="font-semibold">{formatCurrency(account.currentEquity)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="font-semibold">{formatCurrency(account.currentBalance)}</p>
          </div>
        </div>

        {/* Drawdown Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Daily DD Remaining</span>
            <span className={cn(
              "text-sm font-medium",
              isFinite(account.dailyDrawdownRemaining) && account.dailyDrawdownRemaining < 500 
                ? "text-red-600" 
                : "text-green-600"
            )}>
              {formatCurrency(account.dailyDrawdownRemaining)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Max DD Remaining</span>
            <span className={cn(
              "text-sm font-medium",
              isFinite(account.maxDrawdownRemaining) && account.maxDrawdownRemaining < 1000 
                ? "text-red-600" 
                : "text-green-600"
            )}>
              {formatCurrency(account.maxDrawdownRemaining)}
            </span>
          </div>
        </div>

        {/* Progress */}
        {account.currentPhase !== 'funded' && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Profit Target</span>
              <span className="text-sm font-medium">{formatPercentage(account.profitTargetProgress)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, account.profitTargetProgress))}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Trades:</span>
            <span className="ml-1 font-medium">{account.totalTrades}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Payouts:</span>
            <span className="ml-1 font-medium">{account.totalPayouts}</span>
          </div>
        </div>

        {/* Risk Warning */}
        {isAtRisk && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-600 font-medium">Approaching drawdown limit</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onView} className="flex-1">
            View
          </Button>
          {account.status === 'active' && (
            <Button size="sm" variant="outline" onClick={onAddTrade}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {account.status === 'funded' && (
            <Button size="sm" variant="outline" onClick={onRequestPayout}>
              <DollarSign className="h-4 w-4" />
            </Button>
          )}
          {account.status === 'failed' && (
            <Button size="sm" variant="outline" onClick={onReset}>
              <Target className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

