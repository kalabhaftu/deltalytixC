'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useI18n } from "@/lib/translations/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from 'lucide-react'
import ImportTradesCard from '@/app/dashboard/components/import/import-trades-card'

interface AccountData {
  id: string
  number: string
  name?: string
  propfirm: string
  startingBalance: number
  status: string
  currentPhase?: {
    id: string
    phaseType: string
    phaseStatus: string
    currentEquity: number
  }
}

export default function NewTradePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const t = useI18n()
  const [account, setAccount] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
         title: t('propFirm.trade.new.fetchError'),
         description: t('propFirm.trade.new.fetchErrorDescription'),
         variant: "destructive"
       })
    } finally {
      setIsLoading(false)
    }
  }

  // Load account on mount
  useEffect(() => {
    if (user && accountId) {
      fetchAccount()
    }
  }, [user, accountId])

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('propFirm.trade.new.loading')}</p>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ArrowLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('propFirm.trade.new.accountNotFound')}</h3>
          <p className="text-muted-foreground">{t('propFirm.trade.new.accountNotFoundDescription')}</p>
          <Button onClick={() => router.back()} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('propFirm.trade.new.goBack')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('propFirm.trade.new.backToTrades')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Import Trades</h1>
              <p className="text-muted-foreground">
                {account.name || account.number} • {account.propfirm}
              </p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t('propFirm.trade.new.accountInfo')}</CardTitle>
            <CardDescription>{t('propFirm.trade.new.accountInfoDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-0">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t('propFirm.trade.new.accountNumber')}</Label>
              <p className="text-lg font-semibold">{account.number}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t('propFirm.trade.new.status')}</Label>
              <p className="text-lg font-semibold capitalize">{account.status}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">{t('propFirm.trade.new.currentPhase')}</Label>
              <p className="text-lg font-semibold capitalize">
                {account.currentPhase?.phaseType?.replace('_', ' ') || t('propFirm.trade.new.noActivePhase')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Import Trades Card */}
        <ImportTradesCard accountId={accountId} />
      </div>
    </div>
  )
}
