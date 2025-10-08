"use server"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { getActiveAccountsWhereClause } from '@/lib/utils/account-filters'
import { calculateAverageWinLoss } from '@/lib/utils'
import { calculateAccountBalances } from '@/lib/utils/balance-calculator'

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
        console.log('No authentication provided, returning limited stats')
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
          console.warn('Failed to parse user account filter settings:', error)
        }
      }

      // Build account where clause based on user's filter settings
      let accountWhereClause: any = { userId: currentUserId }
      
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

      // Get statistics with proper filtering applied consistently
      const [
        totalAccounts,
        totalTrades,
        recentTrades,
        allTradesForEquity
      ] = await Promise.all([
        // Total accounts count (already filtered)
        Promise.resolve(filteredAccounts.length),
        
        // Total trades count (only from filtered accounts)
        prisma.trade.count({
          where: tradeWhereClause
        }),
        
        // Recent trades for chart data (last 30 days, only from filtered accounts)
        prisma.trade.findMany({
          where: {
            ...tradeWhereClause,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 500 // Increased limit for better chart data
        }),

        // All trades for equity calculation (only from filtered accounts)
        prisma.trade.findMany({
          where: tradeWhereClause,
          select: {
            pnl: true,
            commission: true,
            swap: true,
            accountNumber: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        })
      ])

      // Calculate proper current equity by account using unified calculator
      // This ensures consistency with all other balance calculations
      const accountEquities = calculateAccountBalances(filteredAccounts, allTradesForEquity, {
        excludeFailedAccounts: true,
        includePayouts: true
      })

      // Calculate total equity
      const totalEquity = Array.from(accountEquities.values()).reduce((sum, equity) => sum + equity, 0)

      // Calculate daily PnL for chart (net of commissions and fees)
      const dailyPnL = new Map<string, number>()
      recentTrades.forEach(trade => {
        const date = trade.createdAt.toISOString().split('T')[0]
        const netPnL = trade.pnl - (trade.commission || 0) - ((trade as any).fees || 0)
        dailyPnL.set(date, (dailyPnL.get(date) || 0) + netPnL)
      })

      // Convert to array format for charts
      const chartData = Array.from(dailyPnL.entries())
        .map(([date, pnl]) => ({ date, pnl }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14) // Last 14 days for chart

      // Use centralized calculation for statistics
      const { avgWin, avgLoss, riskRewardRatio } = calculateAverageWinLoss(recentTrades)

      // Calculate trading statistics (net of commissions and fees)
      const winningTrades = recentTrades.filter(trade => {
        const netPnL = trade.pnl - (trade.commission || 0) - ((trade as any).fees || 0)
        return netPnL > 0
      }).length
      const losingTrades = recentTrades.filter(trade => {
        const netPnL = trade.pnl - (trade.commission || 0) - ((trade as any).fees || 0)
        return netPnL < 0
      }).length
      const breakEvenTrades = recentTrades.filter(trade => {
        const netPnL = trade.pnl - (trade.commission || 0) - ((trade as any).fees || 0)
        return netPnL === 0
      }).length

      // Win rate calculation (excluding break-even trades)
      const tradableTradesCount = winningTrades + losingTrades
      const winRate = tradableTradesCount > 0 ? (winningTrades / tradableTradesCount) * 100 : 0

      // Calculate total PnL (net of commissions and fees)
      const totalPnL = recentTrades.reduce((sum, trade) => sum + (trade.pnl - (trade.commission || 0) - ((trade as any).fees || 0)), 0)

      // Calculate gross profits and losses for profit factor (net of costs)
      const grossProfits = recentTrades.reduce((sum, trade) => {
        const netPnL = trade.pnl - (trade.commission || 0) - ((trade as any).fees || 0)
        return netPnL > 0 ? sum + netPnL : sum
      }, 0)

      const grossLosses = Math.abs(recentTrades.reduce((sum, trade) => {
        const netPnL = trade.pnl - (trade.commission || 0) - ((trade as any).fees || 0)
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
          totalTrades,
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
      })
    }

    // Race between operation and timeout
    return await Promise.race([operationPromise(), timeoutPromise])

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    
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

