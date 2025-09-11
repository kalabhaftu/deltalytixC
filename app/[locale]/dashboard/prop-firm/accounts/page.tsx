'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { PropFirmDashboard } from "../../components/prop-firm/prop-firm-dashboard"
// Using AccountSummary from prop-firm-dashboard component instead of types file

// Placeholder components for missing imports
const CreateAccountDialog = ({ open, onOpenChange, onSuccess }: any) => {
  const t = useI18n()
  
  if (!open) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Create Account</h2>
        <p className="text-muted-foreground mb-4">
          Account creation dialog will be implemented here.
        </p>
        <div className="flex gap-2 justify-end">
          <button 
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm border rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button 
            onClick={() => {
              onSuccess?.()
              onOpenChange(false)
            }}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

const PropfirmsComparisonTable = () => {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Prop Firms Comparison</h3>
      <p className="text-muted-foreground">
        Prop firms comparison table will be implemented here.
      </p>
    </div>
  )
}

export default function PropFirmAccountsPage() {
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
    router.push(`/dashboard/prop-firm/accounts/${accountId}/payouts`)
  }

  const handleResetAccount = (accountId: string) => {
    router.push(`/dashboard/prop-firm/accounts/${accountId}/reset`)
  }

  const handleCreateAccount = () => {
    setCreateDialogOpen(true)
  }

  const handleCreateSuccess = () => {
    fetchAccounts()
  }

  return (
    <div className="space-y-6">
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
        onSuccess={handleCreateSuccess}
      />

      <PropfirmsComparisonTable />
    </div>
  )
}