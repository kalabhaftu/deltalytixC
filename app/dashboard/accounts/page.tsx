'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from "@/context/auth-provider"
import { toast } from "sonner"
import { useAccounts, clearAccountsCache } from "@/hooks/use-accounts"
import { useData } from '@/context/data-provider'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Search,
  Filter,
  RefreshCw,
  TrendingUp, 
  TrendingDown,
  Building2, 
  User, 
  DollarSign,
  Activity,
  MoreHorizontal,
  Settings,
  ExternalLink,
  Shield,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Edit,
  Trash2
} from "lucide-react"
import { EnhancedCreateLiveAccountDialog } from "../components/accounts/enhanced-create-live-account-dialog"
import { EnhancedCreateAccountDialog as CreatePropFirmAccountDialog } from "../components/prop-firm/enhanced-create-account-dialog"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import { LoadingSkeleton } from "@/components/ui/loading"
import { OptimizedAccountsLoading } from "@/components/ui/optimized-loading"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { calculateAccountBalances } from "@/lib/utils/balance-calculator"

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
  status?: 'active' | 'funded' | 'failed' | 'passed'
  currentPhase?: number
  phaseAccountNumber?: string
  profitTargetProgress?: number
  dailyDrawdownRemaining?: number
  maxDrawdownRemaining?: number
  totalPayouts?: number
  hasRecentBreach?: boolean
  createdAt?: string
  updatedAt?: string
}

