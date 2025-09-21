'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/lib/translations/client"
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
  Building2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LiveAccountDetailProps {
  params: {
    id: string
  }
}

interface LiveAccountData {
  id: string
  number: string
  name?: string
  broker?: string
  displayName: string
  startingBalance: number
  status: string
  accountType: 'live'
  tradeCount: number
  profitLoss?: number
  lastTradeDate?: string
  createdAt: string
}

export default function LiveAccountDetailPage({ params }: LiveAccountDetailProps) {
  const router = useRouter()
  const t = useI18n()
  const [account, setAccount] = useState<LiveAccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  const accountId = params.id

  // Fetch account data
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch('/api/accounts')
        if (!response.ok) throw new Error('Failed to fetch accounts')
        
        const data = await response.json()
        if (data.success) {
          const foundAccount = data.data.find((acc: LiveAccountData) => 
            acc.id === accountId && acc.accountType === 'live'
          )
          
          if (foundAccount) {
            setAccount(foundAccount)
          } else {
            router.push('/dashboard/accounts')
          }
        }
      } catch (error) {
        console.error('Error fetching account:', error)
        router.push('/dashboard/accounts')
      } finally {
        setIsLoading(false)
      }
    }

    if (accountId) {
      fetchAccount()
    }
  }, [accountId, router])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push('/dashboard/accounts')}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{account.displayName}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{account.broker || 'Live Account'}</span>
                <Badge variant={
                  account.status === 'active' ? 'outline' :
                  account.status === 'funded' ? 'default' :
                  account.status === 'failed' ? 'destructive' : 'secondary'
                } className="text-xs">
                  {account.status?.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/accounts/${accountId}/edit`)}
              size="sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{account.tradeCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">P&L</CardTitle>
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
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-center py-4">
                      Trade activity and performance data will be displayed here
                    </p>
                  </div>
                </CardContent>
              </Card>
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
    </div>
  )
}


