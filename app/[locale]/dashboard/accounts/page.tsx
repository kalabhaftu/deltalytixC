'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
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
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([])
  const [propFirmAccounts, setPropFirmAccounts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPropFirmLoading, setIsPropFirmLoading] = useState(true)
  const [createLiveDialogOpen, setCreateLiveDialogOpen] = useState(false)
  const [createPropFirmDialogOpen, setCreatePropFirmDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAccountForDelete, setSelectedAccountForDelete] = useState<string | null>(null)

  // Fetch all accounts (live accounts only) with enhanced error handling
  const fetchAccounts = async (retryCount = 0, showToast = true) => {
    const maxRetries = 1 // Reduced retry attempts
    
    try {
      setIsLoading(true)
      
      // Use simplified fetch with shorter timeout
      const response = await fetch('/api/accounts', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Simplified retry logic - only retry once for server errors
        if ((response.status === 503 || response.status === 408) && retryCount < maxRetries) {
          console.warn(`[Accounts] Server error ${response.status}, retrying... (${retryCount + 1}/${maxRetries + 1})`)
          setTimeout(() => fetchAccounts(retryCount + 1, false), 2000)
          return
        }
        
        throw new Error(errorData.error || `Server error (${response.status})`)
      }

      const data = await response.json()
      if (data.success) {
        // Filter to only live accounts (non-prop firm)
        const liveAccounts = data.data.filter((account: UnifiedAccount) => account.accountType === 'live')
        setAccounts(liveAccounts)
        if (retryCount > 0 && showToast) {
          toast({
            title: "Connection Restored",
            description: "Successfully loaded accounts.",
            variant: "default"
          })
        }
      } else {
        throw new Error(data.error || 'Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      
      // Handle network errors with retry logic
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          if (retryCount < 1) {
            console.warn(`[Accounts] Request timeout, retrying... (${retryCount + 1}/2)`)
            setTimeout(() => fetchAccounts(retryCount + 1, false), 3000)
            return
          }
          error.message = 'Request timed out. Please check your internet connection.'
        }
        
        if (error.message.includes('fetch')) {
          if (retryCount < maxRetries) {
            console.warn(`[Accounts] Network error, retrying... (${retryCount + 1}/${maxRetries})`)
            setTimeout(() => fetchAccounts(retryCount + 1, false), Math.pow(2, retryCount) * 2000)
            return
          }
          error.message = 'Network error. Please check your internet connection and try again.'
        }
      }
      
      if (showToast || retryCount >= maxRetries) {
        toast({
          title: t('accounts.toast.fetchError'),
          description: error instanceof Error ? error.message : t('accounts.toast.fetchErrorDescription'),
          variant: "destructive"
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch prop firm accounts with simplified error handling
  const fetchPropFirmAccounts = async (retryCount = 0, showToast = true) => {
    const maxRetries = 1 // Reduced from 3 to 1
    
    try {
      setIsPropFirmLoading(true)
      
      // Use simplified fetch without aggressive timeout
      const response = await fetch('/api/prop-firm/accounts', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        // Simplified error handling with single retry
        if ((response.status === 503 || response.status === 408) && retryCount < maxRetries) {
          console.warn(`[PropFirm] Server error ${response.status}, retrying... (${retryCount + 1}/${maxRetries + 1})`)
          setTimeout(() => fetchPropFirmAccounts(retryCount + 1, false), 2000)
          return
        }
        
        // Map error codes to user-friendly messages
        let errorMessage = errorData.error || `Server error (${response.status})`
        if (errorData.code === 'DB_CONNECTION_ERROR') {
          errorMessage = 'Database temporarily unavailable. Please try again in a few minutes.'
        } else if (errorData.code === 'AUTH_TIMEOUT') {
          errorMessage = 'Authentication service temporarily unavailable. Please refresh the page.'
        } else if (errorData.code === 'REQUEST_TIMEOUT') {
          errorMessage = 'Request timed out. Please check your internet connection and try again.'
        }
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      if (data.success) {
        setPropFirmAccounts(data.data)
        if (retryCount > 0 && showToast) {
          toast({
            title: "Connection Restored",
            description: "Successfully loaded prop firm accounts.",
            variant: "default"
          })
        }
      } else {
        throw new Error(data.error || 'Failed to fetch prop firm accounts')
      }
    } catch (error) {
      console.error('Error fetching prop firm accounts:', error)
      
      // Handle network errors with retry logic
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          if (retryCount < maxRetries) {
            console.warn(`[PropFirm] Request aborted, retrying... (${retryCount + 1}/${maxRetries})`)
            setTimeout(() => fetchPropFirmAccounts(retryCount + 1, false), Math.pow(2, retryCount) * 2000)
            return
          }
          error.message = 'Request timed out. Please check your internet connection.'
        }
        
        if (error.message.includes('fetch')) {
          if (retryCount < maxRetries) {
            console.warn(`[PropFirm] Network error, retrying... (${retryCount + 1}/${maxRetries})`)
            setTimeout(() => fetchPropFirmAccounts(retryCount + 1, false), Math.pow(2, retryCount) * 2000)
            return
          }
          error.message = 'Network error. Please check your internet connection and try again.'
        }
      }
      
      if (showToast || retryCount >= maxRetries) {
        toast({
          title: "Unable to Load Prop Firm Accounts",
          description: error instanceof Error ? error.message : "An unexpected error occurred.",
          variant: "destructive"
        })
      }
    } finally {
      setIsPropFirmLoading(false)
    }
  }

  // Load accounts on mount
  useEffect(() => {
    if (user) {
      fetchAccounts()
      fetchPropFirmAccounts()
    }
  }, [user, fetchAccounts, fetchPropFirmAccounts])

  const handleAccountCreated = () => {
    fetchAccounts()
    setCreateLiveDialogOpen(false)
  }

  const handlePropFirmAccountCreated = () => {
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

      fetchAccounts()
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
    (account.broker && account.broker.toLowerCase().includes(searchQuery.toLowerCase()))
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
                    {account.status}
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 text-sm">
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
                </CardDescription>
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
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  {t('accounts.accountNumber')}
                </div>
                <p className="font-mono text-sm font-medium">{account.number}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <DollarSign className="h-3 w-3" />
                  {t('accounts.startingBalance')}
                </div>
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
                <p className="text-sm font-medium">{account.tradeCount}</p>
              </div>
              {account.profitLoss !== undefined && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    P&L
                  </div>
                  <p className={`text-sm font-semibold ${profitLossColor}`}>
                    ${account.profitLoss.toLocaleString()}
                  </p>
                </div>
              )}
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
                {account.profitTarget && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Target className="h-3 w-3" />
                      {t('accounts.profitTarget')}
                    </div>
                    <p className="text-sm font-medium">${account.profitTarget.toLocaleString()}</p>
                  </div>
                )}
                {account.currentPhase && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Gauge className="h-3 w-3" />
                      {t('accounts.currentPhase')}
                    </div>
                    <p className="text-sm font-medium capitalize">
                      {account.currentPhase.phaseType.replace('_', ' ')}
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
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewAccount(account.id, account.accountType)}
                  className="h-8"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {t('accounts.view')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditAccount(account.id, account.accountType)}
                  className="h-8"
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {t('accounts.edit')}
                </Button>
                {account.accountType === 'prop-firm' && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => router.push(`/dashboard/prop-firm/accounts/${account.id}/trades/new`)}
                    className="h-8"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('accounts.addTrade')}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  if (isLoading || isPropFirmLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t('accounts.title')}</h1>
              <p className="text-muted-foreground">{t('accounts.description')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('accounts.title')}</h1>
            <p className="text-muted-foreground">Manage your trading accounts and prop firm evaluations</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => {
                fetchAccounts()
                fetchPropFirmAccounts()
              }}
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh All
            </Button>
          </div>
        </div>

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
                  <Button onClick={() => setCreatePropFirmDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Prop Firm Account
                  </Button>
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
                <div className="flex items-center justify-between">
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
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search accounts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
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
                      <Button 
                        variant="outline" 
                        onClick={() => setCreatePropFirmDialogOpen(true)}
                        size="sm"
                      >
                        <Building2 className="h-4 w-4 mr-2" />
                        Add Prop Firm Account
                      </Button>
                    </div>
                    
                    {propFirmAccounts.length === 0 ? (
                      <Card className="text-center py-16">
                        <CardContent>
                          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                          <h3 className="text-xl font-semibold mb-3">No Prop Firm Accounts</h3>
                          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Start your prop firm evaluation journey by creating your first account.</p>
                          <Button onClick={() => setCreatePropFirmDialogOpen(true)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Create Prop Firm Account
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      <Button onClick={() => setCreateLiveDialogOpen(true)} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Live Account
                      </Button>
                    </div>
                    
                    {filteredLiveAccounts.length === 0 ? (
                      <Card className="text-center py-16">
                        <CardContent>
                          <User className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
                          <h3 className="text-xl font-semibold mb-3">No Live Accounts</h3>
                          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Add your live trading accounts to track your real money performance.</p>
                          <Button onClick={() => setCreateLiveDialogOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Live Account
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filteredLiveAccounts.map((account) => (
                          <AccountCard key={account.id} account={account} />
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
