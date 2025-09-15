'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Activity,
  AlertTriangle, 
  Shield,
  DollarSign,
  Clock,
  RefreshCw,
  Users,
  TrendingUp,
  Database,
  Play,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PropFirmAdminProps {
  className?: string
}

interface SystemStats {
  accounts: {
    total: number
    active: number
    funded: number
    failed: number
  }
  anchors: {
    total: number
    today: number
    latestDate: string
  }
  lastRunTime: string
}

interface AccountBreach {
  id: string
  accountNumber: string
  breachType: string
  breachAmount: number
  equity: number
  breachTime: string
}

export function PropFirmAdmin({ className }: PropFirmAdminProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null)
  const [recentBreaches, setRecentBreaches] = useState<AccountBreach[]>([])

  // Fetch system statistics
  const fetchSystemStats = async () => {
    try {
      setIsLoading(true)
      // System stats functionality removed - personal use only
      setSystemStats({
        totalAccounts: 0,
        activeAccounts: 0,
        failedAccounts: 0,
        pendingEvaluations: 0
      })
    } catch (error) {
      console.error('Error fetching system stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch recent breaches
  const fetchRecentBreaches = async () => {
    try {
      // This would be a dedicated admin endpoint
      const response = await fetch('/api/admin/prop-firm/breaches?limit=10')
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRecentBreaches(data.data)
        }
      }
    } catch (error) {
      console.error('Error fetching breaches:', error)
    }
  }


  // Load data on mount
  useEffect(() => {
    fetchSystemStats()
    fetchRecentBreaches()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getBreachTypeColor = (type: string) => {
    switch (type) {
      case 'daily_drawdown': return 'bg-orange-500'
      case 'max_drawdown': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Prop Firm Administration</h1>
          <p className="text-muted-foreground">
            Monitor and manage the prop firm evaluation system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSystemStats}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>


      {/* Overview Metrics */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.accounts.total}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                  {systemStats.accounts.funded} Funded
                </span>
                <span className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mr-1" />
                  {systemStats.accounts.active} Active
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {systemStats.accounts.total > 0 
                  ? ((systemStats.accounts.funded / systemStats.accounts.total) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                Accounts reaching funded status
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Anchors</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.anchors.today}</div>
              <p className="text-xs text-muted-foreground">
                Processed today / {systemStats.anchors.total} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed Accounts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemStats.accounts.failed}</div>
              <p className="text-xs text-muted-foreground">
                Breach violations detected
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Information */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breaches">Recent Breaches</TabsTrigger>
          <TabsTrigger value="anchors">Daily Anchors</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Last Anchor Run</span>
                    <span className="text-sm text-muted-foreground">
                      {systemStats?.lastRunTime && formatDate(systemStats.lastRunTime)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Latest Anchor Date</span>
                    <span className="text-sm text-muted-foreground">
                      {systemStats?.anchors.latestDate && 
                        new Date(systemStats.anchors.latestDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {systemStats && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
                        Active Evaluations
                      </span>
                      <span className="font-medium">{systemStats.accounts.active}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                        Funded Accounts
                      </span>
                      <span className="font-medium">{systemStats.accounts.funded}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-red-500 mr-2" />
                        Failed Accounts
                      </span>
                      <span className="font-medium">{systemStats.accounts.failed}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breaches">
          <Card>
            <CardHeader>
              <CardTitle>Recent Breaches</CardTitle>
            </CardHeader>
            <CardContent>
              {recentBreaches.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No recent breaches detected
                </p>
              ) : (
                <div className="space-y-4">
                  {recentBreaches.map((breach) => (
                    <div key={breach.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <Badge className={cn("text-white", getBreachTypeColor(breach.breachType))}>
                          {breach.breachType.replace('_', ' ')}
                        </Badge>
                        <div>
                          <div className="font-medium">{breach.accountNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(breach.breachTime)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-red-600">
                          {formatCurrency(breach.breachAmount)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Equity: {formatCurrency(breach.equity)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anchors">
          <Card>
            <CardHeader>
              <CardTitle>Daily Anchor Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Manual Processing</h4>
                    <p className="text-sm text-muted-foreground">
                      Run daily anchor computation immediately
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Anchors</span>
                    <div className="font-medium">{systemStats?.anchors.total || 0}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Today&apos;s Anchors</span>
                    <div className="font-medium">{systemStats?.anchors.today || 0}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>System Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    System configuration settings would be implemented here for production use.
                    This includes cron schedules, notification settings, and global parameters.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Current Configuration</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Cron Schedule</span>
                      <div className="font-medium">Every hour</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timezone</span>
                      <div className="font-medium">UTC</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

