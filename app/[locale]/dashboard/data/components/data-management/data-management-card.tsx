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
import { useI18n } from "@/locales/client"
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'

type GroupedTrades = Record<string, Record<string, Trade[]>>



export function DataManagementCard() {
  const t = useI18n()
  const user = useUserStore((state) => state.user)
  const trades = useTradesStore((state) => state.trades)

  const { refreshTrades } = useData()
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [renameLoading, setRenameLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [renameAccountDialogOpen, setRenameAccountDialogOpen] = useState(false)
  const [accountToRename, setAccountToRename] = useState("")
  const [newAccountNumber, setNewAccountNumber] = useState("")
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupedTrades, setGroupedTrades] = useState<GroupedTrades>({})



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

  useEffect(() => {
    if (!user) return
    const fetchTradesData = async () => {
      try {
        setGroupedTrades(getGroupedTrades)
      } catch (error) {
        console.error("Failed to fetch trades:", error)
        setError(error instanceof Error ? error : new Error('Failed to fetch trades'))
      }
    }
    fetchTradesData()
  }, [user, trades, getGroupedTrades])

  const handleDeleteAccounts = useCallback(async () => {
    if (!user) return
    try {
      setDeleteLoading(true)
      // If no accounts are selected, delete all accounts
      const accountsToDelete = selectedAccounts.length === 0 ? Object.keys(groupedTrades) : selectedAccounts
      await removeAccountsFromTradesAction(accountsToDelete)
      await refreshTrades()
      setSelectedAccounts([])
      toast({
        title: accountsToDelete.length > 1 ? t('dataManagement.toast.accountsDeleted') : t('dataManagement.toast.accountDeleted'),
        variant: 'default',
      })
    } catch (error) {
      console.error("Failed to delete accounts:", error)
      setError(error instanceof Error ? error : new Error('Failed to delete accounts'))
      toast({
        title: t('dataManagement.toast.deleteError'),
        description: t('dataManagement.toast.deleteErrorDesc'),
        variant: 'destructive',
      })
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }, [user, groupedTrades, selectedAccounts, refreshTrades, t])


  const handleSelectAccount = useCallback((accountNumber: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountNumber)
        ? prev.filter(acc => acc !== accountNumber)
        : [...prev, accountNumber]
    )
  }, [])

  const handleSelectAll = useCallback(() => {
    const allAccountNumbers = Object.keys(groupedTrades)
    if (selectedAccounts.length === allAccountNumbers.length) {
      setSelectedAccounts([])
    } else {
      setSelectedAccounts(allAccountNumbers)
    }
  }, [selectedAccounts.length, groupedTrades])

  const handleRenameAccount = useCallback(async () => {
    if (!user || !accountToRename || !newAccountNumber) return
    try {
      setRenameLoading(true)
      await renameAccountAction(accountToRename, newAccountNumber)
      await refreshTrades()
      toast({
        title: t('dataManagement.toast.accountRenamed'),
        variant: 'default',
      })
      setRenameAccountDialogOpen(false)
      setAccountToRename("")
      setNewAccountNumber("")
    } catch (error) {
      console.error("Failed to rename account:", error)
      setError(error instanceof Error ? error : new Error('Failed to rename account'))
      toast({
        title: t('dataManagement.toast.accountRenameError'),
        description: error instanceof Error ? error.message : t('dataManagement.toast.deleteErrorDesc'),
        variant: 'destructive',
      })
    } finally {
      setRenameLoading(false)
    }
  }, [user, accountToRename, newAccountNumber, refreshTrades, t])

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
          <span className="text-xl lg:text-2xl">{t('dataManagement.title')}</span>
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
                      {t('dataManagement.deleting')}
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
                  <AlertDialogCancel>{t('dataManagement.deleteConfirm.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccounts} disabled={deleteLoading}>
                    {deleteLoading ? t('dataManagement.deleting') : t('dataManagement.deleteConfirm.continue')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardTitle>
        <CardDescription>{t('dataManagement.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Select All Header */}
          {Object.keys(groupedTrades).length > 0 && (
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center">
                <Checkbox
                  id="select-all"
                  checked={selectedAccounts.length === Object.keys(groupedTrades).length && Object.keys(groupedTrades).length > 0}
                  onCheckedChange={handleSelectAll}
                  className="mr-3"
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  {selectedAccounts.length === Object.keys(groupedTrades).length 
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
          {Object.entries(groupedTrades).map(([accountNumber, instruments]) => (
            <div key={accountNumber} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center w-full sm:w-auto">
                  <Checkbox
                    id={`select-${accountNumber}`}
                    checked={selectedAccounts.includes(accountNumber)}
                    onCheckedChange={() => handleSelectAccount(accountNumber)}
                    className="mr-3 flex-shrink-0"
                  />
                  <div className="flex items-center justify-between w-full sm:w-auto">
                    <span className="text-base sm:text-lg font-semibold">
                      {accountNumber}
                    </span>
                    <div className="flex items-center sm:hidden ml-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">{t('dataManagement.moreOptions')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setAccountToRename(accountNumber)
                              setRenameAccountDialogOpen(true)
                            }}
                          >
                            <Edit2 className="w-4 h-4 mr-2" />
                            {t('dataManagement.renameAccount')}
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
                      setAccountToRename(accountNumber)
                      setRenameAccountDialogOpen(true)
                    }}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('dataManagement.rename')}
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {Object.keys(groupedTrades).length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No accounts found</p>
            </div>
          )}
        </div>
      </CardContent>
      <Dialog open={renameAccountDialogOpen} onOpenChange={setRenameAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dataManagement.renameAccount.title')}</DialogTitle>
            <DialogDescription>
              {t('dataManagement.renameAccount.description')}
            </DialogDescription>
          </DialogHeader>
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t('dataManagement.renameAccount.warning')}</AlertTitle>
          </Alert>
          <form onSubmit={(e) => {
            e.preventDefault()
            handleRenameAccount()
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="newAccountNumber" className="text-right">
                  {t('dataManagement.renameAccount.newNumber')}
                </label>
                <input
                  id="newAccountNumber"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                  autoComplete="off"
                  placeholder={t('dataManagement.renameAccount.placeholder')}
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
                    {t('dataManagement.renameDialog.renaming')}
                  </>
                ) : (
                  t('dataManagement.rename')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
} 