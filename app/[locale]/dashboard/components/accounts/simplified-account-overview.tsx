'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, Shield, DollarSign, Activity } from "lucide-react"
import { PrimaryButton, SecondaryButton } from "@/components/ui/button-styles"
import { AccessibleText, AccessibleDescription } from "@/components/ui/accessible-text"
import { motion } from "framer-motion"

interface Account {
  id: string
  name: string
  type: 'prop-firm' | 'live'
  status: string
  balance: number
  pnl?: number
  trades: number
}

interface SimplifiedAccountOverviewProps {
  accounts: Account[]
  onCreateAccount: (type: 'prop-firm' | 'live') => void
  onViewAccount: (id: string) => void
}

export function SimplifiedAccountOverview({ 
  accounts, 
  onCreateAccount, 
  onViewAccount 
}: SimplifiedAccountOverviewProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'prop-firm' | 'live'>('all')
  
  const filteredAccounts = accounts.filter(account => 
    selectedType === 'all' || account.type === selectedType
  )

  const stats = {
    total: accounts.length,
    propFirm: accounts.filter(a => a.type === 'prop-firm').length,
    live: accounts.filter(a => a.type === 'live').length,
    totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
    totalPnL: accounts.reduce((sum, a) => sum + (a.pnl || 0), 0)
  }

  const AccountCard = ({ account }: { account: Account }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onViewAccount(account.id)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">{account.name}</CardTitle>
            <Badge variant={account.type === 'prop-firm' ? 'default' : 'secondary'}>
              {account.type === 'prop-firm' ? 'Prop Firm' : 'Live'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <AccessibleText variant="muted" size="xs">Balance</AccessibleText>
              <p className="font-semibold">${account.balance.toLocaleString()}</p>
            </div>
            <div>
              <AccessibleText variant="muted" size="xs">Trades</AccessibleText>
              <p className="font-semibold">{account.trades}</p>
            </div>
          </div>
          {account.pnl !== undefined && (
            <div className="mt-3 pt-3 border-t">
              <AccessibleText variant="muted" size="xs">P&L</AccessibleText>
              <p className={`font-semibold ${account.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${account.pnl.toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <AccessibleText variant="muted" size="sm">Total Accounts</AccessibleText>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <AccessibleText variant="muted" size="sm">Total Balance</AccessibleText>
            </div>
            <p className="text-2xl font-bold mt-1">${stats.totalBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <AccessibleText variant="muted" size="sm">Total P&L</AccessibleText>
            </div>
            <p className={`text-2xl font-bold mt-1 ${stats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.totalPnL.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <AccessibleText variant="muted" size="sm">Prop Firms</AccessibleText>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.propFirm}</p>
          </CardContent>
        </Card>
      </div>

      {/* Account Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Your Trading Accounts</CardTitle>
              <AccessibleDescription>
                Manage and monitor all your trading accounts in one place
              </AccessibleDescription>
            </div>
            <div className="flex gap-2">
              <SecondaryButton 
                size="sm" 
                onClick={() => onCreateAccount('live')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Live Account
              </SecondaryButton>
              <PrimaryButton 
                size="sm" 
                onClick={() => onCreateAccount('prop-firm')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Prop Firm
              </PrimaryButton>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Simple Filter Tabs */}
          <Tabs value={selectedType} onValueChange={(value) => setSelectedType(value as any)} className="mb-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="prop-firm">Prop Firm ({stats.propFirm})</TabsTrigger>
              <TabsTrigger value="live">Live ({stats.live})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Account Grid */}
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No accounts found</h3>
              <AccessibleDescription className="mb-6">
                {selectedType === 'all' 
                  ? "Create your first trading account to get started"
                  : `No ${selectedType.replace('-', ' ')} accounts found`
                }
              </AccessibleDescription>
              <div className="flex gap-2 justify-center">
                <SecondaryButton onClick={() => onCreateAccount('live')}>
                  Add Live Account
                </SecondaryButton>
                <PrimaryButton onClick={() => onCreateAccount('prop-firm')}>
                  Add Prop Firm Account
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

