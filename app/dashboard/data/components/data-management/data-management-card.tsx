'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  TrashIcon, 
  AlertCircle, 
  Edit2, 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  Trash2,
  Upload,
  Download,
  Building2,
  User,
  BarChart3
} from "lucide-react"
import { 
  removeAccountsFromTradesAction, 
  renameAccountAction
} from "@/server/accounts"
import { useData } from '@/context/data-provider'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trade } from '@prisma/client'
import { AdvancedExportDialog } from './advanced-export-dialog'
import { ImportDialog } from './import-dialog'
import { DeleteAllDataDialog } from '@/components/data-management/delete-all-data-dialog'
import { useUserStore } from '@/store/user-store'
import { useAccounts } from '@/hooks/use-accounts'
import { Badge } from "@/components/ui/badge"
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

type AccountWithTrades = {
  id: string
  number: string
  name: string
  displayName: string
  accountType: 'live' | 'prop-firm'
  tradeCount: number
  trades: Trade[]
  currentPhaseDetails?: {
    phaseNumber: number
    status: string
    phaseId: string
    masterAccountId?: string
  } | null
}

type GroupedAccount = {
  accountName: string
  propFirm: string
  accountType: 'live' | 'prop-firm'
  totalTrades: number
  masterAccountId?: string
  phases: Array<{
    id: string
    number: string
    displayName: string
    status: string
    tradeCount: number
    phaseDetails: any
    phaseId?: string
    currentPhase?: number
    evaluationType?: string
  }>
}

function isFundedPhase(evaluationType: string | undefined, phaseNumber: number | undefined): boolean {
  if (!phaseNumber) return false
  switch (evaluationType) {
    case 'Two Step':
      return phaseNumber >= 3
    case 'One Step':
      return phaseNumber >= 2
    case 'Instant':
      return phaseNumber >= 1
    default:
      return phaseNumber >= 3
  }
}

