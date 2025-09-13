'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useI18n } from "@/locales/client"
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Eye,
  Plus,
  Wallet,
  RefreshCw,
  MoreHorizontal,
  ArrowUpDown
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountSummary, PhaseType, AccountStatus } from "@/types/prop-firm"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface PropFirmAccountTableProps {
  accounts: AccountSummary[]
  onView?: (accountId: string) => void
  onAddTrade?: (accountId: string) => void
  onRequestPayout?: (accountId: string) => void
  onReset?: (accountId: string) => void
}

type SortField = 'number' | 'status' | 'phase' | 'balance' | 'equity' | 'profitTarget' | 'dailyDD' | 'maxDD'
type SortDirection = 'asc' | 'desc'

export function PropFirmAccountTable({
  accounts,
  onView,
  onAddTrade,
  onRequestPayout,
  onReset
}: PropFirmAccountTableProps) {
  const t = useI18n()
  const [sortField, setSortField] = useState<SortField>('number')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedAccounts = [...accounts].sort((a, b) => {
    let aValue: any = a[sortField as keyof AccountSummary]
    let bValue: any = b[sortField as keyof AccountSummary]

    // Handle special cases
    if (sortField === 'dailyDD') {
      aValue = a.dailyDrawdownRemaining
      bValue = b.dailyDrawdownRemaining
    } else if (sortField === 'maxDD') {
      aValue = a.maxDrawdownRemaining
      bValue = b.maxDrawdownRemaining
    } else if (sortField === 'profitTarget') {
      aValue = a.profitTargetProgress || 0
      bValue = b.profitTargetProgress || 0
    }

    if (typeof aValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    if (typeof aValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }

    return 0
  })

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

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 p-0 font-medium"
        onClick={() => handleSort(field)}
      >
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  )

  const getRiskLevel = (remaining: number, isDaily: boolean = false) => {
    const threshold = isDaily ? 500 : 1000
    if (remaining < threshold) return 'high'
    if (remaining < threshold * 2) return 'medium'
    return 'low'
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="number">
              {t('propFirm.table.account')}
            </SortableHeader>
            <SortableHeader field="status">
              {t('propFirm.table.status')}
            </SortableHeader>
            <SortableHeader field="phase">
              {t('propFirm.table.phase')}
            </SortableHeader>
            <SortableHeader field="balance">
              {t('propFirm.table.balance')}
            </SortableHeader>
            <SortableHeader field="equity">
              {t('propFirm.table.equity')}
            </SortableHeader>
            <SortableHeader field="profitTarget">
              {t('propFirm.table.progress')}
            </SortableHeader>
            <SortableHeader field="dailyDD">
              {t('propFirm.table.dailyDD')}
            </SortableHeader>
            <SortableHeader field="maxDD">
              {t('propFirm.table.maxDD')}
            </SortableHeader>
            <TableHead className="w-[100px]">
              {t('common.actions') as any}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAccounts.map((account) => {
            const pnl = account.equity - account.balance
            const isProfitable = pnl > 0
            // Only calculate risk levels if there are trades
            const dailyRiskLevel = getRiskLevel(account.dailyDrawdownRemaining, true)
            const maxRiskLevel = getRiskLevel(account.maxDrawdownRemaining, false)
            const isAtRisk = (dailyRiskLevel === 'high' || maxRiskLevel === 'high')

            // Available actions based on account status
            const canAddTrade = account.status === 'active' || account.status === 'funded'
            const canRequestPayout = account.status === 'funded' && account.nextPayoutDate !== undefined
            const canReset = account.status === 'failed'

            return (
              <TableRow 
                key={account.id} 
                className={cn(
                  "hover:bg-muted/50 cursor-pointer",
                  isAtRisk && "bg-amber-50/50 dark:bg-amber-900/10"
                )}
                onClick={() => onView?.(account.id)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {account.name || account.number}
                    </span>
                    {account.name && (
                      <span className="text-xs text-muted-foreground">
                        #{account.number}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant={getStatusVariant(account.status)}>
                    {account.status}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge variant="outline" className={getPhaseColor(account.currentPhase)}>
                    {account.currentPhase}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {formatCurrency(account.balance)}
                    </span>
                    {pnl !== 0 && (
                      <span className={cn(
                        "text-xs",
                        isProfitable ? "text-green-600" : "text-red-600"
                      )}>
                        {isProfitable ? '+' : ''}{formatCurrency(pnl)}
                      </span>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">
                      {formatCurrency(account.equity)}
                    </span>
                    {isProfitable ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : pnl < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                </TableCell>

                <TableCell>
                  {account.profitTargetProgress !== undefined && account.profitTargetProgress > 0 ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {account.profitTargetProgress.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(account.profitTargetProgress, 100)} 
                        className="h-2 w-20"
                      />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "font-medium",
                      dailyRiskLevel === 'high' ? "text-red-600" :
                      dailyRiskLevel === 'medium' ? "text-amber-600" : "text-green-600"
                    )}>
                      {formatCurrency(account.dailyDrawdownRemaining)}
                    </span>
                    {dailyRiskLevel === 'high' && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      "font-medium",
                      maxRiskLevel === 'high' ? "text-red-600" :
                      maxRiskLevel === 'medium' ? "text-amber-600" : "text-green-600"
                    )}>
                      {formatCurrency(account.maxDrawdownRemaining)}
                    </span>
                    {maxRiskLevel === 'high' && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        onView?.(account.id)
                      }}>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('common.view') as any}
                      </DropdownMenuItem>
                      {canAddTrade && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onAddTrade?.(account.id)
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t('propFirm.trade.add')}
                        </DropdownMenuItem>
                      )}
                      {canRequestPayout && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          onRequestPayout?.(account.id)
                        }}>
                          <Wallet className="h-4 w-4 mr-2" />
                          {t('propFirm.payout.request')}
                        </DropdownMenuItem>
                      )}
                      {canReset && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation()
                              onReset?.(account.id)
                            }} 
                            className="text-red-600"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('propFirm.account.reset')}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {accounts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t('propFirm.table.noAccounts')}
        </div>
      )}
    </div>
  )
}

