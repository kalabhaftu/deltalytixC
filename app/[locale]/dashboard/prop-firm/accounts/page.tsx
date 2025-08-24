'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowLeft,
  RefreshCw,
  DollarSign,
  Target,
  Shield,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from "lucide-react"
import { useRouter } from 'next/navigation'
import { CreateAccountDialog } from "@/components/prop-firm/create-account-dialog"
import { ComparisonTable } from "@/components/accounts/propfirms-comparison-table"
import { cn } from "@/lib/utils"
import { AccountStatus } from "@/types/prop-firm"

interface AccountData {
  id: string
  number: string
  name?: string
  propfirm: string
  status: AccountStatus
  currentEquity: number
  currentBalance: number
  dailyDrawdownRemaining: number
  maxDrawdownRemaining: number
  profitTargetProgress: number
  totalTrades: number
  totalPayouts: number
  hasRecentBreach: boolean
  createdAt: string
  updatedAt: string
}

export default function AccountsPage() {
  const router = useRouter()
  const t = useI18n()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('accounts')

  // Fetch accounts
  const fetchAccounts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/prop-firm/accounts')
      
      if (!response.ok) {
        throw new Error('Failed to fetch accounts')
      }

      const data = await response.json()
      if (data.success) {
        setAccounts(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      toast({
        title: 'Failed to fetch accounts',
        description: 'An error occurred while fetching accounts',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load accounts on mount
  useEffect(() => {
    if (user) {
      fetchAccounts()
    }
  }, [user])

  const getStatusColor = (status: AccountStatus) => {
    switch (status) {
      case 'active': return 'bg-blue-500'
      case 'funded': return 'bg-green-500'
      case 'failed': return 'bg-red-500'
      case 'passed': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Filter accounts based on search term
  const filteredAccounts = accounts.filter(account =>
    account.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (account.name && account.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    account.propfirm.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard/prop-firm')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Accounts</h1>
            <p className="text-muted-foreground">Manage your prop firm accounts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAccounts}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Account
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts">Accounts</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          {/* Accounts Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'No results found' : 'No accounts found'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Try a different search term' : 'Create your first account'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAccounts.map((account) => (
                <Card key={account.id} className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => router.push(`/dashboard/prop-firm/accounts/${account.id}`)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {account.name || account.number}
                      </CardTitle>
                      <Badge className={cn("text-white", getStatusColor(account.status))}>
                        {account.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{account.propfirm}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Balance and Equity */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Balance</p>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{formatCurrency(account.currentBalance)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Equity</p>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{formatCurrency(account.currentEquity)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Drawdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Daily Drawdown</p>
                        <div className={cn("flex items-center gap-1", 
                          account.dailyDrawdownRemaining < 500 ? "text-red-600" : "text-green-600"
                        )}>
                          <Shield className="h-3 w-3" />
                          <span className="font-medium">{formatCurrency(account.dailyDrawdownRemaining)}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Max Drawdown</p>
                        <div className={cn("flex items-center gap-1",
                          account.maxDrawdownRemaining < 1000 ? "text-red-600" : "text-green-600"
                        )}>
                          <Shield className="h-3 w-3" />
                          <span className="font-medium">{formatCurrency(account.maxDrawdownRemaining)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Profit Target</span>
                        <span>{formatPercentage(account.profitTargetProgress)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(account.profitTargetProgress, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{account.totalTrades} trades</span>
                      <span>{account.totalPayouts} payouts</span>
                    </div>

                    {/* Warning for breaches */}
                    {account.hasRecentBreach && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Recent breach detected</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="compare">
          <ComparisonTable />
        </TabsContent>
      </Tabs>

      {/* Create Account Dialog */}
      <CreateAccountDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchAccounts}
      />
    </div>
  )
}