export default function AccountsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { accounts, isLoading, refetch: refetchAccounts } = useAccounts()
  const { formattedTrades } = useData()
  
  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'live' | 'prop-firm'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'failed'>('all')
  const [createLiveDialogOpen, setCreateLiveDialogOpen] = useState(false)
  const [createPropFirmDialogOpen, setCreatePropFirmDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  // Removed auto-refresh functionality for better UX

  // Set initial filter from URL params only on first load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const filterParam = urlParams.get('filter')
    if (filterParam === 'prop-firm' || filterParam === 'live') {
      setFilterType(filterParam)
      // Clear the URL parameter to prevent it from affecting future navigation
      urlParams.delete('filter')
      const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`
      window.history.replaceState({}, '', newUrl)
    }
  }, []) // Only run on mount

  // Removed auto-refresh effects for better UX


  // Filter accounts - Accounts page has its own built-in filtering and does NOT use advanced filtering settings
  // Advanced filtering settings are only applied to dashboard widgets and tables page
  // Server now returns clean data without master account duplicates
  // Hide failed/passed/archived accounts by default - only show active and funded
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      // Hide failed, passed, and archived accounts (only show active and funded)
      if (account.status === 'failed' || account.status === 'passed' || account.status === 'archived') {
        return false
      }
      
      const matchesSearch = !searchQuery ||
        account.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.broker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.displayName?.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType = filterType === 'all' || account.accountType === filterType
      const matchesStatus = filterStatus === 'all' || account.status === filterStatus

      return matchesSearch && matchesType && matchesStatus
    })
  }, [accounts, searchQuery, filterType, filterStatus])

  // Calculate real equity using unified balance calculator
  const accountsWithRealEquity = useMemo(() => {
    const accountEquities = calculateAccountBalances(filteredAccounts, formattedTrades, {
      excludeFailedAccounts: true,
      includePayouts: true
    })
    
    // Return accounts with calculated equity
    return filteredAccounts.map(account => ({
      ...account,
      calculatedEquity: accountEquities.get(account.number) || account.startingBalance || 0
    }))
  }, [filteredAccounts, formattedTrades])

  const accountStats = useMemo(() => {
    return {
      total: filteredAccounts.length,
      live: filteredAccounts.filter(a => a.accountType === 'live').length,
      propFirm: filteredAccounts.filter(a => a.accountType === 'prop-firm').length,
      active: filteredAccounts.filter(a => a.status === 'active').length,
      funded: filteredAccounts.filter(a => a.accountType === 'prop-firm' && (a.currentPhase || 1) >= 3).length,
      failed: filteredAccounts.filter(a => a.status === 'failed').length,
      // Use calculated equity that includes trade P&L
      totalEquity: accountsWithRealEquity.reduce((sum, account) => sum + account.calculatedEquity, 0)
    }
  }, [filteredAccounts, accountsWithRealEquity])

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refetchAccounts()
      setLastUpdated(new Date())
      toast.success("Accounts refreshed", {
        description: "All account data has been updated",
      })
    } catch (error) {
      toast.error("Refresh failed", {
        description: "Failed to refresh account data",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [refetchAccounts])


  const handleAccountCreated = useCallback(() => {
    // Clear cache to ensure immediate refresh
    clearAccountsCache()
    refetchAccounts()
    setLastUpdated(new Date())
    setCreateLiveDialogOpen(false)
    setCreatePropFirmDialogOpen(false)
    toast.success("Account created", {
      description: "New account has been added successfully",
    })
  }, [refetchAccounts])

  const handleViewAccount = useCallback((account: Account) => {
    if (account.accountType === 'prop-firm') {
      router.push(`/dashboard/prop-firm/accounts/${account.id}`)
    } else {
      router.push(`/dashboard?account=${account.id}`)
    }
  }, [router])

  const handleEditAccount = useCallback((account: Account) => {
    // Navigate to edit page (only works for live accounts currently)
    if (account.accountType === 'live') {
      router.push(`/dashboard/accounts/${account.id}/edit`)
    } else {
      // For prop firm accounts, show a message that editing isn't available yet
      toast.error("Edit Not Available", {
        description: "Prop firm account editing is not yet available. Contact support for changes.",
      })
    }
  }, [router])

  const handleDeleteAccount = useCallback((account: Account) => {
    setDeletingAccount(account)
  }, [])

  const confirmDeleteAccount = useCallback(async () => {
    if (!deletingAccount) return

    const accountName = deletingAccount.displayName || deletingAccount.name || deletingAccount.number
    
    // Require exact account name confirmation
    if (deleteConfirmText !== accountName) {
        toast.error("Confirmation Required", {
          description: `Please type "${accountName}" exactly to confirm deletion.`,
        })
      return
    }

    try {
      const endpoint = deletingAccount.accountType === 'prop-firm'
        ? `/api/prop-firm-v2/accounts/${deletingAccount.id}`
        : `/api/accounts/${deletingAccount.id}`

      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      toast.success("Account deleted", {
        description: `${accountName} and all associated trades have been permanently deleted.`,
      })

      // Clear all cache layers to ensure immediate refresh
      clearAccountsCache()
      
      // Invalidate all server-side caches
      const { invalidateUserCaches } = await import('@/server/accounts')
      if (user?.id) {
        await invalidateUserCaches(user.id)
      }

      // Force refresh by clearing browser cache and reloading
      if ('caches' in window) {
        await caches.delete('next-app')
        await caches.delete('next-data')
      }

      // Force hard refresh to clear all cached data
      await refetchAccounts()

      // Clear local storage that might have cached account data
      if (typeof window !== 'undefined') {
        const keysToRemove = Object.keys(localStorage).filter(key =>
          key.includes('account') || key.includes('trade') || key.includes('prop-firm')
        )
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }

      setDeletingAccount(null)
      setDeleteConfirmText('')
    } catch (error) {
      toast.error("Delete failed", {
        description: "Failed to delete account. Please try again.",
      })
    }
  }, [deletingAccount, refetchAccounts, deleteConfirmText])

  if (isLoading) {
    return <OptimizedAccountsLoading accountCount={6} />
  }
    
    return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header Section */}
      <motion.div
          initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Trading Accounts
              </h1>
              <p className="text-muted-foreground text-lg">
                Manage your trading accounts and track performance
              </p>
                </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8"
                title="Refresh account data"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-10">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setCreateLiveDialogOpen(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Live Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreatePropFirmDialogOpen(true)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Prop Firm Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
              </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <StatsCard
            title="Total Accounts"
            value={accountStats.total}
            icon={<Activity className="h-4 w-4" />}
          />
          <StatsCard
            title="Live Accounts"
            value={accountStats.live}
            icon={<User className="h-4 w-4" />}
          />
          <StatsCard
            title="Prop Firm Accounts"
            value={accountStats.propFirm}
            icon={<Building2 className="h-4 w-4" />}
          />
          <StatsCard
            title="Total Equity"
            value={formatCurrency(accountStats.totalEquity)}
            icon={<DollarSign className="h-4 w-4" />}
          />
        </motion.div>


        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl shadow-sm border p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
                </div>
            
            <div className="flex gap-3">
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-40 h-10">
                  <SelectValue placeholder="Account Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="live">Live Accounts</SelectItem>
                  <SelectItem value="prop-firm">Prop Firm</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-32 h-10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="failed">Failed Only</SelectItem>
                </SelectContent>
              </Select>
                  </div>
                </div>
        </motion.div>


        {/* Accounts Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {filteredAccounts.length === 0 ? (
            <EmptyState 
              hasAccounts={accounts.length > 0}
              onCreateLive={() => setCreateLiveDialogOpen(true)}
              onCreatePropFirm={() => setCreatePropFirmDialogOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {accountsWithRealEquity.map((account, index) => (
                <motion.div
                  key={account.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className="h-full"
                >
                  <AccountCard 
                    account={account} 
                    onView={() => handleViewAccount(account)}
                    onEdit={() => handleEditAccount(account)}
                    onDelete={() => handleDeleteAccount(account)}
                  />
                </motion.div>
              ))}
                  </div>
                )}
        </motion.div>


        {/* Enhanced Delete Confirmation Dialog */}
        <AlertDialog open={!!deletingAccount} onOpenChange={() => {
          setDeletingAccount(null)
          setDeleteConfirmText('')
        }}>
          <AlertDialogContent className="sm:max-w-[600px]">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
                Delete Account: {deletingAccount?.displayName || deletingAccount?.name || deletingAccount?.number}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="text-left space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This action is <strong>irreversible</strong> and will permanently delete:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>The account and all its configuration</li>
                    <li>All trades associated with this account</li>
                    <li>Trade history, analytics, and performance data</li>
                    <li>Any uploaded trade screenshots or videos</li>
                    <li>Account phases and evaluation progress (for prop firm accounts)</li>
                  </ul>
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-sm font-medium text-destructive flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      This data cannot be recovered once deleted.
                    </p>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="delete-confirm" className="text-sm font-medium">
                  Type <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                    {deletingAccount?.displayName || deletingAccount?.name || deletingAccount?.number}
                  </code> to confirm:
                </Label>
                <Input
                  id="delete-confirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type the account name here"
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
              <AlertDialogCancel 
                onClick={() => {
                  setDeletingAccount(null)
                  setDeleteConfirmText('')
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteAccount}
                disabled={deleteConfirmText !== (deletingAccount?.displayName || deletingAccount?.name || deletingAccount?.number)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                I understand the consequences, delete account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Account Dialogs */}
        <EnhancedCreateLiveAccountDialog
          open={createLiveDialogOpen}
          onOpenChange={setCreateLiveDialogOpen}
          onSuccess={() => {
            refetchAccounts()
          }}
        />

        <CreatePropFirmAccountDialog
          open={createPropFirmDialogOpen}
          onOpenChange={setCreatePropFirmDialogOpen}
          onSuccess={() => {
            refetchAccounts()
          }}
        />
            </div>
    </div>
  )
}

// Components
function StatsCard({ 
  title, 
  value, 
  icon
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
}) {
    return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-foreground">
              {value}
            </p>
            </div>
          <div className="p-3 rounded-full bg-muted text-muted-foreground">
            {icon}
          </div>
          </div>
      </CardContent>
    </Card>
  )
}

function AccountCard({ 
  account, 
  onView, 
  onEdit, 
  onDelete 
}: { 
  account: Account & { calculatedEquity?: number }
  onView: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const getStatusVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'outline'
      case 'funded': return 'default'
      case 'failed': return 'destructive'
      case 'passed': return 'secondary'
      default: return 'outline'
    }
  }

  const isAtRisk = account.accountType === 'prop-firm' && (
    (account.dailyDrawdownRemaining && account.dailyDrawdownRemaining < 500) ||
    (account.maxDrawdownRemaining && account.maxDrawdownRemaining < 1000)
  )
    
    return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 h-full flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
                  {account.accountType === 'prop-firm' ? (
                <Building2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                <User className="h-4 w-4 text-muted-foreground" />
                  )}
              <h3 className="font-semibold text-foreground truncate">
                {account.displayName || account.name || account.number}
              </h3>
              </div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm text-muted-foreground">
                {account.accountType === 'prop-firm' ? account.displayName : account.broker}
              </p>
              {/* Add phase badge for prop firm accounts */}
              {account.accountType === 'prop-firm' && account.currentPhase && (
                <Badge variant={
                  account.currentPhase >= 3 ? 'default' :
                  account.currentPhase === 2 ? 'secondary' :
                  'outline'
                } className="text-xs">
                  {account.currentPhase >= 3 ? 'Funded' :
                   account.currentPhase === 2 ? 'Phase 2' :
                   'Phase 1'}
                </Badge>
              )}
            </div>
        </div>

                  <div className="flex items-center gap-2">
            {account.status && (
              <Badge variant={getStatusVariant(account.status)} className="text-xs">
                {account.status.toUpperCase()}
              </Badge>
            )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                  </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                  Edit Account
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
              </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Balance Information */}
            <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Current Equity</p>
            <p className="font-semibold text-foreground">
              {formatCurrency(account.calculatedEquity || account.currentEquity || account.currentBalance || account.startingBalance || 0)}
                </p>
              </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Trades</p>
            <p className="font-semibold text-foreground">
              {account.tradeCount || 0}
                </p>
              </div>
            </div>

        {/* Prop Firm Specific Info - Fixed Height Container */}
        <div className="min-h-[120px] flex flex-col justify-start">
          {account.accountType === 'prop-firm' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Account Type</span>
                <Badge variant="outline" className="text-xs">
                  PROP FIRM
                </Badge>
                </div>
              {account.currentPhase && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Phase</span>
                    <Badge
                      variant={
                        (account.currentPhase || 1) >= 3 ? 'default' :
                        (account.currentPhase || 1) === 2 ? 'secondary' :
                        'outline'
                      }
                      className="text-xs"
                    >
                      {(account.currentPhase || 1) >= 3 ? 'FUNDED' :
                       (account.currentPhase || 1) === 2 ? 'PHASE 2' :
                       'PHASE 1'}
                    </Badge>
                  </div>
                  {account.phaseAccountNumber && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Account #</span>
                      <span className="text-xs font-mono text-foreground">
                        {account.phaseAccountNumber}
                      </span>
                    </div>
                  )}
                </div>
            )}

              {account.profitTargetProgress !== undefined && (account.currentPhase || 1) < 3 && (
                  <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Profit Target</span>
                    <span className="text-xs font-medium">{account.profitTargetProgress.toFixed(1)}%</span>
                </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, account.profitTargetProgress))}%` }}
                    />
                  </div>
              </div>
            )}

              {isAtRisk && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-destructive font-medium">
                    Approaching drawdown limit
                  </span>
                  </div>
              )}
              
              {/* Prop Firm Description */}
              <div className="text-xs text-muted-foreground mt-auto">
                Prop firm evaluation account with funded trading opportunity
                  </div>
                </div>
                ) : (
            <div className="space-y-3">
                            <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Account Type</span>
                <Badge variant="outline" className="text-xs">
                  LIVE
                              </Badge>
                  </div>
              <div className="text-xs text-muted-foreground">
                Live trading account for real market execution
                </div>
                  </div>
                )}
                    </div>

        {/* Spacer to maintain card height consistency */}
        <div className="mt-auto" />
          </CardContent>
        </Card>
  )
}

