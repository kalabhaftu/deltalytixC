'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft,
  RefreshCw,
  Settings,
  User,
  DollarSign,
  Activity,
  TrendingUp,
  Calendar,
  Building2,
  Plus,
  Minus
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EditLiveAccountDialog } from "@/components/edit-live-account-dialog"
import { TransactionDialog } from "@/app/dashboard/components/accounts/transaction-dialog"
import { TransactionHistory } from "@/app/dashboard/components/accounts/transaction-history"

interface LiveAccountData {
  id: string
  number: string
  name?: string
  broker?: string
  displayName: string
  startingBalance: number
  currentEquity?: number
  status: string
  accountType: 'live'
  tradeCount: number
  profitLoss?: number
  lastTradeDate?: string
  createdAt: string
}

export default function LiveAccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [account, setAccount] = useState<LiveAccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshKey, setRefreshKey] = useState(0)

  const accountId = params.id as string

  // Fetch account data with calculated metrics
  const fetchAccountData = useCallback(async () => {
    try {
      setIsLoading(true)
      // Fetch account details with calculated metrics from enhanced endpoint
      const response = await fetch(`/api/accounts/${accountId}?t=${Date.now()}`, {
        cache: 'no-store'
      })
      if (!response.ok) {
        throw new Error('Failed to fetch account')
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch account data')
      }

      const accountData = data.data
      
      if (!accountData || accountData.accountType !== 'live') {
        router.push('/dashboard/accounts')
        return
      }

      setAccount(accountData)
    } catch (error) {
      router.push('/dashboard/accounts')
    } finally {
      setIsLoading(false)
    }
  }, [accountId, router])

  useEffect(() => {
    if (accountId) {
      fetchAccountData()
    }
  }, [accountId, refreshKey, fetchAccountData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/accounts')}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="h-8 bg-muted rounded w-64 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-32 mt-2 animate-pulse"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Account Not Found</h1>
          <Button onClick={() => router.push('/dashboard/accounts')}>
            Return to Accounts
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/accounts')}
              className="w-fit"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={
                account.status === 'active' ? 'outline' :
                account.status === 'funded' ? 'default' :
                account.status === 'failed' ? 'destructive' : 'secondary'
              } className="text-xs">
                {account.status?.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground hidden sm:inline">•</span>
              <span className="text-sm text-muted-foreground">{account.broker || 'Live Account'}</span>
              <span className="text-sm text-muted-foreground hidden sm:inline">•</span>
              <span className="text-xs sm:text-sm text-muted-foreground truncate">
                ID: {account.id}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="w-fit"
            >
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="w-fit"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Account Number</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">{account.number}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Starting Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(account.startingBalance)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Equity</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                (account.currentEquity || 0) >= account.startingBalance ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(account.currentEquity || account.startingBalance)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{account.tradeCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net P&L</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                (account.profitLoss || 0) >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatCurrency(account.profitLoss || 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trades">Trades</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Account Type</label>
                      <p className="text-sm font-semibold">Live Account</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Broker</label>
                      <p className="text-sm font-semibold">{account.broker || 'Not specified'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Created</label>
                      <p className="text-sm font-semibold">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Last Trade</label>
                      <p className="text-sm font-semibold">
                        {account.lastTradeDate ? 
                          new Date(account.lastTradeDate).toLocaleDateString() : 
                          'No trades yet'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Account Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TransactionDialog
                      accountId={account.id}
                      accountNumber={account.number}
                      currentBalance={account.currentEquity || 0}
                      onTransactionComplete={() => {
                        // Refresh account data by incrementing refresh key
                        setRefreshKey(prev => prev + 1)
                      }}
                    >
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Deposit
                      </Button>
                    </TransactionDialog>

                    <TransactionDialog
                      accountId={account.id}
                      accountNumber={account.number}
                      currentBalance={account.currentEquity || 0}
                      onTransactionComplete={() => {
                        // Refresh account data by incrementing refresh key
                        setRefreshKey(prev => prev + 1)
                      }}
                    >
                      <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
                        <Minus className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    </TransactionDialog>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>Deposit:</strong> Minimum $5.00<br />
                      <strong>Withdrawal:</strong> Minimum $10.00
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6">
              <TransactionHistory accountId={account.id} key={refreshKey} />
            </div>
          </TabsContent>

          <TabsContent value="trades">
            <Card>
              <CardHeader>
                <CardTitle>All Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Trade management interface for live accounts will be implemented here.
                  This will show all trades for account {account.number}.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Performance charts and analytics for this live account will be displayed here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Account configuration and settings will be available here.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Account Dialog */}
      <EditLiveAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={account}
        onSuccess={() => {
          // Refresh the page to get updated account data
          window.location.reload()
        }}
      />
    </div>
  )
}


