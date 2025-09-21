'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { TrashIcon, AlertCircle, MoreVertical, Edit2, Loader2 } from "lucide-react"
import { 
  removeAccountsFromTradesAction, 
  renameAccountAction
} from "@/server/accounts"
import { useData } from '@/context/data-provider'
import { toast } from '@/hooks/use-toast'
import { User } from '@supabase/supabase-js'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Trade } from '@prisma/client'
import ExportButton from '@/components/export-button'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { useAccounts } from '@/hooks/use-accounts'

type GroupedTrades = Record<string, Record<string, Trade[]>>
type AccountWithTrades = {
  id: string
  number: string
  name: string
  displayName: string
  accountType: 'live' | 'prop-firm'
  tradeCount: number
  trades: Trade[]
}

export function DataManagementCard() {
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

  // Combine accounts with their trades for unified data management
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
        trades: accountTrades
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

      // Delete accounts using the proper API endpoints
      for (const accountNumber of accountsToDelete) {
        const account = accountsWithTrades.find(acc => acc.number === accountNumber)
        if (account) {
          const endpoint = account.accountType === 'prop-firm' 
            ? `/api/prop-firm/accounts/${account.id}`
            : `/api/accounts/${account.id}`
          
          const response = await fetch(endpoint, {
            method: 'DELETE',
          })

          if (!response.ok) {
            throw new Error(`Failed to delete account ${account.displayName}`)
          }
        }
      }

      // Refresh both accounts and trades data
      await Promise.all([
        refetchAccounts(),
        refreshTrades()
      ])
      
      setSelectedAccounts([])
      toast({
        title: accountsToDelete.length > 1 ? 'Accounts deleted' : 'Account deleted',
        description: `${accountsToDelete.length} account${accountsToDelete.length > 1 ? 's' : ''} and all associated trades have been permanently deleted.`,
        variant: 'default',
      })
    } catch (error) {
      console.error("Failed to delete accounts:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete accounts'))
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete accounts. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }, [user, accountsWithTrades, selectedAccounts, refetchAccounts, refreshTrades])


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
      toast({
        title: 'Account renamed',
        description: `Account renamed from ${accountToRename} to ${newAccountNumber}`,
        variant: 'default',
      })
      setRenameAccountDialogOpen(false)
      setAccountToRename("")
      setNewAccountNumber("")
    } catch (error) {
      console.error("Failed to rename account:", error)
      setError(error instanceof Error ? error : new Error('Failed to rename account'))
      toast({
        title: 'Rename failed',
        description: error instanceof Error ? error.message : 'Failed to rename account. Please try again.',
        variant: 'destructive',
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
            <ExportButton trades={trades} />
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
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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

          {/* Account List */}
          {!accountsLoading && accountsWithTrades.map((account) => (
            <div key={account.number} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center w-full sm:w-auto">
                  <Checkbox
                    id={`select-${account.number}`}
                    checked={selectedAccounts.includes(account.number)}
                    onCheckedChange={() => handleSelectAccount(account.number)}
                    className="mr-3 flex-shrink-0"
                  />
                  <div className="flex items-center justify-between w-full sm:w-auto">
                    <div className="flex flex-col">
                      <span className="text-base sm:text-lg font-semibold">
                        {account.displayName}
                      </span>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{account.number}</span>
                        <span>•</span>
                        <span className="capitalize">{account.accountType}</span>
                        <span>•</span>
                        <span>{account.tradeCount} trades</span>
                      </div>
                    </div>
                    <div className="flex items-center sm:hidden ml-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">More options</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setAccountToRename(account.number)
                              setRenameAccountDialogOpen(true)
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            Rename Account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center w-auto justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAccountToRename(account.number)
                      setRenameAccountDialogOpen(true)
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Rename
                  </Button>
                </div>
              </div>
            </div>
          ))}

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