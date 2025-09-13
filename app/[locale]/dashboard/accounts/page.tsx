'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { useAccounts } from "@/hooks/use-accounts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Plus, 
  TrendingUp, 
  ExternalLink, 
  Building2, 
  User, 
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Activity,
  DollarSign,
  Calendar,
  Target,
  Shield,
  Gauge,
  RefreshCw,
  Settings
} from "lucide-react"
import { CreateLiveAccountDialog } from "../components/accounts/create-live-account-dialog"
import { CreateAccountDialog as CreatePropFirmAccountDialog } from "../components/prop-firm/create-account-dialog"
import { PropFirmDashboard } from "../components/prop-firm/prop-firm-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { motion } from "framer-motion"
import { LoadingSkeleton } from "@/components/ui/loading"
import { PrimaryButton, SecondaryButton, CrudActions } from "@/components/ui/button-styles"
import { AccessibleText, AccessibleDescription } from "@/components/ui/accessible-text"
// Removed SimplifiedAccountOverview import - using inline simplified view

interface UnifiedAccount {
  id: string
  number: string
  name?: string
  broker?: string
  propfirm: string
  accountType: 'prop-firm' | 'live'
  displayName: string
  startingBalance: number
  status: string
  currentPhase?: any
  tradeCount: number
  createdAt: string
  currentBalance?: number
  profitLoss?: number
  profitTarget?: number
  drawdownThreshold?: number
  lastTradeDate?: string
}