function getPhaseDisplayLabel(evaluationType: string | undefined, phaseNumber: number | undefined): string {
  if (!phaseNumber) return 'Unknown'
  if (isFundedPhase(evaluationType, phaseNumber)) {
    return 'Funded'
  }
  return `Phase ${phaseNumber}`
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function DataManagementCard() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)
  const { accounts: allAccounts, isLoading: accountsLoading, refetch: refetchAccounts } = useAccounts()

  const { refreshTrades } = useData()
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [renameLoading, setRenameLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [renameAccountDialogOpen, setRenameAccountDialogOpen] = useState(false)
  const [accountToRename, setAccountToRename] = useState("")
  const [newAccountNumber, setNewAccountNumber] = useState("")
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteAllDataDialogOpen, setDeleteAllDataDialogOpen] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})

  // Group accounts by master account name - use tradeCount from server data
  const groupedAccounts = useMemo(() => {
    if (!allAccounts || accountsLoading) return []

    const grouped: Record<string, GroupedAccount> = {}

    allAccounts.forEach(account => {
      const accountName = account.name
      
      // Use tradeCount directly from account (comes from server)
      const tradeCount = (account as any).tradeCount || 0

      if (!grouped[accountName]) {
        grouped[accountName] = {
          accountName,
          propFirm: (account as any).propfirm || '',
          accountType: account.accountType,
          totalTrades: 0,
          masterAccountId: account.currentPhaseDetails?.masterAccountId,
          phases: []
        }
      }

      grouped[accountName].phases.push({
        id: account.id,
        number: account.number,
        displayName: account.displayName,
        status: account.status,
        tradeCount: tradeCount,
        phaseDetails: account.currentPhaseDetails,
        phaseId: account.currentPhaseDetails?.phaseId || account.number,
        currentPhase: account.currentPhase || account.currentPhaseDetails?.phaseNumber,
        evaluationType: (account.currentPhaseDetails as any)?.evaluationType
      })

      grouped[accountName].totalTrades += tradeCount
    })

    // Sort phases within each group by phase number
    Object.values(grouped).forEach(group => {
      group.phases.sort((a, b) => (a.currentPhase || 0) - (b.currentPhase || 0))
    })

    return Object.values(grouped)
  }, [allAccounts, accountsLoading])

  // Flat list for selection and deletion operations
  const accountsWithTrades = useMemo(() => {
    if (!allAccounts || accountsLoading) return []
    
    return allAccounts.map(account => ({
      id: account.id,
      number: account.number,
      name: account.name,
      displayName: account.displayName,
      accountType: account.accountType,
      tradeCount: (account as any).tradeCount || 0,
      trades: [],
      currentPhaseDetails: account.currentPhaseDetails
    }))
  }, [allAccounts, accountsLoading])

  // Stats
  const stats = useMemo(() => {
    const liveAccounts = groupedAccounts.filter(g => g.accountType === 'live')
    const propAccounts = groupedAccounts.filter(g => g.accountType === 'prop-firm')
    const totalTrades = groupedAccounts.reduce((sum, g) => sum + g.totalTrades, 0)
    
    return {
      totalAccounts: groupedAccounts.length,
      totalTrades,
      liveAccounts: liveAccounts.length,
      propAccounts: propAccounts.length,
      totalPhases: accountsWithTrades.length
    }
  }, [groupedAccounts, accountsWithTrades.length])

  const handleDeleteAccounts = useCallback(async () => {
    if (!user || selectedAccounts.length === 0) return
    try {
      setDeleteLoading(true)
      const accountsToDelete = selectedAccounts

      const uniqueAccountIds = new Set<string>()
      const accountsToDeleteData: Array<{id: string, endpoint: string, displayName: string}> = []

      for (const accountNumber of accountsToDelete) {
        const account = accountsWithTrades.find(acc => acc.number === accountNumber)
        if (account) {
          let endpoint: string
          let accountId: string
          
          if (account.accountType === 'prop-firm') {
            accountId = account.currentPhaseDetails?.masterAccountId || account.id
            endpoint = `/api/prop-firm/accounts/${accountId}`
          } else {
            accountId = account.id
            endpoint = `/api/accounts/${accountId}`
          }
          
          if (!uniqueAccountIds.has(accountId)) {
            uniqueAccountIds.add(accountId)
            accountsToDeleteData.push({ id: accountId, endpoint, displayName: account.displayName })
          }
        }
      }

      for (const accountData of accountsToDeleteData) {
        const response = await fetch(accountData.endpoint, { method: 'DELETE' })
        if (!response.ok) {
          throw new Error(`Failed to delete account ${accountData.displayName}`)
        }
      }

      const { invalidateAccountsCache } = await import('@/hooks/use-accounts')
      const { invalidateUserCaches } = await import('@/server/accounts')
      
      invalidateAccountsCache('account-deleted')
      if (user?.id) {
        await invalidateUserCaches(user.id)
      }
      
      router.refresh()
      
      await Promise.all([
        refetchAccounts(),
        refreshTrades()
      ])
      
      setSelectedAccounts([])
      toast.success('Deleted successfully', {
        description: `${accountsToDelete.length} account${accountsToDelete.length > 1 ? 's' : ''} and associated trades removed.`,
      })
    } catch (error) {
      setError(error instanceof Error ? error : new Error('Failed to delete accounts'))
      toast.error('Delete failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }, [user, accountsWithTrades, selectedAccounts, refetchAccounts, refreshTrades, router])

  const handleSelectAccount = useCallback((accountNumber: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountNumber)
        ? prev.filter(acc => acc !== accountNumber)
        : [...prev, accountNumber]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    const allAccountNumbers = accountsWithTrades.map(acc => acc.number)
    if (selectedAccounts.length === allAccountNumbers.length) {
      setSelectedAccounts([])
    } else {
      setSelectedAccounts(allAccountNumbers)
    }
  }, [selectedAccounts.length, accountsWithTrades])

  const toggleExpandAccount = useCallback((accountName: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountName]: !prev[accountName]
    }))
  }, [])

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'outline'
      case 'funded': return 'default'
      case 'failed': return 'destructive'
      case 'passed': return 'secondary'
      default: return 'outline'
    }
  }

  const handleRenameAccount = useCallback(async () => {
    if (!user || !accountToRename || !newAccountNumber) return
    try {
      setRenameLoading(true)
      await renameAccountAction(accountToRename, newAccountNumber)
      await Promise.all([refetchAccounts(), refreshTrades()])
      toast.success('Account renamed', {
        description: `${accountToRename} → ${newAccountNumber}`,
      })
      setRenameAccountDialogOpen(false)
      setAccountToRename("")
      setNewAccountNumber("")
    } catch (error) {
      toast.error('Rename failed', {
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setRenameLoading(false)
    }
  }, [user, accountToRename, newAccountNumber, refetchAccounts, refreshTrades])

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Data Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage your trading accounts and data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportDialog />
          <AdvancedExportDialog />
          {/* Only show delete button when accounts are selected */}
          {selectedAccounts.length > 0 && (
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete ({selectedAccounts.length})
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {selectedAccounts.length} Account{selectedAccounts.length > 1 ? 's' : ''}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the selected account{selectedAccounts.length > 1 ? 's' : ''} and all associated trades. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccounts} disabled={deleteLoading}>
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Delete All Data Option */}
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setDeleteAllDataDialogOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete All Data
      </Button>
      <DeleteAllDataDialog 
        open={deleteAllDataDialogOpen} 
        onOpenChange={setDeleteAllDataDialogOpen} 
      />

      {/* Loading State */}
      {accountsLoading && <LoadingSkeleton />}

      {/* Select All */}
      {!accountsLoading && accountsWithTrades.length > 0 && (
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Checkbox
              id="select-all"
              checked={selectedAccounts.length === accountsWithTrades.length && accountsWithTrades.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All
            </label>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {selectedAccounts.length > 0 && (
              <span>{selectedAccounts.length} selected</span>
            )}
            <span>{stats.totalTrades} total trades</span>
          </div>
        </div>
      )}

      {/* Account Groups */}
      {!accountsLoading && groupedAccounts.length > 0 && (
        <div className="space-y-3">
          {groupedAccounts.map((group) => {
            const isExpanded = expandedAccounts[group.accountName] ?? true
            const hasMultiplePhases = group.phases.length > 1
            const isPropFirm = group.accountType === 'prop-firm'

            return (
              <div 
                key={group.accountName} 
                className="border rounded-lg overflow-hidden bg-card"
              >
                {/* Group Header */}
                <div 
                  className={cn(
                    "p-4 transition-colors",
                    hasMultiplePhases && "cursor-pointer hover:bg-muted/50"
                  )}
                  onClick={() => hasMultiplePhases && toggleExpandAccount(group.accountName)}
                >
                  <div className="flex items-center gap-3">
                    {hasMultiplePhases && (
                      <div className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    )}
                    
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      isPropFirm ? "bg-primary/10" : "bg-long/10"
                    )}>
                      {isPropFirm ? (
                        <Building2 className="h-4 w-4 text-primary" />
                      ) : (
                        <User className="h-4 w-4 text-long" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold truncate">{group.accountName}</span>
                        {group.propFirm && (
                          <span className="text-xs text-muted-foreground">{group.propFirm}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {group.totalTrades} trades
                        </span>
                        {hasMultiplePhases && (
                          <span>{group.phases.length} phases</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phases */}
                {(isExpanded || !hasMultiplePhases) && (
                  <div className="border-t divide-y">
                    {group.phases.map((phase) => (
                      <div
                        key={phase.id}
                        className="flex items-center gap-4 p-4 pl-6 hover:bg-muted/30 transition-colors"
                      >
                        <Checkbox
                          checked={selectedAccounts.includes(phase.number)}
                          onCheckedChange={() => handleSelectAccount(phase.number)}
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm">{phase.number}</span>
                            {phase.currentPhase && (
                              <Badge variant="outline" className="text-xs">
                                {getPhaseDisplayLabel(phase.evaluationType, phase.currentPhase)}
                              </Badge>
                            )}
                            <Badge 
                              variant={getStatusVariant(phase.status)} 
                              className="text-xs capitalize"
                            >
                              {phase.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {phase.tradeCount} trade{phase.tradeCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAccountToRename(phase.number)
                            setNewAccountNumber(phase.number)
                            setRenameAccountDialogOpen(true)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {!accountsLoading && accountsWithTrades.length === 0 && (
        <div className="text-center py-16 border rounded-lg bg-muted/20">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No accounts yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first account from the Accounts page
          </p>
          <Button variant="outline" onClick={() => router.push('/dashboard/accounts')}>
            Go to Accounts
          </Button>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameAccountDialogOpen} onOpenChange={setRenameAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>
              Change the account number. This will update all trade references.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleRenameAccount() }}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentNumber">Current Number</Label>
                <Input
                  id="currentNumber"
                  value={accountToRename}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newNumber">New Number</Label>
                <Input
                  id="newNumber"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  placeholder="Enter new account number"
                  autoFocus
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setRenameAccountDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={renameLoading || !newAccountNumber || newAccountNumber === accountToRename}>
                {renameLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  'Rename'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
