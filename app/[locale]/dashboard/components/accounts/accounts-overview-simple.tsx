'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useRouter } from 'next/navigation'
import { Building2, User, ExternalLink, Plus, TrendingUp, DollarSign, Activity } from "lucide-react"
import { useData } from "@/context/data-provider"
import { useI18n } from "@/locales/client"
import { WidgetSize } from '../../types/dashboard'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { motion } from "framer-motion"

interface SimpleAccountCard {
  id: string
  number: string
  name?: string
  broker?: string
  propfirm: string
  accountType: 'prop-firm' | 'live'
  displayName: string
  startingBalance: number
  status: string
  tradeCount: number
  profitLoss: number
}

export function AccountsOverview({ size }: { size: WidgetSize }) {
  const trades = useTradesStore(state => state.trades)
  const user = useUserStore(state => state.user)
  const accounts = useUserStore(state => state.accounts)
  const { accountNumbers } = useData()
  const t = useI18n()
  const router = useRouter()

  // Transform accounts data for simple display
  const simpleAccounts = useMemo(() => {
    const uniqueAccounts = new Set(trades.map(trade => trade.accountNumber))
    const configuredAccounts: SimpleAccountCard[] = []

    Array.from(uniqueAccounts)
      .filter(accountNumber => accountNumbers.length === 0 || accountNumbers.includes(accountNumber))
      .forEach(accountNumber => {
        const accountTrades = trades.filter(t => t.accountNumber === accountNumber)
        const dbAccount = accounts.find(acc => acc.number === accountNumber)

        if (dbAccount) {
          const profitLoss = accountTrades.reduce((total, trade) => total + trade.pnl - (trade.commission || 0), 0)
          
          configuredAccounts.push({
            id: dbAccount.id,
            number: dbAccount.number,
            name: dbAccount.name || undefined,
            broker: (dbAccount as any).broker || undefined,
            propfirm: dbAccount.propfirm || 'Unknown',
            accountType: dbAccount.propfirm ? 'prop-firm' : 'live',
            displayName: dbAccount.name || `Account ${dbAccount.number}`,
            startingBalance: dbAccount.startingBalance || 0,
            status: 'active',
            tradeCount: accountTrades.length,
            profitLoss
          })
        }
      })

    return configuredAccounts
  }, [trades, accounts, accountNumbers])

  const handleViewAccount = (accountId: string, accountType: string) => {
    if (accountType === 'prop-firm') {
      router.push(`/dashboard/prop-firm/accounts/${accountId}`)
    } else {
      router.push(`/dashboard?account=${accountId}`)
    }
  }

  const SimpleAccountCard = ({ account }: { account: SimpleAccountCard }) => {
    const profitLossColor = account.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
    const isCompact = size === 'small' || size === 'small-long'
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className={isCompact ? "pb-2 p-3" : "pb-3"}>
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className={`truncate ${isCompact ? 'text-sm' : 'text-base'}`}>
                  {account.displayName}
                </CardTitle>
                <div className={`flex items-center gap-1 text-muted-foreground mt-1 ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  {account.accountType === 'prop-firm' ? (
                    <>
                      <Building2 className="h-3 w-3" />
                      <span className="truncate">{account.propfirm}</span>
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3" />
                      <span className="truncate">{account.broker || 'Live'}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className={isCompact ? "text-xs px-2 py-0" : ""}>
                {account.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className={isCompact ? "p-3 pt-0" : "pt-0"}>
            <div className={`grid grid-cols-2 gap-2 ${isCompact ? 'text-xs' : 'text-sm'} mb-3`}>
              <div>
                <div className="text-muted-foreground">Balance</div>
                <div className="font-medium">${account.startingBalance.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted-foreground">P&L</div>
                <div className={`font-medium ${profitLossColor}`}>
                  ${account.profitLoss.toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`text-muted-foreground ${isCompact ? 'text-xs' : 'text-sm'}`}>
                <Activity className="h-3 w-3 inline mr-1" />
                {account.tradeCount} trades
              </span>
              <Button
                variant="outline"
                size={isCompact ? "sm" : "sm"}
                onClick={() => handleViewAccount(account.id, account.accountType)}
                className={isCompact ? "h-7 px-2 text-xs" : "h-8"}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className={`flex flex-row items-center justify-between space-y-0 border-b shrink-0 ${
        size === 'small-long' ? "p-2 h-[40px]" : "p-3 sm:p-4 h-[56px]"
      }`}>
        <CardTitle className={`line-clamp-1 ${size === 'small-long' ? "text-sm" : "text-base"}`}>
          {t('accounts.title')}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/accounts')}
          className={size === 'small-long' ? "h-6 px-2 text-xs" : "h-8"}
        >
          View All
        </Button>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {simpleAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
              <p className={`text-muted-foreground ${size === 'small-long' ? 'text-xs' : 'text-sm'}`}>
                {t('accounts.noAccounts')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/accounts')}
                className="mt-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Account
              </Button>
            </div>
          ) : (
            <div className={`grid gap-3 ${
              size === 'large' || size === 'extra-large' 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
                : 'grid-cols-1'
            } mt-4`}>
              {simpleAccounts.slice(0, size === 'small-long' ? 4 : 6).map((account) => (
                <SimpleAccountCard key={account.id} account={account} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