export default function AccountsPage() {
  const t = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  
  // Use centralized accounts hook
  const { accounts: allAccounts, isLoading: accountsLoading, refetch: refetchAccounts } = useAccounts()
  
  // Filter to only live accounts (non-prop firm)
  const accounts = allAccounts.filter(account => account.accountType === 'live')
  
  const [propFirmAccounts, setPropFirmAccounts] = useState<any[]>([])
  const [isPropFirmLoading, setIsPropFirmLoading] = useState(true)
  const [createLiveDialogOpen, setCreateLiveDialogOpen] = useState(false)
  const [createPropFirmDialogOpen, setCreatePropFirmDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccountForDelete, setSelectedAccountForDelete] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple')
  const hasFetchedPropFirmAccounts = useRef(false)

  // DD Calculation Functions
  const calculateDailyDD = useCallback((account: any) => {
    if (!account.startingBalance || !account.currentEquity) return 0
    
    // Daily DD = (Equity at start of day - Lowest Equity during day)
    // For now, using current equity as proxy for lowest equity of the day
    // In a real implementation, you'd track the lowest equity of the current day
    const dailyStartBalance = account.startingBalance // This should be equity at start of day
    const lowestEquityToday = account.currentEquity // This should be lowest equity during day
    
    return Math.max(0, dailyStartBalance - lowestEquityToday)
  }, [])

  const calculateMaxDD = useCallback((account: any) => {
    if (!account.startingBalance || !account.currentEquity) return 0
    
    // Max DD = Trailing DD that only moves up with equity highs and locks at breakeven
    // For now, using starting balance as highest equity reached
    // In a real implementation, you'd track the highest equity reached
    const highestEquityReached = account.startingBalance // This should be tracked highest equity
    const maxDDLimit = account.maxDrawdownAmount || (account.startingBalance * 0.1) // 10% default
    
    // Calculate trailing DD limit
    const trailingDDLimit = Math.max(
      account.startingBalance, // Breakeven point (locked)
      highestEquityReached - maxDDLimit
    )
    
    // Current max DD remaining = trailing DD limit - current equity
    return Math.max(0, trailingDDLimit - account.currentEquity)
  }, [])

  const calculateDailyDDRemaining = useCallback((account: any) => {
    const dailyDDUsed = calculateDailyDD(account)
    const dailyDDLimit = account.dailyDrawdownAmount || (account.startingBalance * 0.05) // 5% default
    return Math.max(0, dailyDDLimit - dailyDDUsed)
  }, [calculateDailyDD])

  const calculateMaxDDRemaining = useCallback((account: any) => {
    const maxDDUsed = calculateMaxDD(account)
    const maxDDLimit = account.maxDrawdownAmount || (account.startingBalance * 0.1) // 10% default
    return Math.max(0, maxDDLimit - maxDDUsed)
  }, [calculateMaxDD])

  // Fetch prop firm accounts with useCallback to prevent infinite loops
  const fetchPropFirmAccounts = useCallback(async () => {
    if (hasFetchedPropFirmAccounts.current) return
    
    try {
      setIsPropFirmLoading(true)
      hasFetchedPropFirmAccounts.current = true
      
      const response = await fetch('/api/prop-firm/accounts')
      
      if (!response.ok) {
        throw new Error('Failed to fetch prop firm accounts')
      }

      const data = await response.json()
      if (data.success) {
        setPropFirmAccounts(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch prop firm accounts')
      }
    } catch (error) {
      console.error('Error fetching prop firm accounts:', error)
      toast({
        title: t('propFirm.toast.setupError'),
        description: t('propFirm.toast.setupErrorDescription'),
        variant: "destructive"
      })
    } finally {
      setIsPropFirmLoading(false)
    }
  }, [t])

  // Load prop firm accounts on mount
  useEffect(() => {
    if (user) {
      fetchPropFirmAccounts()
    }
  }, [user, fetchPropFirmAccounts])

  const handleAccountCreated = () => {
    refetchAccounts()
    setCreateLiveDialogOpen(false)
  }

  const handlePropFirmAccountCreated = () => {
    hasFetchedPropFirmAccounts.current = false
    fetchPropFirmAccounts()
    setCreatePropFirmDialogOpen(false)
  }

  // Prop firm account handlers
  const handleViewPropFirmAccount = (accountId: string) => {
    router.push(`/dashboard/prop-firm/accounts/${accountId}`)
  }

  const handleAddTrade = (accountId: string) => {
    router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/new`)
  }

  const handleRequestPayout = (accountId: string) => {
    router.push(`/dashboard/prop-firm/accounts/${accountId}/payouts`)
  }

  const handleResetPropFirmAccount = async (accountId: string) => {
    const account = propFirmAccounts.find(a => a.id === accountId)
    if (!account) return

    const reason = prompt(t('propFirm.reset.reasonPrompt'))
    if (!reason) return

    try {
      const response = await fetch(`/api/prop-firm/accounts/${accountId}/reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          clearTrades: false
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reset account')
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: t('propFirm.reset.success'),
          description: t('propFirm.reset.successDescription'),
        })
        fetchPropFirmAccounts() // Reload accounts
      } else {
        throw new Error(data.error || 'Failed to reset account')
      }
    } catch (error) {
      console.error('Error resetting account:', error)
      toast({
        title: t('propFirm.reset.error'),
        description: t('propFirm.reset.errorDescription'),
        variant: "destructive"
      })
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      toast({
        title: t('accounts.toast.deleteSuccess'),
        description: t('accounts.toast.deleteSuccessDescription'),
        variant: "default"
      })

      refetchAccounts()
      setSelectedAccountForDelete(null)
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({
        title: t('accounts.toast.deleteError'),
        description: t('accounts.toast.deleteErrorDescription'),
        variant: "destructive"
      })
    }
  }

  // Filter live accounts based on search query
  const filteredLiveAccounts = accounts.filter(account => 
    account.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (account.propfirm && account.propfirm.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleViewAccount = (accountId: string, accountType: string) => {
    if (accountType === 'prop-firm') {
      router.push(`/dashboard/prop-firm/accounts/${accountId}`)
    } else {
      // For live accounts, we can navigate to a general view or trades
      router.push(`/dashboard?account=${accountId}`)
    }
  }

  const handleEditAccount = (accountId: string, accountType: string) => {
    if (accountType === 'prop-firm') {
      router.push(`/dashboard/prop-firm/accounts/${accountId}/settings`)
    } else {
      // For live accounts, we could create an edit dialog or navigate to settings
      router.push(`/dashboard/accounts/${accountId}/edit`)
    }
  }

  const AccountCard = ({ account }: { account: UnifiedAccount }) => {
    const profitLossColor = (account.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
    const statusColor = account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/20 hover:border-l-primary">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold text-foreground">{account.displayName}</CardTitle>
                  <Badge className={statusColor}>
                    {account.status || 'Active'}
                  </Badge>
                </div>
                <AccessibleDescription className="flex items-center gap-2">
                  {account.accountType === 'prop-firm' ? (
                    <>
                      <Building2 className="h-4 w-4" />
                      {account.propfirm || t('accounts.propFirm')}
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      {account.broker || t('accounts.liveBroker')}
                    </>
                  )}
                </AccessibleDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleViewAccount(account.id, account.accountType)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('accounts.view')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleEditAccount(account.id, account.accountType)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('accounts.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setSelectedAccountForDelete(account.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('accounts.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Account Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <AccessibleText variant="muted" size="xs" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {t('accounts.accountNumber')}
                </AccessibleText>
                <p className="font-mono text-sm font-medium">{account.number}</p>
              </div>
              <div className="space-y-1">
                <AccessibleText variant="muted" size="xs" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {t('accounts.startingBalance')}
                </AccessibleText>
                <p className="text-sm font-semibold">${account.startingBalance.toLocaleString()}</p>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Activity className="h-3 w-3" />
                  {t('accounts.trades')}
                </div>
                <p className="text-sm font-medium">
                  {account.accountType === 'prop-firm' 
                    ? (account.tradeCount || 0)
                    : (account.tradeCount || 0)
                  }
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  {account.accountType === 'prop-firm' ? 'Payouts' : 'P&L'}
                </div>
                <p className="text-sm font-medium">
                  {account.accountType === 'prop-firm' 
                    ? '0'
                    : (account.profitLoss !== undefined ? `$${account.profitLoss.toLocaleString()}` : '0')
                  }
                </p>
              </div>
            </div>

            {/* Additional Details */}
            {account.currentBalance && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  Current Balance
                </div>
                <p className="text-sm font-semibold">${account.currentBalance.toLocaleString()}</p>
              </div>
            )}

            {/* Risk Management for Prop Firm */}
            {account.accountType === 'prop-firm' && account.drawdownThreshold && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  Drawdown Limit
                </div>
                <p className="text-sm font-medium">${account.drawdownThreshold.toLocaleString()}</p>
              </div>
            )}

            {/* Additional Metrics for Prop Firm Accounts */}
            {account.accountType === 'prop-firm' && (
              <div className="space-y-3">
                {/* Current Equity */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <DollarSign className="h-3 w-3" />
                    Current Equity
                  </div>
                  <p className="text-sm font-semibold">
                    ${(account.startingBalance || 0).toLocaleString()}
                  </p>
                </div>

                {/* Daily DD Remaining */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Daily DD Remaining
                  </div>
                  <p className={`text-sm font-semibold ${
                    calculateDailyDDRemaining(account) < (account.startingBalance * 0.01) ? 'text-red-500' : 'text-green-500'
                  }`}>
                    ${calculateDailyDDRemaining(account).toLocaleString()}
                  </p>
                </div>

                {/* Max DD Remaining */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    Max DD Remaining
                  </div>
                  <p className={`text-sm font-semibold ${
                    calculateMaxDDRemaining(account) < (account.startingBalance * 0.02) ? 'text-red-500' : 'text-green-500'
                  }`}>
                    ${calculateMaxDDRemaining(account).toLocaleString()}
                  </p>
                </div>

                {/* Profit Target */}
                {account.profitTarget && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      Profit Target
                    </div>
                    <p className="text-sm font-medium">${account.profitTarget.toLocaleString()}</p>
                  </div>
                )}

                {/* Current Phase */}
                {account.currentPhase && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      Current Phase
                    </div>
                    <p className="text-sm font-medium capitalize">
                      {account.currentPhase?.phaseType || 'Phase 1'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {account.lastTradeDate ? 
                  new Date(account.lastTradeDate).toLocaleDateString() : 
                  t('accounts.noTrades')
                }
              </div>
              <CrudActions
                onView={() => handleViewAccount(account.id, account.accountType)}
                onEdit={() => handleEditAccount(account.id, account.accountType)}
                viewText={t('accounts.view')}
                editText={t('accounts.edit')}
                size="sm"
                className="gap-1"
              />
              {account.accountType === 'prop-firm' && (
                <PrimaryButton
                  size="sm"
                  onClick={() => router.push(`/dashboard/prop-firm/accounts/${account.id}/trades/new`)}
                  className="h-8 ml-2"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t('accounts.addTrade')}
                </PrimaryButton>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (accountsLoading || isPropFirmLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('accounts.title')}</h1>
              <p className="text-muted-foreground">{t('accounts.description')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('accounts.title')}</h1>
              <AccessibleDescription className="text-sm sm:text-base">
                Manage your trading accounts and prop firm evaluations
              </AccessibleDescription>
            </div>
            <div className="flex gap-2">
              <SecondaryButton 
                onClick={() => setViewMode(viewMode === 'simple' ? 'advanced' : 'simple')}
                size="sm"
                variant={viewMode === 'simple' ? 'outline' : 'default'}
              >
                {viewMode === 'simple' ? 'Advanced View' : 'Simple View'}
              </SecondaryButton>
              <SecondaryButton 
                onClick={() => {
                  refetchAccounts()
                  fetchPropFirmAccounts()
                }}
                size="sm"
                className="whitespace-nowrap"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Refresh All</span>
                <span className="sm:hidden">Refresh</span>
              </SecondaryButton>
            </div>
          </div>
        </div>

        {/* Conditional rendering based on view mode */}
        {viewMode === 'simple' ? (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <AccessibleText variant="muted" size="sm">Total Accounts</AccessibleText>
                  </div>
                  <p className="text-2xl font-bold mt-1">{accounts.length + propFirmAccounts.length}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <AccessibleText variant="muted" size="sm">Prop Firms</AccessibleText>
                  </div>
                  <p className="text-2xl font-bold mt-1">{propFirmAccounts.length}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <AccessibleText variant="muted" size="sm">Live Accounts</AccessibleText>
                  </div>
                  <p className="text-2xl font-bold mt-1">{accounts.length}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <AccessibleText variant="muted" size="sm">Total Balance</AccessibleText>
                  </div>
                  <p className="text-2xl font-bold mt-1">
                    ${[...accounts, ...propFirmAccounts].reduce((sum, a) => sum + (a.startingBalance || 0), 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Simplified Account Grid */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Your Trading Accounts</CardTitle>
                    <AccessibleDescription>
                      Manage and monitor all your trading accounts in one place
                    </AccessibleDescription>
                  </div>
                  <div className="flex gap-2">
                    <SecondaryButton 
                      size="sm" 
                      onClick={() => setCreateLiveDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Live Account
                    </SecondaryButton>
                    <PrimaryButton 
                      size="sm" 
                      onClick={() => setCreatePropFirmDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Prop Firm
                    </PrimaryButton>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {[...accounts, ...propFirmAccounts].length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No accounts found</h3>
                    <AccessibleDescription className="mb-6">
                      Create your first trading account to get started
                    </AccessibleDescription>
                    <div className="flex gap-2 justify-center">
                      <SecondaryButton onClick={() => setCreateLiveDialogOpen(true)}>
                        Add Live Account
                      </SecondaryButton>
                      <PrimaryButton onClick={() => setCreatePropFirmDialogOpen(true)}>
                        Add Prop Firm Account
                      </PrimaryButton>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...accounts, ...propFirmAccounts].map((account) => (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleViewAccount(account.id, account.accountType)}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-medium">{account.displayName || account.name || account.number}</CardTitle>
                              <Badge variant={account.accountType === 'prop-firm' ? 'default' : 'secondary'}>
                                {account.accountType === 'prop-firm' ? 'Prop Firm' : 'Live'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <AccessibleText variant="muted" size="xs">Balance</AccessibleText>
                                <p className="font-semibold">${(account.startingBalance || 0).toLocaleString()}</p>
                              </div>
                              <div>
                                <AccessibleText variant="muted" size="xs">Trades</AccessibleText>
                                <p className="font-semibold">{account.tradeCount || account.totalTrades || 0}</p>
                              </div>
                            </div>
                            {account.profitLoss !== undefined && (
                              <div className="mt-3 pt-3 border-t">
                                <AccessibleText variant="muted" size="xs">P&L</AccessibleText>
                                <p className={`font-semibold ${account.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ${account.profitLoss.toLocaleString()}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Tabs defaultValue="prop-firm-management" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="prop-firm-management" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Prop Firm Management
              <Badge variant="secondary" className="ml-1">{propFirmAccounts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Accounts
              <Badge variant="secondary" className="ml-1">{accounts.length + propFirmAccounts.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Prop Firm Management Section */}
          <TabsContent value="prop-firm-management" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Prop Firm Management
                    </CardTitle>
                    <CardDescription>
                      Manage your prop firm evaluation accounts, track progress, and handle payouts
                    </CardDescription>
                  </div>
                  <PrimaryButton onClick={() => setCreatePropFirmDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Prop Firm Account
                  </PrimaryButton>
                </div>
              </CardHeader>
              <CardContent>
                <PropFirmDashboard
                  accounts={propFirmAccounts}
                  isLoading={isPropFirmLoading}
                  onRefresh={fetchPropFirmAccounts}
                  onCreateAccount={() => setCreatePropFirmDialogOpen(true)}
                  onViewAccount={handleViewPropFirmAccount}
                  onAddTrade={handleAddTrade}
                  onRequestPayout={handleRequestPayout}
                  onResetAccount={handleResetPropFirmAccount}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounts Section */}
          <TabsContent value="accounts" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      All Trading Accounts
                    </CardTitle>
                    <CardDescription>
                      View and manage all your trading accounts in one place
                    </CardDescription>
                  </div>
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="prop-firm-accounts" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="prop-firm-accounts" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Prop Firm Accounts
                      <Badge variant="secondary" className="ml-1">{propFirmAccounts.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="live-accounts" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Live Accounts
                      <Badge variant="secondary" className="ml-1">{filteredLiveAccounts.length}</Badge>
                    </TabsTrigger>
                  </TabsList>

                  {/* Prop Firm Accounts Tab */}
                  <TabsContent value="prop-firm-accounts" className="space-y-6 mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Prop Firm Accounts</h3>
                      <SecondaryButton 
                        onClick={() => setCreatePropFirmDialogOpen(true)}
                        size="sm"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Add Prop Firm Account
                      </SecondaryButton>
                    </div>
                    
                    {propFirmAccounts.length === 0 ? (
                      <Card className="text-center py-16">
                        <CardContent>
                          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                          <h3 className="text-xl font-semibold mb-3">No Prop Firm Accounts</h3>
                          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Start your prop firm evaluation journey by creating your first account.</p>
                          <PrimaryButton onClick={() => setCreatePropFirmDialogOpen(true)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Create Prop Firm Account
                          </PrimaryButton>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        {propFirmAccounts
                          .filter(account => 
                            account.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            account.number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            account.propfirm?.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((account) => (
                            <motion.div
                              key={account.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
                                <CardHeader className="pb-4">
                                  <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-semibold text-foreground">
                                          {account.name || account.number}
                                        </CardTitle>
                                        <Badge className="bg-blue-500 text-white">
                                          {account.status}
                                        </Badge>
                                      </div>
                                      <CardDescription className="flex items-center gap-2 text-sm">
                                        <Building2 className="h-4 w-4" />
                                        {account.propfirm}
                                      </CardDescription>
                                    </div>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleViewPropFirmAccount(account.id)}>
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleAddTrade(account.id)}>
                                          <Plus className="h-4 w-4 mr-2" />
                                          Add Trade
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <DollarSign className="h-3 w-3" />
                                          Starting Balance
                                        </div>
                                        <p className="text-sm font-semibold">${account.startingBalance?.toLocaleString()}</p>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                          <Activity className="h-3 w-3" />
                                          Trades
                                        </div>
                                        <p className="text-sm font-medium">{account.totalTrades || 0}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {account.createdAt ? 
                                          new Date(account.createdAt).toLocaleDateString() : 
                                          'Recently created'
                                        }
                                      </div>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleViewPropFirmAccount(account.id)}
                                        className="h-8"
                                      >
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Live Accounts Tab */}
                  <TabsContent value="live-accounts" className="space-y-6 mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Live Accounts</h3>
                      <SecondaryButton onClick={() => setCreateLiveDialogOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Live Account
                      </SecondaryButton>
                    </div>
                    
                    {filteredLiveAccounts.length === 0 ? (
                      <Card className="text-center py-16">
                        <CardContent>
                          <User className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                          <h3 className="text-xl font-semibold mb-3">No Live Accounts</h3>
                          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Add your live trading accounts to track your real money performance.</p>
                          <PrimaryButton onClick={() => setCreateLiveDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Live Account
                          </PrimaryButton>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        {filteredLiveAccounts.map((account) => (
                          <AccountCard key={account.id} account={{...account, status: 'active'}} />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}

        {/* Dialogs */}
        <CreateLiveAccountDialog
          open={createLiveDialogOpen}
          onOpenChange={setCreateLiveDialogOpen}
          onSuccess={handleAccountCreated}
        />

        <CreatePropFirmAccountDialog
          open={createPropFirmDialogOpen}
          onOpenChange={setCreatePropFirmDialogOpen}
          onSuccess={handlePropFirmAccountCreated}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={!!selectedAccountForDelete} 
          onOpenChange={(open) => !open && setSelectedAccountForDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('accounts.deleteConfirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('accounts.deleteConfirmDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => selectedAccountForDelete && handleDeleteAccount(selectedAccountForDelete)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('accounts.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
