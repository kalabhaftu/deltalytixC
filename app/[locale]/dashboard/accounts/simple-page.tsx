'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { useAccounts } from "@/hooks/use-accounts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Settings, MoreHorizontal, RefreshCw } from "lucide-react"
// import { SimplifiedAccountOverview } from "./components/accounts/simplified-account-overview"
// import { CreateLiveAccountDialog } from "./components/accounts/create-live-account-dialog"
// import { CreateAccountDialog as CreatePropFirmAccountDialog } from "./components/prop-firm/create-account-dialog"
import { PrimaryButton, SecondaryButton } from "@/components/ui/button-styles"
import { AccessibleText, AccessibleDescription } from "@/components/ui/accessible-text"
import { LoadingSkeleton } from "@/components/ui/loading"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function SimpleAccountsPage() {
  const t = useI18n()
  const router = useRouter()
  const { user } = useAuth()
  
  const { accounts, isLoading, refetch } = useAccounts()
  const [createLiveDialogOpen, setCreateLiveDialogOpen] = useState(false)
  const [createPropFirmDialogOpen, setCreatePropFirmDialogOpen] = useState(false)
  const [showAdvancedView, setShowAdvancedView] = useState(false)

  // Transform accounts for simplified view
  const simplifiedAccounts = accounts.map(account => ({
    id: account.id,
    name: account.displayName || account.number,
    type: account.accountType as 'prop-firm' | 'live',
    status: 'active', // Default status since property doesn't exist
    balance: account.startingBalance || 0,
    pnl: 0, // Default PnL since property doesn't exist
    trades: account.tradeCount || 0
  }))

  const handleCreateAccount = (type: 'prop-firm' | 'live') => {
    // Temporarily redirect to main accounts page until dialog components are available
    if (type === 'prop-firm') {
      router.push('/dashboard/prop-firm/accounts?create=true')
    } else {
      router.push('/dashboard/accounts?create=true')
    }
  }

  const handleViewAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (account?.accountType === 'prop-firm') {
      router.push(`/dashboard/prop-firm/accounts/${accountId}`)
    } else {
      router.push(`/dashboard?account=${accountId}`)
    }
  }

  const handleAccountCreated = () => {
    refetch()
    setCreateLiveDialogOpen(false)
    setCreatePropFirmDialogOpen(false)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Accounts</h1>
              <AccessibleDescription>Loading your trading accounts...</AccessibleDescription>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <LoadingSkeleton key={i} variant="card" />
            ))}
          </div>
          <LoadingSkeleton variant="card" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Trading Accounts</h1>
            <AccessibleDescription>
              {accounts.length === 0 
                ? "Start by creating your first trading account"
                : `Managing ${accounts.length} trading account${accounts.length !== 1 ? 's' : ''}`
              }
            </AccessibleDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <SecondaryButton 
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </SecondaryButton>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAdvancedView(!showAdvancedView)}>
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdvancedView ? 'Simple View' : 'Advanced View'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/dashboard/accounts')}>
                  Full Account Manager
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Content */}
        {accounts.length === 0 ? (
          // First-time user experience
          <Card className="text-center py-16">
            <CardContent>
              <div className="max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-3">Welcome to Deltalytix</h2>
                <AccessibleDescription className="mb-8">
                  To get started, create your first trading account. You can add prop firm evaluation accounts or live trading accounts.
                </AccessibleDescription>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" 
                        onClick={() => handleCreateAccount('prop-firm')}>
                    <h3 className="font-medium mb-2">Prop Firm Account</h3>
                    <AccessibleDescription className="text-xs mb-4">
                      Track evaluation progress and funded account performance
                    </AccessibleDescription>
                    <PrimaryButton size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Prop Firm Account
                    </PrimaryButton>
                  </Card>
                  
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleCreateAccount('live')}>
                    <h3 className="font-medium mb-2">Live Account</h3>
                    <AccessibleDescription className="text-xs mb-4">
                      Monitor your personal trading account performance
                    </AccessibleDescription>
                    <SecondaryButton size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Live Account
                    </SecondaryButton>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Simple accounts overview
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {simplifiedAccounts.map(account => (
                <Card key={account.id} className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewAccount(account.id)}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{account.name}</CardTitle>
                      <Badge variant={account.type === 'prop-firm' ? 'default' : 'secondary'}>
                        {account.type === 'prop-firm' ? 'Prop Firm' : 'Live'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Balance</span>
                        <span className="font-medium">${account.balance.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Trades</span>
                        <span className="font-medium">{account.trades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">P&L</span>
                        <span className={`font-medium ${account.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${account.pnl.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Add Account Button */}
            <div className="flex justify-center pt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <PrimaryButton>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Account
                  </PrimaryButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleCreateAccount('prop-firm')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Prop Firm Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleCreateAccount('live')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Live Account
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* Progressive disclosure for advanced features */}
        {showAdvancedView && accounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Advanced Features</CardTitle>
              <AccessibleDescription>
                Additional account management and analysis tools
              </AccessibleDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => router.push('/dashboard/accounts')}
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-sm">Full Account Manager</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => router.push('/dashboard/prop-firm')}
                >
                  <Badge className="h-5 w-5" />
                  <span className="text-sm">Prop Firm Dashboard</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => router.push('/dashboard/data')}
                >
                  <RefreshCw className="h-5 w-5" />
                  <span className="text-sm">Data Management</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialogs - Temporarily disabled until components are available */}
        {/* <CreateLiveAccountDialog
          open={createLiveDialogOpen}
          onOpenChange={setCreateLiveDialogOpen}
          onSuccess={handleAccountCreated}
        />

        <CreatePropFirmAccountDialog
          open={createPropFirmDialogOpen}
          onOpenChange={setCreatePropFirmDialogOpen}
          onSuccess={handleAccountCreated}
        /> */}
      </div>
    </div>
  )
}