function EmptyState({ 
  hasAccounts, 
  onCreateLive, 
  onCreatePropFirm 
}: { 
  hasAccounts: boolean
  onCreateLive: () => void
  onCreatePropFirm: () => void
}) {
  if (hasAccounts) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No accounts found
          </h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
              </CardContent>
            </Card>
    )
  }

  return (
    <Card className="text-center py-16">
      <CardContent>
        <div className="max-w-md mx-auto">
          <div className="bg-muted rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Activity className="h-12 w-12 text-muted-foreground" />
            </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Welcome to Your Trading Dashboard
          </h3>
          <p className="text-muted-foreground mb-8">
            Get started by adding your first trading account to track performance and analyze your trades
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onCreateLive} size="lg">
              <User className="h-4 w-4 mr-2" />
              Add Live Account
            </Button>
            <Button onClick={onCreatePropFirm} size="lg" variant="outline">
              <Building2 className="h-4 w-4 mr-2" />
              Add Prop Firm Account
            </Button>
            </div>
          </div>
                </CardContent>
              </Card>
  )
}

function AccountsLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header skeleton - Optimized for faster loading */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="h-10 bg-muted rounded-md w-64 mb-2 animate-pulse" />
              <div className="h-5 bg-muted rounded-md w-80 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-8 bg-muted rounded-md w-16 animate-pulse" />
              <div className="h-8 bg-muted rounded-md w-24 animate-pulse" />
              <div className="h-10 bg-muted rounded-md w-32 animate-pulse" />
            </div>
          </div>
        </motion.div>
        
        {/* Stats cards skeleton - Fast loading */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                    <div className="h-7 bg-muted rounded w-16 animate-pulse" />
                  </div>
                  <div className="h-10 w-10 bg-muted rounded-full animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
        
        {/* Filter section skeleton - Compact */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl shadow-sm border p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 h-10 bg-muted rounded-md animate-pulse" />
            <div className="flex gap-3">
              <div className="h-10 bg-muted rounded-md w-40 animate-pulse" />
              <div className="h-10 bg-muted rounded-md w-32 animate-pulse" />
            </div>
          </div>
        </motion.div>
        
        {/* Account cards skeleton - Optimized count and layout */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + (i * 0.05) }}
              className="h-full"
            >
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                        <div className="h-5 bg-muted rounded w-32 animate-pulse" />
                      </div>
                      <div className="h-3 bg-muted rounded w-24 animate-pulse" />
                    </div>
                    <div className="h-5 bg-muted rounded-full w-16 animate-pulse" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                      <div className="h-5 bg-muted rounded w-16 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-12 animate-pulse" />
                      <div className="h-5 bg-muted rounded w-8 animate-pulse" />
                    </div>
                  </div>
                  <div className="min-h-[120px] space-y-3">
                    <div className="h-4 bg-muted rounded w-full animate-pulse" />
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-6 bg-muted rounded w-full animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

// Utilities
function formatCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}
