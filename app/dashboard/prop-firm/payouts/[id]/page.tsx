'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useI18n } from "@/lib/translations/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft,
  RefreshCw,
  DollarSign,
  Calendar,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2
} from "lucide-react"
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

export default function PayoutDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [payout, setPayout] = useState<PayoutData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const payoutId = params.id as string

  // Fetch payout details
  const fetchPayout = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/prop-firm/payouts/${payoutId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch payout details')
      }

      const data = await response.json()
      if (data.success) {
        setPayout(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch payout details')
      }
    } catch (error) {
      console.error('Error fetching payout details:', error)
      toast({
        title: 'Failed to fetch payout details',
        description: 'An error occurred while fetching payout details',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load payout on mount
  useEffect(() => {
    if (user && payoutId) {
      fetchPayout()
    }
  }, [user, payoutId])

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

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!payout) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payout Not Found</h3>
            <p className="text-muted-foreground">The requested payout could not be found.</p>
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
            onClick={() => router.push('/dashboard/prop-firm/payouts')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payout Details</h1>
            <p className="text-muted-foreground">View and manage payout information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPayout}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Payout Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payout Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge className={cn("text-white", getStatusColor(payout.status))}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(payout.status)}
                  <span className="capitalize">{payout.status}</span>
                </div>
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Account</span>
              <span className="font-medium">{payout.accountNumber}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Requested Amount</span>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatCurrency(payout.amountRequested)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Paid Amount</span>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatCurrency(payout.amountPaid)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Requested Date</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatDate(payout.requestedAt)}</span>
              </div>
            </div>
            
            {payout.paidAt && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Paid Date</span>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatDate(payout.paidAt)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {payout.notes ? (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                <p className="text-sm">{payout.notes}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No additional information available</p>
              </div>
            )}
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Actions</h4>
              <div className="flex flex-wrap gap-2">
                {payout.status === 'pending' && (
                  <>
                    <Button size="sm">Approve</Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                      Reject
                    </Button>
                  </>
                )}
                {payout.status === 'approved' && (
                  <Button size="sm">Mark as Paid</Button>
                )}
                <Button size="sm" variant="outline">Download Receipt</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Related Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Account {payout.accountNumber}</h3>
              <p className="text-muted-foreground">View account details and trading history</p>
            </div>
            <Button onClick={() => router.push(`/dashboard/prop-firm/accounts/${payout.accountId}`)}>
              View Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}