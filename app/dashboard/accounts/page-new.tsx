'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { useAccounts } from "@/hooks/use-accounts"
import { useAccountFilterSettings } from '@/hooks/use-account-filter-settings'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// Types
interface Account {
  id: string
  name?: string
  number: string
  displayName?: string
  accountType: 'live' | 'prop-firm'
  broker?: string
  propfirm?: string
  startingBalance?: number
  currentBalance?: number
  currentEquity?: number
  tradeCount?: number
  status?: 'active' | 'funded' | 'failed' | 'passed'
  currentPhase?: number
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

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'live' | 'prop-firm'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'funded' | 'failed'>('all')
  const [createLiveDialogOpen, setCreateLiveDialogOpen] = useState(false)
  const [createPropFirmDialogOpen, setCreatePropFirmDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Derived data - filter accounts for display (this includes failed accounts for filtering)
  const searchFilteredAccounts = accounts.filter(account => {
    const matchesSearch = !searchQuery || 
      account.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.broker?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.propfirm?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesType = filterType === 'all' || account.accountType === filterType
    const matchesStatus = filterStatus === 'all' || account.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  // Get active accounts for statistics (excludes failed and passed accounts)
  // Get filtered accounts based on user's filter settings
  const { settings: accountFilterSettings } = useAccountFilterSettings()
  
  const filteredAccounts = useMemo(() => {
    if (accountFilterSettings.showMode === 'all-accounts') {
      return accounts // Show all accounts
    }
    
    if (accountFilterSettings.showMode === 'active-only') {
      // Default: exclude failed and passed accounts
      return accounts.filter(account => 
        account.status !== 'failed' && account.status !== 'passed'
      )
    }
    
    // Custom filtering
    return accounts.filter(account => {
      // Filter by account type
      if (account.accountType === 'live' && !accountFilterSettings.showLiveAccounts) {
        return false
      }
      
      if (account.accountType === 'prop-firm' && !accountFilterSettings.showPropFirmAccounts) {
        return false
      }
      
      // Filter by status
      if (account.status === 'failed' && !accountFilterSettings.showFailedAccounts) {
        return false
      }
      
      if (account.status === 'passed' && !accountFilterSettings.showPassedAccounts) {
        return false
      }
      
      if (account.status && !accountFilterSettings.includeStatuses.includes(account.status)) {
        return false
      }
      
      return true
    })
  }, [accounts, accountFilterSettings])

  const accountStats = {
    total: filteredAccounts.length, // Count based on user's filter settings
    live: filteredAccounts.filter(a => a.accountType === 'live').length,
    propFirm: filteredAccounts.filter(a => a.accountType === 'prop-firm').length,
    active: filteredAccounts.filter(a => a.status === 'active').length,
    funded: filteredAccounts.filter(a => a.accountType === 'prop-firm' && (a.currentPhase || 1) >= 3).length,
    totalEquity: filteredAccounts.reduce((sum, a) => sum + (a.currentEquity || a.currentBalance || a.startingBalance || 0), 0)
  }

  // Handlers
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await refetchAccounts()
      toast({
        title: "Accounts refreshed",
        description: "All account data has been updated",
      })
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh account data",
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [refetchAccounts])

  const handleAccountCreated = useCallback(() => {
    refetchAccounts()
    setCreateLiveDialogOpen(false)
    setCreatePropFirmDialogOpen(false)
  }, [refetchAccounts])

  const handleViewAccount = useCallback((account: Account) => {
    if (account.accountType === 'prop-firm') {
      router.push(`/dashboard/prop-firm/accounts/${account.id}`)
    } else {
      router.push(`/dashboard?account=${account.id}`)
    }
  }, [router])

  if (isLoading) {
    return <AccountsLoadingSkeleton />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Trading Accounts
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Manage your trading accounts and track performance
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-10"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
                Refresh
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
            icon={<Activity className="h-5 w-5" />}
            color="blue"
          />
          <StatsCard
            title="Live Accounts"
            value={accountStats.live}
            icon={<User className="h-5 w-5" />}
            color="green"
          />
          <StatsCard
            title="Prop Firm Accounts"
            value={accountStats.propFirm}
            icon={<Building2 className="h-5 w-5" />}
            color="purple"
          />
          <StatsCard
            title="Total Equity"
            value={formatCurrency(accountStats.totalEquity)}
            icon={<DollarSign className="h-5 w-5" />}
            color="emerald"
          />
        </motion.div>

        {/* Filters and Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="funded">Funded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
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
              <AnimatePresence mode="popLayout">
                {filteredAccounts.map((account, index) => (
                  <motion.div
                    key={account.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AccountCard 
                      account={account} 
                      onView={() => handleViewAccount(account)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Dialogs */}
        <EnhancedCreateLiveAccountDialog
          open={createLiveDialogOpen}
          onOpenChange={setCreateLiveDialogOpen}
          onSuccess={handleAccountCreated}
        />
        
        <CreatePropFirmAccountDialog
          open={createPropFirmDialogOpen}
          onOpenChange={setCreatePropFirmDialogOpen}
          onSuccess={handleAccountCreated}
        />
      </div>
    </div>
  )
}

// Components
function StatsCard({ 
  title, 
  value, 
  icon, 
  color 
}: { 
  title: string
  value: string | number
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple' | 'emerald'
}) {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    purple: 'bg-purple-500 text-white',
    emerald: 'bg-emerald-500 text-white'
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </p>
          </div>
          <div className={cn("p-3 rounded-full", colorClasses[color])}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AccountCard({ account, onView }: { account: Account; onView: () => void }) {
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
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-0 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {account.accountType === 'prop-firm' ? (
                <Building2 className="h-4 w-4 text-secondary-foreground" />
              ) : (
                <User className="h-4 w-4 text-primary" />
              )}
              <h3 className="font-semibold text-foreground truncate">
                {account.displayName || account.name || account.number}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {account.accountType === 'prop-firm' ? account.propfirm : account.broker}
            </p>
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
                <DropdownMenuItem>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Information */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Balance</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(account.currentBalance || account.currentEquity || account.startingBalance || 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Trades</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {account.tradeCount || 0}
            </p>
          </div>
        </div>

        {/* Prop Firm Specific Info */}
        {account.accountType === 'prop-firm' && (
          <div className="space-y-3">
            {account.currentPhase && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Phase</span>
                <Badge
                  variant={
                    account.currentPhase >= 3 ? 'default' :
                    account.currentPhase === 2 ? 'secondary' :
                    'outline'
                  }
                  className="text-xs"
                >
                  {account.currentPhase >= 3 ? 'FUNDED' :
                   account.currentPhase === 2 ? 'PHASE 2' :
                   'PHASE 1'}
                </Badge>
              </div>
            )}
            
            {account.profitTargetProgress !== undefined && account.currentPhase < 3 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Profit Target</span>
                  <span className="text-xs font-medium">{account.profitTargetProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, account.profitTargetProgress))}%` }}
                  />
                </div>
              </div>
            )}

            {isAtRisk && (
              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-xs text-red-700 dark:text-red-300 font-medium">
                  Approaching drawdown limit
                </span>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <Button 
          onClick={onView} 
          className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Account
        </Button>
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
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No accounts found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
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
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-full p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
            <Activity className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Welcome to Your Trading Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Get started by adding your first trading account to track performance and analyze your trades
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onCreateLive} size="lg" className="bg-blue-500 hover:bg-blue-600">
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <LoadingSkeleton className="h-10 w-64 mb-2" />
          <LoadingSkeleton className="h-6 w-96" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-24" />
          ))}
        </div>
        
        <LoadingSkeleton className="h-16 mb-8" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    </div>
  )
}

// Utilities
function formatCurrency(amount: number): string {
  if (!isFinite(amount) || isNaN(amount)) return '$0.00'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}





