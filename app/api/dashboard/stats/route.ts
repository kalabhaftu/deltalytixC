"use server"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { getActiveAccountsWhereClause } from '@/lib/utils/account-filters'
import { calculateAccountBalances } from '@/lib/utils/balance-calculator'
import { CacheHeaders } from '@/lib/api-cache-headers'

// GET /api/dashboard/stats - Fast dashboard statistics for charts
export async function GET(request: NextRequest) {
  try {
    // Add timeout for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 8000) // 8 second timeout
    })

    const operationPromise = async () => {
      // Try to get user ID but don't fail if not authenticated
      let currentUserId: string | null = null
      try {
        currentUserId = await getUserId()
      } catch (error) {
      }

      if (!currentUserId) {
      return NextResponse.json({
        success: true,
        data: {
          totalAccounts: 0,
          totalTrades: 0,
          totalEquity: 0,
          totalPnL: 0,
          winRate: 0,
          chartData: [],
          isAuthenticated: false,
          lastUpdated: new Date().toISOString()
        }
      }, {
        headers: CacheHeaders.noCache // Don't cache unauthenticated responses
      })
      }

      // Get user's account filter settings if they exist
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { accountFilterSettings: true }
      })

      let accountFilterSettings: any = null
      if (user?.accountFilterSettings) {
        try {
          accountFilterSettings = JSON.parse(user.accountFilterSettings)
        } catch (error) {
          // Parse error, use defaults
        }
      }

      // Build account where clause based on user's filter settings
      let accountWhereClause: any = { 
        userId: currentUserId,
        isArchived: false // ALWAYS exclude archived accounts from calculations
      }
      
      // Apply filter settings if they exist, otherwise default to active accounts only
      if (!accountFilterSettings || accountFilterSettings.showMode === 'active-only') {
        // Default: exclude failed and passed accounts, include null status (legacy accounts)
        accountWhereClause.OR = [
          { status: { in: ['active', 'funded'] } },
          { status: null } // Include accounts with null status (legacy accounts)
        ]
      } else if (accountFilterSettings.showMode === 'all-accounts') {
        // Show all accounts - no additional filtering
      } else if (accountFilterSettings.showMode === 'custom') {
        // Apply custom filtering logic
        const statusFilters = []
        
        if (accountFilterSettings.includeStatuses?.includes('active')) {
          statusFilters.push('active')
        }
        if (accountFilterSettings.includeStatuses?.includes('funded') || accountFilterSettings.showFundedAccounts) {
          statusFilters.push('funded')
        }
        if (accountFilterSettings.showPassedAccounts) {
          statusFilters.push('passed')
        }
        if (accountFilterSettings.showFailedAccounts) {
          statusFilters.push('failed')
        }
        
        if (statusFilters.length > 0) {
          accountWhereClause.status = {
            in: statusFilters
          }
        }
      }

      // Get filtered accounts to extract their numbers for trade filtering
      const filteredAccounts = await prisma.account.findMany({
        where: accountWhereClause,
        select: {
          id: true,
          number: true,
          startingBalance: true,
          // status: true, // status field doesn't exist
          // propfirm: true // propfirm field doesn't exist
        }
      })

      const filteredAccountNumbers = filteredAccounts.map(acc => acc.number)

      // Build trade where clause that only includes trades from filtered accounts
      const tradeWhereClause: any = {
        userId: currentUserId,
        accountNumber: {
          in: filteredAccountNumbers
        }
      }

      // Optimized: Use single query with aggregation instead of separate queries
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const [totalTrades, recentTrades, allTradesForEquity] = await Promise.all([
        // Total trades count (only from filtered accounts)
        prisma.trade.count({
          where: tradeWhereClause
        }),
        
        // Recent trades for chart and stats (last 30 days, only from filtered accounts)
        // Include fields needed for grouping
        prisma.trade.findMany({
          where: {
            ...tradeWhereClause,
            createdAt: {
              gte: thirtyDaysAgo
            }
          },
          select: {
            id: true,
            entryId: true,
            entryDate: true,
            instrument: true,
            side: true,
            pnl: true,
            commission: true,
            createdAt: true,
            accountNumber: true,
            quantity: true,
            timeInPosition: true,
            closeDate: true,
            closePrice: true,
            exitTime: true,
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 500
        }),

        // All trades for equity calculation (optimized selection)
        prisma.trade.findMany({
          where: tradeWhereClause,
          select: {
            pnl: true,
            commission: true,
            accountNumber: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        })
      ])

      const totalAccounts = filteredAccounts.length

      // Fetch all transactions for balance calculation
      const allTransactions = await prisma.liveAccountTransaction.findMany({
        where: { userId: currentUserId },
        select: {
          accountId: true,
          amount: true
        }
      })

      // Calculate proper current equity by account using unified calculator
      // This ensures consistency with all other balance calculations
      const accountEquities = calculateAccountBalances(filteredAccounts, allTradesForEquity, allTransactions, {
        excludeFailedAccounts: false, // Include failed accounts to show their actual current balance
        includePayouts: true
      })

      // Calculate total equity
      const totalEquity = Array.from(accountEquities.values()).reduce((sum, equity) => sum + equity, 0)

      // Calculate daily PnL for chart (net of commissions)
      const dailyPnL = new Map<string, number>()
      recentTrades.forEach(trade => {
        const date = trade.createdAt.toISOString().split('T')[0]
        const netPnL = trade.pnl - (trade.commission || 0)
        dailyPnL.set(date, (dailyPnL.get(date) || 0) + netPnL)
      })

      // Convert to array format for charts
      const chartData = Array.from(dailyPnL.entries())
        .map(([date, pnl]) => ({ date, pnl }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14) // Last 14 days for chart

      // CRITICAL: Group trades by execution to handle partial closes correctly
      const { groupTradesByExecution } = await import('@/lib/utils')
      const groupedTrades = groupTradesByExecution(recentTrades as any[])

      // Calculate average win/loss from GROUPED trades
      const wins = groupedTrades.filter(t => (t.pnl - (t.commission || 0)) > 0)
      const losses = groupedTrades.filter(t => (t.pnl - (t.commission || 0)) < 0)
      const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0) / wins.length : 0
      const avgLoss = losses.length > 0 ? losses.reduce((sum, t) => sum + Math.abs(t.pnl - (t.commission || 0)), 0) / losses.length : 0
      const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0

      // Calculate trading statistics (net of commissions) using GROUPED trades
      const winningTrades = groupedTrades.filter(trade => {
        const netPnL = trade.pnl - (trade.commission || 0)
        return netPnL > 0
      }).length
      const losingTrades = groupedTrades.filter(trade => {
        const netPnL = trade.pnl - (trade.commission || 0)
        return netPnL < 0
      }).length
      const breakEvenTrades = groupedTrades.filter(trade => {
        const netPnL = trade.pnl - (trade.commission || 0)
        return netPnL === 0
      }).length

      // Win rate calculation (excluding break-even trades)
      const tradableTradesCount = winningTrades + losingTrades
      const winRate = tradableTradesCount > 0 ? (winningTrades / tradableTradesCount) * 100 : 0

      // Calculate total PnL (net of commissions) using GROUPED trades
      const totalPnL = groupedTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0)), 0)

      // Calculate gross profits and losses for profit factor using GROUPED trades
      const grossProfits = groupedTrades.reduce((sum, trade) => {
        const netPnL = trade.pnl - (trade.commission || 0)
        return netPnL > 0 ? sum + netPnL : sum
      }, 0)

      const grossLosses = Math.abs(groupedTrades.reduce((sum, trade) => {
        const netPnL = trade.pnl - (trade.commission || 0)
        return netPnL < 0 ? sum + netPnL : sum
      }, 0))

      // Profit factor calculation
      const profitFactor = grossLosses === 0 ?
        (grossProfits > 0 ? Number.POSITIVE_INFINITY : 0) :
        grossProfits / grossLosses

      return NextResponse.json({
        success: true,
        data: {
          totalAccounts,
          totalTrades: groupedTrades.length, // CRITICAL: Use grouped count
          totalEquity: Math.round(totalEquity * 100) / 100, // Round to 2 decimal places
          totalPnL: Math.round(totalPnL * 100) / 100,
          winRate: Math.round(winRate * 100) / 100,
          profitFactor: Math.round(profitFactor * 100) / 100,
          grossProfits: Math.round(grossProfits * 100) / 100,
          grossLosses: Math.round(grossLosses * 100) / 100,
          winningTrades,
          losingTrades,
          breakEvenTrades,
          chartData,
          isAuthenticated: true,
          filterSettings: {
            showMode: accountFilterSettings?.showMode || 'active-only',
            filteredAccountsCount: filteredAccounts.length,
            accountNumbers: filteredAccountNumbers
          },
          lastUpdated: new Date().toISOString()
        }
      }, {
        headers: CacheHeaders.short // Cache for 60 seconds with stale-while-revalidate
      })
    }

    // Race between operation and timeout
    return await Promise.race([operationPromise(), timeoutPromise])

  } catch (error) {
    
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json(
        { success: false, error: 'Request timeout - please try again' },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}

