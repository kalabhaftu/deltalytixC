'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  BarChart3,
  FileText,
  Download
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AccountStatus, PhaseType } from "@/types/prop-firm"

interface TradeData {
  id: string
  symbol: string
  direction: 'long' | 'short'
  entryPrice: number
  exitPrice?: number
  quantity: number
  entryTime: string
  exitTime?: string
  pnl: number
  status: 'open' | 'closed'
  fees?: number
  strategy?: string
  notes?: string
}

interface AccountData {
  id: string
  number: string
  name?: string
  propfirm: string
  status: AccountStatus
  currentEquity: number
  currentBalance: number
}

export default function AccountTradesPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [trades, setTrades] = useState<TradeData[]>([])
  const [account, setAccount] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('trades')

  const accountId = params.id as string

  // Fetch account details
  const fetchAccount = async () => {
    try {
      const response = await fetch(`/api/prop-firm/accounts/${accountId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch account details')
      }

      const data = await response.json()
      if (data.success) {
        setAccount(data.data.account)
      } else {
        throw new Error(data.error || 'Failed to fetch account details')
      }
    } catch (error) {
      console.error('Error fetching account details:', error)
      toast({
        title: 'Failed to fetch account details',
        description: 'An error occurred while fetching account details',
        variant: "destructive"
      })
    }
  }

  // Fetch trades
  const fetchTrades = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/prop-firm/accounts/${accountId}/trades`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch trades')
      }

      const data = await response.json()
      if (data.success) {
        setTrades(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch trades')
      }
    } catch (error) {
      console.error('Error fetching trades:', error)
      toast({
        title: 'Failed to fetch trades',
        description: 'An error occurred while fetching trades',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    if (user && accountId) {
      fetchAccount()
      fetchTrades()
    }
  }, [user, accountId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Filter trades based on search term
  const filteredTrades = trades.filter(trade =>
    trade.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (trade.strategy && trade.strategy.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Calculate trade statistics
  const totalTrades = trades.length
  const winningTrades = trades.filter(trade => trade.pnl > 0).length
  const losingTrades = trades.filter(trade => trade.pnl < 0).length
  const breakEvenTrades = trades.filter(trade => trade.pnl === 0).length
  // Calculate win rate excluding break-even trades (industry standard)
  const tradableTradesCount = winningTrades + losingTrades
  const winRate = tradableTradesCount > 0 ? (winningTrades / tradableTradesCount) * 100 : 0
  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0)

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ArrowLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Account Not Found</h3>
            <p className="text-muted-foreground">The requested account could not be found.</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Trades</h1>
            <p className="text-muted-foreground">
              {account.name || account.number} • {account.propfirm}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTrades}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/new`)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Trade
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrades}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {winningTrades} wins / {losingTrades} losses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", totalPnl >= 0 ? "text-green-600" : "text-red-600")}>
              {formatCurrency(totalPnl)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search trades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="trades">All Trades</TabsTrigger>
          <TabsTrigger value="open">Open Positions</TabsTrigger>
          <TabsTrigger value="closed">Closed Trades</TabsTrigger>
        </TabsList>

        <TabsContent value="trades">
          {/* Trades List */}
          {filteredTrades.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'No trades found' : 'No trades yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Try a different search term' : 'Add your first trade to get started'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/new`)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Trade
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTrades.map((trade) => (
                <Card key={trade.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold">{trade.symbol}</h3>
                          <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
                            {trade.direction.toUpperCase()}
                          </Badge>
                          <Badge variant={trade.status === 'open' ? 'outline' : 'default'}>
                            {trade.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Entry Price</p>
                            <p className="font-medium">{formatCurrency(trade.entryPrice)}</p>
                          </div>
                          
                          {trade.exitPrice && (
                            <div>
                              <p className="text-xs text-muted-foreground">Exit Price</p>
                              <p className="font-medium">{formatCurrency(trade.exitPrice)}</p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Quantity</p>
                            <p className="font-medium">{trade.quantity}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">P&L</p>
                            <p className={cn("font-medium", trade.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                              {formatCurrency(trade.pnl)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Entry: {formatDateTime(trade.entryTime)}</span>
                          </div>
                          
                          {trade.exitTime && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Exit: {formatDateTime(trade.exitTime)}</span>
                            </div>
                          )}
                        </div>
                        
                        {trade.strategy && (
                          <div>
                            <p className="text-xs text-muted-foreground">Strategy</p>
                            <p className="text-sm">{trade.strategy}</p>
                          </div>
                        )}
                        
                        {trade.notes && (
                          <div>
                            <p className="text-xs text-muted-foreground">Notes</p>
                            <p className="text-sm">{trade.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/${trade.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="open">
          {/* Open Positions */}
          {(() => {
            const openTrades = filteredTrades.filter(trade => trade.status === 'open')
            return openTrades.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No open positions</h3>
                  <p className="text-muted-foreground">You don&apos;t have any open trades at the moment.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {openTrades.map((trade) => (
                  <Card key={trade.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{trade.symbol}</h3>
                            <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
                              {trade.direction.toUpperCase()}
                            </Badge>
                            <Badge variant="outline">Open</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Entry Price</p>
                              <p className="font-medium">{formatCurrency(trade.entryPrice)}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-muted-foreground">Quantity</p>
                              <p className="font-medium">{trade.quantity}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-muted-foreground">Unrealized P&L</p>
                              <p className={cn("font-medium", trade.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                                {formatCurrency(trade.pnl)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Entry: {formatDateTime(trade.entryTime)}</span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/${trade.id}/edit`)}
                          >
                            Close Position
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/${trade.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })()}
        </TabsContent>

        <TabsContent value="closed">
          {/* Closed Trades */}
          {(() => {
            const closedTrades = filteredTrades.filter(trade => trade.status === 'closed')
            return closedTrades.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center h-64">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No closed trades</h3>
                  <p className="text-muted-foreground">You don&apos;t have any closed trades yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {closedTrades.map((trade) => (
                  <Card key={trade.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold">{trade.symbol}</h3>
                            <Badge variant={trade.direction === 'long' ? 'default' : 'secondary'}>
                              {trade.direction.toUpperCase()}
                            </Badge>
                            <Badge variant="default">Closed</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground">Entry Price</p>
                              <p className="font-medium">{formatCurrency(trade.entryPrice)}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-muted-foreground">Exit Price</p>
                              <p className="font-medium">{formatCurrency(trade.exitPrice || 0)}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-muted-foreground">Quantity</p>
                              <p className="font-medium">{trade.quantity}</p>
                            </div>
                            
                            <div>
                              <p className="text-xs text-muted-foreground">P&L</p>
                              <p className={cn("font-medium", trade.pnl >= 0 ? "text-green-600" : "text-red-600")}>
                                {formatCurrency(trade.pnl)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Entry: {formatDateTime(trade.entryTime)}</span>
                            </div>
                            
                            {trade.exitTime && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>Exit: {formatDateTime(trade.exitTime)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/${trade.id}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          })()}
        </TabsContent>
      </Tabs>
    </div>
  )
}