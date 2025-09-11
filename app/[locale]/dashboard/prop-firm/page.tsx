'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { PropFirmDashboard } from "../components/prop-firm/prop-firm-dashboard"
import { CreateAccountDialog } from "../components/prop-firm/create-account-dialog"
// Using AccountSummary from prop-firm-dashboard component instead of types file

export default function PropFirmPage() {
  const t = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

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
      console.error('Error fetching prop firm accounts:', error)
      toast({
        title: t('propFirm.toast.setupError'),
        description: t('propFirm.toast.setupErrorDescription'),
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

  // Handle account actions
  const handleViewAccount = (accountId: string) => {
    router.push(`/dashboard/prop-firm/accounts/${accountId}`)
  }

  const handleAddTrade = (accountId: string) => {
    router.push(`/dashboard/prop-firm/accounts/${accountId}/trades/new`)
  }

  const handleRequestPayout = (accountId: string) => {
    router.push(`/dashboard/prop-firm/accounts/${accountId}/payouts/new`)
  }

  const handleResetAccount = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
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
        fetchAccounts() // Reload accounts
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

  const handleCreateAccount = () => {
    setCreateDialogOpen(true)
  }

  const handleAccountCreated = () => {
    setCreateDialogOpen(false)
    fetchAccounts() // Reload accounts
  }

  return (
    <div className="container mx-auto p-6">
      <PropFirmDashboard
        accounts={accounts}
        isLoading={isLoading}
        onRefresh={fetchAccounts}
        onCreateAccount={handleCreateAccount}
        onViewAccount={handleViewAccount}
        onAddTrade={handleAddTrade}
        onRequestPayout={handleRequestPayout}
        onResetAccount={handleResetAccount}
      />

      <CreateAccountDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleAccountCreated}
      />
    </div>
  )
}
