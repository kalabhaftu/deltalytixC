'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { TrashIcon, AlertCircle, MoreVertical, Edit2, Loader2, ChevronDown, ChevronRight } from "lucide-react"
import { 
  removeAccountsFromTradesAction, 
  renameAccountAction
} from "@/server/accounts"
import { useData } from '@/context/data-provider'
import { toast } from 'sonner'
import { User } from '@supabase/supabase-js'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trade } from '@prisma/client'
import { AdvancedExportDialog } from './advanced-export-dialog'
import { ImportDialog } from './import-dialog'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { useAccounts } from '@/hooks/use-accounts'
import { Badge } from "@/components/ui/badge"

type GroupedTrades = Record<string, Record<string, Trade[]>>
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
  phases: Array<{
    id: string
    number: string
    displayName: string
    status: string
    tradeCount: number
    phaseDetails: any
    phaseId?: string
    currentPhase?: number
  }>
}

export function DataManagementCard() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)
  const trades = useTradesStore((state) => state.trades)
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
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({})

  // Group accounts by master account name (hierarchical structure)
  const groupedAccounts = useMemo(() => {
    if (!allAccounts || accountsLoading) return []

    const grouped: Record<string, GroupedAccount> = {}

    // Group by account name
    allAccounts.forEach(account => {
      const accountName = account.name
      const accountTrades = trades.filter(trade => trade.accountNumber === account.number)

      if (!grouped[accountName]) {
        grouped[accountName] = {
          accountName,
          propFirm: (account as any).propfirm || '',
          accountType: account.accountType,
          totalTrades: 0,
          phases: []
        }
      }

      grouped[accountName].phases.push({
        id: account.id,
        number: account.number,
        displayName: account.displayName,
        status: account.status,
        tradeCount: accountTrades.length,
        phaseDetails: account.currentPhaseDetails,
        phaseId: account.currentPhaseDetails?.phaseId || account.number,
        currentPhase: account.currentPhase || account.currentPhaseDetails?.phaseNumber
      })

      grouped[accountName].totalTrades += accountTrades.length
    })

    return Object.values(grouped)
  }, [allAccounts, trades, accountsLoading])

  // Combine accounts with their trades for unified data management (for backwards compatibility)
  const accountsWithTrades = useMemo(() => {
    if (!allAccounts || accountsLoading) return []
    
    return allAccounts.map(account => {
      // Find trades for this account by account number
      const accountTrades = trades.filter(trade => trade.accountNumber === account.number)
      
      return {
        id: account.id,
        number: account.number,
        name: account.name,
        displayName: account.displayName,
        accountType: account.accountType,
        tradeCount: accountTrades.length,
        trades: accountTrades,
        currentPhaseDetails: account.currentPhaseDetails
      }
    })
  }, [allAccounts, trades, accountsLoading])

  // For backwards compatibility with existing trade grouping logic
  const getGroupedTrades = useMemo(() => {
    return trades.reduce<GroupedTrades>((acc, trade) => {
      if (!acc[trade.accountNumber]) {
        acc[trade.accountNumber] = {}
      }
      if (!acc[trade.accountNumber][trade.instrument]) {
        acc[trade.accountNumber][trade.instrument] = []
      }
      acc[trade.accountNumber][trade.instrument].push(trade)
      return acc
    }, {})
  }, [trades])

  const handleDeleteAccounts = useCallback(async () => {
    if (!user) return
    try {
      setDeleteLoading(true)
      // Get account numbers to delete
      const accountsToDelete = selectedAccounts.length === 0 
        ? accountsWithTrades.map(acc => acc.number)  // All accounts
        : selectedAccounts  // Selected accounts

      // Map to unique account IDs to avoid deleting same master account multiple times
      const uniqueAccountIds = new Set<string>()
      const accountsToDeleteData: Array<{id: string, endpoint: string, displayName: string}> = []

      for (const accountNumber of accountsToDelete) {
        const account = accountsWithTrades.find(acc => acc.number === accountNumber)
        if (account) {
          // Determine the correct endpoint and ID
          let endpoint: string
          let accountId: string
          
          if (account.accountType === 'prop-firm') {
            // For prop-firm: use the MASTER account ID from currentPhaseDetails
            accountId = account.currentPhaseDetails?.masterAccountId || account.id
            endpoint = `/api/prop-firm-v2/accounts/${accountId}`
          } else {
            // For live accounts: use the account ID directly
            accountId = account.id
            endpoint = `/api/accounts/${accountId}`
          }
          
          // Only add if not already in the set (avoid duplicate deletions)
          if (!uniqueAccountIds.has(accountId)) {
            uniqueAccountIds.add(accountId)
            accountsToDeleteData.push({ id: accountId, endpoint, displayName: account.displayName })
          }
        } else {
          console.warn(`Account not found for number: ${accountNumber}`)
        }
      }

      // Delete unique accounts
      for (const accountData of accountsToDeleteData) {
        const response = await fetch(accountData.endpoint, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Delete failed for ${accountData.displayName}:`, errorText)
          throw new Error(`Failed to delete account ${accountData.displayName}`)
        }
      }

      // Force cache invalidation for ALL data sources
      const { invalidateAccountsCache } = await import('@/hooks/use-accounts')
      const { invalidateUserCaches } = await import('@/server/accounts')
      
      // Invalidate all caches
      invalidateAccountsCache('account-deleted')
      if (user?.id) {
        await invalidateUserCaches(user.id)
      }
      
      // CRITICAL: Force router refresh to update UI immediately
      router.refresh()
      
      await Promise.all([
        refetchAccounts(),
        refreshTrades()
      ])
      
      setSelectedAccounts([])
      toast.success(accountsToDelete.length > 1 ? 'Accounts deleted' : 'Account deleted', {
        description: `${accountsToDelete.length} account${accountsToDelete.length > 1 ? 's' : ''} and all associated trades have been permanently deleted.`,
      })
    } catch (error) {
      console.error("Failed to delete accounts:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete accounts'))
      toast.error('Delete failed', {
        description: error instanceof Error ? error.message : 'Failed to delete accounts. Please try again.',
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
      // Refresh both accounts and trades data
      await Promise.all([
        refetchAccounts(),
        refreshTrades()
      ])
      toast.success('Account renamed', {
        description: `Account renamed from ${accountToRename} to ${newAccountNumber}`,
      })
      setRenameAccountDialogOpen(false)
      setAccountToRename("")
      setNewAccountNumber("")
    } catch (error) {
      console.error("Failed to rename account:", error)
      setError(error instanceof Error ? error : new Error('Failed to rename account'))
      toast.error('Rename failed', {
        description: error instanceof Error ? error.message : 'Failed to rename account. Please try again.',
      })
    } finally {
      setRenameLoading(false)
    }
  }, [user, accountToRename, newAccountNumber, refetchAccounts, refreshTrades])

  if (error) return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  )
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <span className="text-xl lg:text-2xl">Data Management</span>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <ImportDialog />
            <AdvancedExportDialog />
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 lg:flex-none min-w-[140px]"
                  disabled={deleteLoading}
                  onClick={() => {
                    setDeleteDialogOpen(true)
                  }}
                >
                  {deleteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="mr-2 h-4 w-4" />
                      {selectedAccounts.length === 0 ? 'Delete' : `Delete (${selectedAccounts.length})`}
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {selectedAccounts.length === 0 ? 'Delete All Accounts' : `Delete ${selectedAccounts.length} Account${selectedAccounts.length > 1 ? 's' : ''}`}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {selectedAccounts.length === 0 
                      ? 'This will delete all accounts and their associated trades. This action cannot be undone.'
                      : `This will delete the selected account${selectedAccounts.length > 1 ? 's' : ''} and their associated trades. This action cannot be undone.`
                    }
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
          </div>
        </CardTitle>
        <CardDescription>Manage your trading accounts and data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Loading State */}
          {accountsLoading && (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading accounts...</p>
            </div>
          )}

          {/* Select All Header */}
          {!accountsLoading && accountsWithTrades.length > 0 && (
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center">
                <Checkbox
                  id="select-all"
                  checked={selectedAccounts.length === accountsWithTrades.length && accountsWithTrades.length > 0}
                  onCheckedChange={handleSelectAll}
                  className="mr-3"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  {selectedAccounts.length === accountsWithTrades.length 
                    ? 'Deselect All' 
                    : 'Select All'
                  }
                </label>
              </div>
              {selectedAccounts.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedAccounts.length} selected
                </span>
              )}
            </div>
          )}

          {/* Grouped Account List */}
          {!accountsLoading && groupedAccounts.map((group) => {
            const isExpanded = expandedAccounts[group.accountName] ?? true
            const hasMultiplePhases = group.phases.length > 1

            return (
              <div key={group.accountName} className="border rounded-lg overflow-hidden">
                {/* Account Group Header */}
                <div 
                  className={`p-4 ${hasMultiplePhases ? 'cursor-pointer hover:bg-muted/50' : 'hover:bg-muted/50'} transition-colors`}
                  onClick={() => hasMultiplePhases && toggleExpandAccount(group.accountName)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      {hasMultiplePhases && (
                        <div className="flex-shrink-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold">{group.accountName}</span>
                          {group.propFirm && (
                            <span className="text-xs text-muted-foreground">{group.propFirm}</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {group.totalTrades} total trades • {group.phases.length} phase{group.phases.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phases List (shown when expanded or single phase) */}
                {(isExpanded || !hasMultiplePhases) && (
                  <div className="border-t bg-muted/20">
                    {group.phases.map((phase) => (
                      <div
                        key={phase.number}
                        className="flex items-center justify-between p-4 pl-8 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            id={`select-${phase.number}`}
                            checked={selectedAccounts.includes(phase.number)}
                            onCheckedChange={() => handleSelectAccount(phase.number)}
                            className="flex-shrink-0"
                          />
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{phase.number}</span>
                              {phase.currentPhase && (
                                <Badge variant="outline" className="text-xs">
                                  Phase {phase.currentPhase}
                                </Badge>
                              )}
                              <Badge variant={getStatusVariant(phase.status)} className="text-xs capitalize">
                                {phase.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {phase.tradeCount} trades
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAccountToRename(phase.number)
                              setRenameAccountDialogOpen(true)
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Empty State */}
          {!accountsLoading && accountsWithTrades.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No accounts found</p>
              <p className="text-sm text-muted-foreground mt-2">Create your first account from the Accounts page</p>
            </div>
          )}
        </div>
      </CardContent>
      <Dialog open={renameAccountDialogOpen} onOpenChange={setRenameAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Account</DialogTitle>
            <DialogDescription>
              Enter a new name for this account. This will update all references to this account.
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
          </Alert>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleRenameAccount()
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newAccountNumber" className="text-right">
                  Account Number
                </label>
                <input
                  id="newAccountNumber"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  autoComplete="off"
                  placeholder="Enter new account number"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={renameLoading || !newAccountNumber}
              >
                {renameLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  'Rename Account'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 