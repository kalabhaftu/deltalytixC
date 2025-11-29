'use client'

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from "@/context/auth-provider"
import { toast } from "sonner"
import { useAccounts, clearAccountsCache } from "@/hooks/use-accounts"
import { useData } from '@/context/data-provider'
import { useTradesStore } from '@/store/trades-store'
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search,
  RefreshCw,
  TrendingUp, 
  TrendingDown,
  Building2, 
  User, 
  DollarSign,
  Activity,
  MoreHorizontal,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Archive,
  ArchiveRestore,
  Target,
  Trophy,
  XCircle,
  Wallet,
  BarChart3,
  Sparkles,
  ChevronRight,
  X
} from "lucide-react"
import { CreateLiveAccountDialog } from "../components/accounts/create-live-account-dialog"
import { CreatePropFirmDialog } from "../components/prop-firm/create-prop-firm-dialog"
import { EditLiveAccountDialog } from "@/components/edit-live-account-dialog"
import { EditPropFirmAccountDialog } from "@/components/edit-prop-firm-account-dialog"
import { motion, AnimatePresence } from "framer-motion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { calculateAccountBalances } from "@/lib/utils/balance-calculator"
import { useLiveAccountTransactions } from '@/hooks/use-live-account-transactions'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Types
interface Account {
  id: string
  name?: string
  number: string
  displayName?: string
  accountType: 'live' | 'prop-firm'
  broker?: string
  startingBalance?: number
  currentBalance?: number
  currentEquity?: number
  tradeCount?: number
  status?: 'active' | 'funded' | 'failed' | 'passed' | 'pending'
  currentPhase?: number
  phaseAccountNumber?: string | null
  profitTargetProgress?: number
  dailyDrawdownRemaining?: number
  maxDrawdownRemaining?: number
  totalPayouts?: number
  hasRecentBreach?: boolean
  createdAt?: string
  updatedAt?: string
  isArchived?: boolean
  currentPhaseDetails?: {
    phaseNumber: number
    status: string
    phaseId: string
    masterAccountId?: string
    evaluationType?: string
  } | null
}

// Helper functions
function isFundedPhase(evaluationType: string | undefined, phaseNumber: number | undefined): boolean {
  if (!phaseNumber) return false
  switch (evaluationType) {
    case 'Two Step': return phaseNumber >= 3
    case 'One Step': return phaseNumber >= 2
    case 'Instant': return phaseNumber >= 1
    default: return phaseNumber >= 3
  }
}

function isAccountFunded(account: Account): boolean {
  const evaluationType = account.currentPhaseDetails?.evaluationType
  const phaseNumber = account.currentPhase || account.currentPhaseDetails?.phaseNumber
  return isFundedPhase(evaluationType, phaseNumber)
}

function getPhaseDisplayName(evaluationType: string | undefined, phaseNumber: number | undefined): string {
  if (!phaseNumber) return 'Unknown'
  if (isFundedPhase(evaluationType, phaseNumber)) return 'FUNDED'
  return `PHASE ${phaseNumber}`
}

function formatCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '$0.00'
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatCompactCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '$0'
  if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (Math.abs(amount) >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`
  }
  return formatCurrency(amount)
}

type FilterType = 'all' | 'live' | 'prop-firm'
type FilterStatus = 'all' | 'failed' | 'archived'

export default function AccountsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  
  const { accounts, isLoading, refetch: refetchAccounts } = useAccounts({ 
    includeArchived: filterStatus === 'archived' 
  })
  const { formattedTrades } = useData()
  const allTrades = useTradesStore(state => state.trades)
  const { transactions } = useLiveAccountTransactions()
  
  // Dialog states
  const [createLiveDialogOpen, setCreateLiveDialogOpen] = useState(false)
  const [createPropFirmDialogOpen, setCreatePropFirmDialogOpen] = useState(false)
  const [editLiveDialogOpen, setEditLiveDialogOpen] = useState(false)
  const [editPropFirmDialogOpen, setEditPropFirmDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  // URL param filter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const filterParam = urlParams.get('filter')
    if (filterParam === 'prop-firm' || filterParam === 'live') {
      setFilterType(filterParam)
      urlParams.delete('filter')
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [])

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const matchesSearch = !searchQuery ||
        account.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.broker?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = filterType === 'all' || account.accountType === filterType
      const isPassedAccount = account.status === 'passed'
      const shouldHideByDefault = account.status === 'failed' || account.status === 'pending'
      
      if (isPassedAccount) return false
      
      if (filterStatus === 'archived') {
        return matchesSearch && matchesType && account.isArchived === true
      }
      
      if (account.isArchived === true) return false
      
      const matchesStatus = filterStatus === 'all'
        ? !shouldHideByDefault
        : account.status === filterStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [accounts, searchQuery, filterType, filterStatus])

  // Calculate real equity
  const accountsWithRealEquity = useMemo(() => {
    const accountEquities = calculateAccountBalances(filteredAccounts, allTrades, transactions, {
      excludeFailedAccounts: false,
      includePayouts: true
    })

    return filteredAccounts.map(account => ({
      ...account,
      calculatedEquity: accountEquities.get(account.number) || account.startingBalance || 0
    }))
  }, [filteredAccounts, allTrades, transactions])

  // Stats
  const accountStats = useMemo(() => {
    const totalEquity = accountsWithRealEquity.reduce((sum, account) => sum + account.calculatedEquity, 0)
    const pnl = totalEquity - accountsWithRealEquity.reduce((sum, acc) => sum + (acc.startingBalance || 0), 0)
    
    return {
      total: filteredAccounts.length,
      live: filteredAccounts.filter(a => a.accountType === 'live').length,
      propFirm: filteredAccounts.filter(a => a.accountType === 'prop-firm').length,
      funded: filteredAccounts.filter(a => a.accountType === 'prop-firm' && isAccountFunded(a)).length,
      totalEquity,
      pnl,
      totalTrades: filteredAccounts.reduce((sum, a) => sum + (a.tradeCount || 0), 0)
    }
  }, [filteredAccounts, accountsWithRealEquity])

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refetchAccounts()
      toast.success("Accounts refreshed")
    } catch (error) {
      toast.error("Failed to refresh accounts")
    } finally {
      setIsRefreshing(false)
    }
  }, [refetchAccounts])

  const handleAccountCreated = useCallback(() => {
    clearAccountsCache()
    refetchAccounts()
    setCreateLiveDialogOpen(false)
    setCreatePropFirmDialogOpen(false)
    toast.success("Account created successfully")
  }, [refetchAccounts])

  const handleAccountUpdated = useCallback(() => {
    clearAccountsCache()
    refetchAccounts()
    setEditLiveDialogOpen(false)
    setEditPropFirmDialogOpen(false)
    setEditingAccount(null)
    toast.success("Account updated successfully")
  }, [refetchAccounts])

  const handleViewAccount = useCallback((account: Account) => {
    if (account.accountType === 'prop-firm') {
      const masterAccountId = account.currentPhaseDetails?.masterAccountId || account.id
      router.push(`/dashboard/prop-firm/accounts/${masterAccountId}`)
    } else {
      router.push(`/dashboard/accounts/${account.id}`)
    }
  }, [router])

  const handleEditAccount = useCallback((account: Account) => {
    setEditingAccount(account)
    if (account.accountType === 'live') {
      setEditLiveDialogOpen(true)
    } else {
      setEditPropFirmDialogOpen(true)
    }
  }, [])

  const handleDeleteAccount = useCallback((account: Account) => {
    setDeletingAccount(account)
  }, [])

  const confirmDeleteAccount = useCallback(async () => {
    if (!deletingAccount) return

    const accountName = deletingAccount.displayName || deletingAccount.name || deletingAccount.number
    
    if (deleteConfirmText !== accountName) {
      toast.error("Please type the account name exactly to confirm")
      return
    }

    try {
      const accountId = deletingAccount.accountType === 'prop-firm'
        ? (deletingAccount.currentPhaseDetails?.masterAccountId || deletingAccount.id)
        : deletingAccount.id
        
      const endpoint = deletingAccount.accountType === 'prop-firm'
        ? `/api/prop-firm/accounts/${accountId}`
        : `/api/accounts/${accountId}`

      const response = await fetch(endpoint, { method: 'DELETE' })

      if (!response.ok) throw new Error('Failed to delete account')

      toast.success(`${accountName} deleted permanently`)
      clearAccountsCache()
      await refetchAccounts()
      setDeletingAccount(null)
      setDeleteConfirmText('')
    } catch (error) {
      toast.error("Failed to delete account")
    }
  }, [deletingAccount, refetchAccounts, deleteConfirmText])

  const handleArchiveAccount = useCallback(async (account: Account) => {
    const accountName = account.displayName || account.name || account.number
    const isArchived = account.isArchived || false
    
    try {
      const accountId = account.accountType === 'prop-firm'
        ? (account.currentPhaseDetails?.masterAccountId || account.id)
        : account.id
        
      const endpoint = account.accountType === 'prop-firm'
        ? `/api/prop-firm/accounts/${accountId}`
        : `/api/accounts/${accountId}`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !isArchived })
      })

      if (!response.ok) throw new Error('Failed to update account')

      toast.success(isArchived ? `${accountName} restored` : `${accountName} archived`)
      clearAccountsCache()
      await refetchAccounts()
    } catch (error) {
      toast.error("Failed to update account")
    }
  }, [refetchAccounts])

  // Loading state
  if (isLoading) {
    return <AccountsPageSkeleton />
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
                  Accounts
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Manage and monitor your trading accounts
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="h-9 w-9"
                    >
                      <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh accounts</TooltipContent>
                </Tooltip>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-9 gap-2">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">New Account</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuItem onClick={() => setCreateLiveDialogOpen(true)} className="gap-3 py-2.5">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">Live Account</div>
                        <div className="text-xs text-muted-foreground">Personal trading</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCreatePropFirmDialogOpen(true)} className="gap-3 py-2.5">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium">Prop Firm</div>
                        <div className="text-xs text-muted-foreground">Funded challenge</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </motion.div>

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6"
          >
            <StatCard
              label="Total Equity"
              value={formatCompactCurrency(accountStats.totalEquity)}
              icon={<Wallet className="h-4 w-4" />}
              trend={accountStats.pnl >= 0 ? 'up' : 'down'}
              trendValue={`${accountStats.pnl >= 0 ? '+' : ''}${formatCompactCurrency(accountStats.pnl)}`}
            />
            <StatCard
              label="Accounts"
              value={accountStats.total}
              icon={<Activity className="h-4 w-4" />}
              subtext={`${accountStats.live} live, ${accountStats.propFirm} prop`}
            />
            <StatCard
              label="Funded"
              value={accountStats.funded}
              icon={<Trophy className="h-4 w-4" />}
              highlight={accountStats.funded > 0}
            />
            <StatCard
              label="Total Trades"
              value={accountStats.totalTrades.toLocaleString()}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-20 h-9"
              />
              {searchQuery ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              ) : (
                <kbd className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  <span className="text-xs">⌘</span>K
                </kbd>
              )}
            </div>

            {/* Type filter tabs */}
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)} className="w-full sm:w-auto">
              <TabsList className="h-9 w-full sm:w-auto grid grid-cols-3">
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
                <TabsTrigger value="live" className="text-xs px-3 gap-1.5">
                  <User className="h-3 w-3" />
                  <span className="hidden sm:inline">Live</span>
                </TabsTrigger>
                <TabsTrigger value="prop-firm" className="text-xs px-3 gap-1.5">
                  <Building2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Prop</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Status filter */}
            <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)} className="w-full sm:w-auto">
              <TabsList className="h-9 w-full sm:w-auto grid grid-cols-3">
                <TabsTrigger value="all" className="text-xs px-3">Active</TabsTrigger>
                <TabsTrigger value="failed" className="text-xs px-3">Failed</TabsTrigger>
                <TabsTrigger value="archived" className="text-xs px-3">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {/* Accounts Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {filteredAccounts.length === 0 ? (
              <EmptyState
                hasAccounts={accounts.length > 0}
                searchQuery={searchQuery}
                onCreateLive={() => setCreateLiveDialogOpen(true)}
                onCreatePropFirm={() => setCreatePropFirmDialogOpen(true)}
                onClearSearch={() => setSearchQuery('')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {accountsWithRealEquity.map((account, index) => (
                    <motion.div
                      key={account.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                    >
                      <AccountCard
                        account={account}
                        onView={() => handleViewAccount(account)}
                        onEdit={() => handleEditAccount(account)}
                        onDelete={() => handleDeleteAccount(account)}
                        onArchive={() => handleArchiveAccount(account)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingAccount} onOpenChange={() => {
          setDeletingAccount(null)
          setDeleteConfirmText('')
        }}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <span>Delete Account</span>
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This will permanently delete <strong>{deletingAccount?.displayName || deletingAccount?.name || deletingAccount?.number}</strong> and all associated data including:
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• All trades and history</li>
                  <li>• Performance analytics</li>
                  <li>• Screenshots and media</li>
                  {deletingAccount?.accountType === 'prop-firm' && (
                    <li>• Phase progress and payouts</li>
                  )}
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-2 py-2">
              <Label className="text-sm">
                Type <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                  {deletingAccount?.displayName || deletingAccount?.name || deletingAccount?.number}
                </code> to confirm
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type account name..."
                className="font-mono text-sm"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeletingAccount(null)
                setDeleteConfirmText('')
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteAccount}
                disabled={deleteConfirmText !== (deletingAccount?.displayName || deletingAccount?.name || deletingAccount?.number)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialogs */}
        <CreateLiveAccountDialog
          open={createLiveDialogOpen}
          onOpenChange={setCreateLiveDialogOpen}
          onSuccess={handleAccountCreated}
        />
        <CreatePropFirmDialog
          open={createPropFirmDialogOpen}
          onOpenChange={setCreatePropFirmDialogOpen}
          onSuccess={handleAccountCreated}
        />
        <EditLiveAccountDialog
          open={editLiveDialogOpen}
          onOpenChange={setEditLiveDialogOpen}
          account={editingAccount}
          onSuccess={handleAccountUpdated}
        />
        <EditPropFirmAccountDialog
          open={editPropFirmDialogOpen}
          onOpenChange={setEditPropFirmDialogOpen}
          account={editingAccount}
          onSuccess={handleAccountUpdated}
        />
      </div>
    </TooltipProvider>
  )
}

// Stat Card Component
function StatCard({ 
  label, 
  value, 
  icon, 
  trend, 
  trendValue,
  subtext,
  highlight 
}: { 
  label: string
  value: string | number
  icon: React.ReactNode
  trend?: 'up' | 'down'
  trendValue?: string
  subtext?: string
  highlight?: boolean
}) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all",
      highlight && "ring-1 ring-primary/20 bg-primary/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="text-xl lg:text-2xl font-bold tracking-tight">{value}</p>
            {(trend && trendValue) && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                trend === 'up' ? "text-long" : "text-short"
              )}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
            {subtext && (
              <p className="text-xs text-muted-foreground">{subtext}</p>
            )}
          </div>
          <div className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center",
            highlight ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {icon}
          </div>
        </div>
        {highlight && (
          <Sparkles className="absolute -right-2 -bottom-2 h-16 w-16 text-primary/10" />
        )}
      </CardContent>
    </Card>
  )
}

// Account Card Component
function AccountCard({ 
  account, 
  onView, 
  onEdit, 
  onDelete,
  onArchive
}: { 
  account: Account & { calculatedEquity?: number }
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  const isPropFirm = account.accountType === 'prop-firm'
  const isFunded = isPropFirm && isAccountFunded(account)
  const isFailed = account.status === 'failed'
  const isArchived = account.isArchived
  // Use calculatedEquity (computed by parent) or fallback to startingBalance
  const equity = account.calculatedEquity ?? account.startingBalance ?? 0
  const startingBalance = account.startingBalance || 0
  const pnl = equity - startingBalance
  const pnlPercent = startingBalance > 0 ? (pnl / startingBalance) * 100 : 0
  
  const isAtRisk = isPropFirm && !isFailed && (
    (account.dailyDrawdownRemaining && account.dailyDrawdownRemaining < 500) ||
    (account.maxDrawdownRemaining && account.maxDrawdownRemaining < 1000)
  )

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer",
        isFailed && "opacity-75 border-destructive/30",
        isArchived && "opacity-60",
        isFunded && "ring-1 ring-primary/30",
        isAtRisk && !isFailed && "ring-1 ring-destructive/30"
      )}
      onClick={onView}
    >
      {/* Status indicator stripe */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isFailed ? "bg-destructive" :
        isFunded ? "bg-primary" :
        isPropFirm ? "bg-primary/70" :
        "bg-muted-foreground/50"
      )} />

      <CardContent className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className={cn(
              "h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0",
              isFailed ? "bg-destructive/10" :
              isFunded ? "bg-primary/10" :
              "bg-muted"
            )}>
              {isFailed ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : isFunded ? (
                <Trophy className="h-4 w-4 text-primary" />
              ) : isPropFirm ? (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              ) : (
                <User className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">
                {account.displayName || account.name || account.number}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {isPropFirm 
                  ? getPhaseDisplayName(account.currentPhaseDetails?.evaluationType, account.currentPhase)
                  : account.broker || 'Live Account'
                }
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView() }}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive() }}>
                {isArchived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Balance */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold tracking-tight">
                {formatCurrency(equity)}
              </p>
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                pnl >= 0 ? "text-long" : "text-short"
              )}>
                {pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}</span>
                <span className="text-muted-foreground">({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(1)}%)</span>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {account.tradeCount || 0} trades
            </Badge>
          </div>

          {/* Progress bar for prop firm */}
          {isPropFirm && !isFunded && !isFailed && account.profitTargetProgress !== undefined && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  Profit Target
                </span>
                <span className="font-medium">{account.profitTargetProgress.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    account.profitTargetProgress >= 100 
                      ? "bg-long" 
                      : "bg-primary"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.max(0, account.profitTargetProgress))}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          )}

          {/* Risk warning */}
          {isAtRisk && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-xs font-medium">Near drawdown limit</span>
            </div>
          )}
        </div>

        {/* Quick action hint */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
          <span>{account.number}</span>
          <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            View details <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// Empty State Component
function EmptyState({ 
  hasAccounts, 
  searchQuery,
  onCreateLive, 
  onCreatePropFirm,
  onClearSearch
}: { 
  hasAccounts: boolean
  searchQuery: string
  onCreateLive: () => void
  onCreatePropFirm: () => void
  onClearSearch: () => void
}) {
  if (hasAccounts || searchQuery) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold mb-1">No accounts found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            {searchQuery 
              ? `No accounts match "${searchQuery}"`
              : "Try adjusting your filters"
            }
          </p>
          {searchQuery && (
            <Button variant="outline" size="sm" className="mt-4" onClick={onClearSearch}>
              Clear search
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-20">
        <div className="relative mb-6">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="absolute -right-2 -bottom-2 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="h-4 w-4 text-primary" />
          </div>
        </div>
        <h3 className="text-xl font-semibold mb-2">Create your first account</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
          Add a trading account to start tracking your performance, analyzing trades, and growing as a trader.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onCreateLive} className="gap-2">
            <User className="h-4 w-4" />
            Live Account
          </Button>
          <Button onClick={onCreatePropFirm} variant="outline" className="gap-2">
            <Building2 className="h-4 w-4" />
            Prop Firm Account
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// Loading Skeleton
function AccountsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            <div className="h-9 w-28 bg-muted rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-7 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters skeleton */}
        <div className="flex gap-3 mb-6">
          <div className="h-9 flex-1 max-w-md bg-muted rounded-lg animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded-lg animate-pulse" />
          <div className="h-9 w-36 bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 pt-5">
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-8 w-28 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                  <div className="h-2 w-full bg-muted rounded-full animate-pulse" />
                </div>
                <div className="mt-3 pt-3 border-t">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
