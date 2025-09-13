'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
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
  Eye,
  RefreshCw,
  Wallet,
  Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountSummary, PhaseType, AccountStatus } from "@/types/prop-firm"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

interface PropFirmAccountCardProps {
  account: AccountSummary
  onView?: () => void
  onAddTrade?: () => void
  onRequestPayout?: () => void
  onReset?: () => void
}

export function PropFirmAccountCard({
  account,
  onView,
  onAddTrade,
  onRequestPayout,
  onReset
}: PropFirmAccountCardProps) {
  const t = useI18n()

  const getStatusColor = (status: AccountStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-500 hover:bg-blue-600'
      case 'funded': return 'bg-green-500 hover:bg-green-600'
      case 'failed': return 'bg-red-500 hover:bg-red-600'
      case 'passed': return 'bg-purple-500 hover:bg-purple-600'
      default: return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const getStatusVariant = (status: AccountStatus) => {
    switch (status) {
      case 'active': return 'default'
      case 'funded': return 'secondary'
      case 'failed': return 'destructive'
      case 'passed': return 'outline'
      default: return 'outline'
    }
  }

  const getPhaseColor = (phase: PhaseType) => {
    switch (phase) {
      case 'phase_1': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
      case 'phase_2': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20'
      case 'funded': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculatePnL = () => {
    return account.equity - account.balance
  }

  const pnl = calculatePnL()
  const isProfitable = pnl > 0

  // Calculate risk levels
  // Only calculate risk levels if there are trades
  const dailyRiskLevel = account.dailyDrawdownRemaining < 500 ? 'high' : 
                        account.dailyDrawdownRemaining < 1000 ? 'medium' : 'low'
  const maxRiskLevel = account.maxDrawdownRemaining < 1000 ? 'high' : 
                      account.maxDrawdownRemaining < 2000 ? 'medium' : 'low'

  const isAtRisk = (dailyRiskLevel === 'high' || maxRiskLevel === 'high')

  // Available actions based on account status
  const canAddTrade = account.status === 'active' || account.status === 'funded'
  const canRequestPayout = account.status === 'funded' && account.nextPayoutDate !== undefined
  const canReset = account.status === 'failed'

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-200 hover:shadow-md",
      isAtRisk && "ring-2 ring-amber-500/50"
    )}>
      {/* Risk indicator stripe */}
      {isAtRisk && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-red-500" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg font-semibold">
              {account.name || account.number}
            </CardTitle>
            {account.name && (
              <span className="text-sm text-muted-foreground">
                #{account.number}
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" />
                {t('common.view') as any}
              </DropdownMenuItem>
              {canAddTrade && (
                <DropdownMenuItem onClick={onAddTrade}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('propFirm.trade.add')}
                </DropdownMenuItem>
              )}
              {canRequestPayout && (
                <DropdownMenuItem onClick={onRequestPayout}>
                  <Wallet className="h-4 w-4 mr-2" />
                  {t('propFirm.payout.request')}
                </DropdownMenuItem>
              )}
              {canReset && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onReset} className="text-red-600">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('propFirm.account.reset')}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(account.status)}>
            {account.status}
          </Badge>
          <Badge variant="outline" className={getPhaseColor(account.currentPhase)}>
            {account.currentPhase}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance and Equity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{t('propFirm.metrics.balance')}</p>
            <p className="text-lg font-semibold">{formatCurrency(account.balance)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t('propFirm.metrics.equity')}</p>
            <p className="text-lg font-semibold flex items-center gap-1">
              {formatCurrency(account.equity)}
              {isProfitable ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : pnl < 0 ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
            </p>
          </div>
        </div>

        {/* PnL */}
        {pnl !== 0 && (
          <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
            <span className="text-sm text-muted-foreground">
              {t('propFirm.metrics.unrealizedPnl')}
            </span>
            <span className={cn(
              "font-medium",
              isProfitable ? "text-green-600" : "text-red-600"
            )}>
              {isProfitable ? '+' : ''}{formatCurrency(pnl)}
            </span>
          </div>
        )}

        {/* Profit Target Progress (for evaluation phases) */}
        {account.profitTargetProgress !== undefined && account.profitTargetProgress > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('propFirm.metrics.profitTarget')}
              </span>
              <span className="text-sm font-medium">
                {account.profitTargetProgress.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(account.profitTargetProgress, 100)} 
              className="h-2"
            />
          </div>
        )}

        {/* Drawdown Levels */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('propFirm.metrics.dailyDrawdown')}
            </span>
            <span className={cn(
              "text-sm font-medium",
              dailyRiskLevel === 'high' ? "text-red-600" :
              dailyRiskLevel === 'medium' ? "text-amber-600" : "text-green-600"
            )}>
              {formatCurrency(account.dailyDrawdownRemaining)}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('propFirm.metrics.maxDrawdown')}
            </span>
            <span className={cn(
              "text-sm font-medium",
              maxRiskLevel === 'high' ? "text-red-600" :
              maxRiskLevel === 'medium' ? "text-amber-600" : "text-green-600"
            )}>
              {formatCurrency(account.maxDrawdownRemaining)}
            </span>
          </div>
        </div>

        {/* Risk Warning */}
        {isAtRisk && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              {t('propFirm.warnings.approachingLimits')}
            </span>
          </div>
        )}

        {/* Next Payout Date (for funded accounts) */}
        {account.nextPayoutDate && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <Clock className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-400">
              {t('propFirm.payout.nextEligible')}: {account.nextPayoutDate.toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Account Stats Placeholder (extend AccountSummary if needed) */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {t('propFirm.metrics.trades')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onView} className="flex-1">
            <Eye className="h-4 w-4 mr-2" />
            {t('common.view') as any}
          </Button>
          {canAddTrade && (
            <Button size="sm" onClick={onAddTrade} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              {t('propFirm.trade.add')}
            </Button>
          )}
          {canRequestPayout && (
            <Button size="sm" onClick={onRequestPayout} className="flex-1 bg-green-600 hover:bg-green-700">
              <Wallet className="h-4 w-4 mr-2" />
              {t('propFirm.payout.request')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

