'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/locales/client"
import { 
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
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PropFirmAccount, AccountSummary, PhaseType, AccountStatus } from "@/types/prop-firm"
import { PropFirmAccountCard } from "./account-card"
import { PropFirmAccountTable } from "./account-table"
import { CreateAccountDialog } from "./create-account-dialog"

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

  // Calculate dashboard metrics
  const metrics = {
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter(a => a.status === 'active').length,
    fundedAccounts: accounts.filter(a => a.status === 'funded').length,
    failedAccounts: accounts.filter(a => a.status === 'failed').length,
    totalEquity: accounts.reduce((sum, a) => sum + a.equity, 0),
    totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
    accountsAtRisk: accounts.filter(a => 
      a.dailyDrawdownRemaining < 500 || a.maxDrawdownRemaining < 1000
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('propFirm.dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('propFirm.dashboard.subtitle')}
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
            {t('common.refresh')}
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('propFirm.account.create')}
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propFirm.metrics.totalAccounts')}
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalAccounts}</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                {metrics.fundedAccounts} {t('propFirm.status.funded')}
              </span>
              <span className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                {metrics.activeAccounts} {t('propFirm.status.active')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propFirm.metrics.totalEquity')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.totalEquity.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('propFirm.metrics.acrossAllAccounts')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propFirm.metrics.fundedAccounts')}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.fundedAccounts}</div>
            <div className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-green-500">
                {metrics.totalAccounts > 0 
                  ? ((metrics.fundedAccounts / metrics.totalAccounts) * 100).toFixed(1)
                  : 0}% {t('propFirm.metrics.successRate')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('propFirm.metrics.accountsAtRisk')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.accountsAtRisk}</div>
            {metrics.accountsAtRisk > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-amber-500">
                  {t('propFirm.metrics.needsAttention')}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk Alerts */}
      {metrics.accountsAtRisk > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('propFirm.alerts.accountsAtRisk', { count: metrics.accountsAtRisk })}
          </AlertDescription>
        </Alert>
      )}

      {/* Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('propFirm.accounts.title')}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              {t('common.view.cards')}
            </Button>
            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              {t('common.view.table')}
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
              <Button onClick={() => setCreateDialogOpen(true)}>
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
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accounts.map((account) => (
                    <PropFirmAccountCard
                      key={account.id}
                      account={account}
                      onView={() => onViewAccount?.(account.id)}
                      onAddTrade={() => onAddTrade?.(account.id)}
                      onRequestPayout={() => onRequestPayout?.(account.id)}
                      onReset={() => onResetAccount?.(account.id)}
                    />
                  ))}
                </div>
              ) : (
                <PropFirmAccountTable
                  accounts={accounts}
                  onView={onViewAccount}
                  onAddTrade={onAddTrade}
                  onRequestPayout={onRequestPayout}
                  onReset={onResetAccount}
                />
              )}
            </TabsContent>

            <TabsContent value="active">
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accountsByStatus.active.map((account) => (
                    <PropFirmAccountCard
                      key={account.id}
                      account={account}
                      onView={() => onViewAccount?.(account.id)}
                      onAddTrade={() => onAddTrade?.(account.id)}
                      onRequestPayout={() => onRequestPayout?.(account.id)}
                      onReset={() => onResetAccount?.(account.id)}
                    />
                  ))}
                </div>
              ) : (
                <PropFirmAccountTable
                  accounts={accountsByStatus.active}
                  onView={onViewAccount}
                  onAddTrade={onAddTrade}
                  onRequestPayout={onRequestPayout}
                  onReset={onResetAccount}
                />
              )}
            </TabsContent>

            <TabsContent value="funded">
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accountsByStatus.funded.map((account) => (
                    <PropFirmAccountCard
                      key={account.id}
                      account={account}
                      onView={() => onViewAccount?.(account.id)}
                      onAddTrade={() => onAddTrade?.(account.id)}
                      onRequestPayout={() => onRequestPayout?.(account.id)}
                      onReset={() => onResetAccount?.(account.id)}
                    />
                  ))}
                </div>
              ) : (
                <PropFirmAccountTable
                  accounts={accountsByStatus.funded}
                  onView={onViewAccount}
                  onAddTrade={onAddTrade}
                  onRequestPayout={onRequestPayout}
                  onReset={onResetAccount}
                />
              )}
            </TabsContent>

            {accountsByStatus.failed.length > 0 && (
              <TabsContent value="failed">
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {accountsByStatus.failed.map((account) => (
                      <PropFirmAccountCard
                        key={account.id}
                        account={account}
                        onView={() => onViewAccount?.(account.id)}
                        onAddTrade={() => onAddTrade?.(account.id)}
                        onRequestPayout={() => onRequestPayout?.(account.id)}
                        onReset={() => onResetAccount?.(account.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <PropFirmAccountTable
                    accounts={accountsByStatus.failed}
                    onView={onViewAccount}
                    onAddTrade={onAddTrade}
                    onRequestPayout={onRequestPayout}
                    onReset={onResetAccount}
                  />
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {/* Create Account Dialog */}
      <CreateAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false)
          onRefresh?.()
        }}
      />
    </div>
  )
}

