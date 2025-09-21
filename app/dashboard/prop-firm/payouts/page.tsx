'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/lib/translations/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  ArrowLeft,
  RefreshCw,
  DollarSign,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react"
import { useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"

interface PayoutData {
  id: string
  accountId: string
  accountNumber: string
  amountRequested: number
  amountPaid: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  requestedAt: string
  paidAt?: string
  notes?: string
}

export default function PayoutsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [payouts, setPayouts] = useState<PayoutData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch payouts
  const fetchPayouts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/prop-firm-v2/accounts')
      
      if (!response.ok) {
        throw new Error('Failed to fetch payouts')
      }

      const data = await response.json()
      if (data.success) {
        // Extract payouts from all accounts
        const allPayouts = data.data.flatMap((account: any) => 
          account.payouts ? account.payouts.map((payout: any) => ({
            ...payout,
            accountNumber: account.number,
            accountName: account.name
          })) : []
        )
        setPayouts(allPayouts)
      } else {
        throw new Error(data.error || 'Failed to fetch payouts')
      }
    } catch (error) {
      console.error('Error fetching payouts:', error)
      toast({
        title: 'Failed to fetch payouts',
        description: 'An error occurred while fetching payouts',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load payouts on mount
  useEffect(() => {
    if (user) {
      fetchPayouts()
    }
  }, [user])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'approved': return 'bg-blue-500'
      case 'paid': return 'bg-green-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'paid': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  // Filter payouts based on search term
  const filteredPayouts = payouts.filter(payout =>
    payout.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payout.status.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-bold">Payouts</h1>
            <p className="text-muted-foreground">Manage your prop firm payouts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayouts}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Search payouts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Payouts List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredPayouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm ? 'No results found' : 'No payouts found'}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try a different search term' : 'You have not requested any payouts yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPayouts.map((payout) => (
            <Card key={payout.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">Account {payout.accountNumber}</h3>
                      <Badge className={cn("text-white", getStatusColor(payout.status))}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(payout.status)}
                          <span className="capitalize">{payout.status}</span>
                        </div>
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Requested</p>
                          <p className="font-medium">{formatCurrency(payout.amountRequested)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Paid</p>
                          <p className="font-medium">{formatCurrency(payout.amountPaid)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Requested Date</p>
                          <p className="font-medium">{formatDate(payout.requestedAt)}</p>
                        </div>
                      </div>
                    </div>
                    
                    {payout.paidAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Paid Date</p>
                          <p className="font-medium">{formatDate(payout.paidAt)}</p>
                        </div>
                      </div>
                    )}
                    
                    {payout.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground">Notes</p>
                        <p className="text-sm">{payout.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push(`/dashboard/prop-firm/payouts/${payout.id}`)}
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
    </div>
  )
}