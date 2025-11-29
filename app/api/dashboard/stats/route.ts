"use server"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { calculateAccountBalances } from '@/lib/utils/balance-calculator'
import { CacheHeaders } from '@/lib/api-cache-headers'
import { API_TIMEOUT_LONG } from '@/lib/constants'

// GET /api/dashboard/stats - Fast dashboard statistics for charts
export async function GET(request: NextRequest) {
  try {
    // Add timeout for the entire operation using centralized constant
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), API_TIMEOUT_LONG)
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
      // Note: getUserId() returns Supabase auth_user_id, not our internal user.id
      const user = await prisma.user.findUnique({
        where: { auth_user_id: currentUserId },
        select: { id: true, accountFilterSettings: true }
      })

      let accountFilterSettings: any = null
      if (user?.accountFilterSettings) {
        try {
          accountFilterSettings = JSON.parse(user.accountFilterSettings)
        } catch (error) {
          // Parse error, use defaults
        }
      }

      // Use internal user.id for database queries (not auth_user_id)
      // If user not found in database, return empty stats instead of using incorrect ID
      if (!user?.id) {
        return NextResponse.json({
          success: true,
          data: {
            totalTrades: 0,
            totalAccounts: 0,
            totalEquity: 0,
            accountsWithEquity: [],
            dailyPnL: [],
            weekdayPerformance: {},
            hourPerformance: {},
            sessionPerformance: {},
            instrumentPerformance: {}
          }
        }, {
          headers: CacheHeaders.short
        })
      }
      const internalUserId = user.id

      // Build account where clause based on user's filter settings
      // NOTE: The Account model does NOT have a status field - it's only on MasterAccount/PhaseAccount
      // Regular accounts are always "live" trading accounts
      let accountWhereClause: any = { 
        userId: internalUserId,
        isArchived: false // ALWAYS exclude archived accounts from calculations
      }
      
      // For regular Account table, we can only filter by:
      // - userId (always applied)
      // - isArchived (always exclude archived)
      // Status filtering must be done separately for prop firm accounts via MasterAccount

      // Get filtered regular accounts (live trading accounts)
      const filteredAccounts = await prisma.account.findMany({
        where: accountWhereClause,
        select: {
          id: true,
          number: true,
          startingBalance: true
        }
      })
      
      // Also get prop firm phase accounts based on filter settings
      let propFirmPhaseNumbers: string[] = []
      
      // Build master account where clause for prop firm filtering
      const masterAccountWhere: any = { 
        userId: internalUserId,
        isArchived: false
      }
      
      // Apply status filtering to MasterAccount (which DOES have a status field)
      // NOTE: MasterAccountStatus only has: active, funded, failed
      // The 'passed' status exists only on PhaseAccount, not MasterAccount
      if (!accountFilterSettings || accountFilterSettings.showMode === 'active-only') {
        // Default: only include active and funded prop firm accounts
        masterAccountWhere.status = { in: ['active', 'funded'] }
      } else if (accountFilterSettings.showMode === 'custom') {
        // Apply custom filtering logic
        const statusFilters: ('active' | 'funded' | 'failed')[] = []
        
        if (accountFilterSettings.includeStatuses?.includes('active')) {
          statusFilters.push('active')
        }
        if (accountFilterSettings.includeStatuses?.includes('funded') || accountFilterSettings.showFundedAccounts) {
          statusFilters.push('funded')
        }
        // NOTE: 'passed' is NOT a valid MasterAccount status - it only exists on PhaseAccount
        // For "passed accounts", we should include 'funded' status since passing leads to funded
        if (accountFilterSettings.showPassedAccounts) {
          // Include funded accounts when user wants to see "passed" accounts
          // since MasterAccount transitions to 'funded' when phases are passed
          if (!statusFilters.includes('funded')) {
            statusFilters.push('funded')
          }
        }
        if (accountFilterSettings.showFailedAccounts) {
          statusFilters.push('failed')
        }
        
        if (statusFilters.length > 0) {
          masterAccountWhere.status = { in: statusFilters }
        }
      }
      // else 'all-accounts' - no status filter
      
      // Get prop firm accounts with their phases
      const propFirmAccounts = await prisma.masterAccount.findMany({
        where: masterAccountWhere,
        include: {
          PhaseAccount: {
            where: { 
              // Only include activated phases - exclude pending and pending_approval
              // Cast to any to avoid TypeScript enum issues with Prisma client
              status: { notIn: ['pending', 'pending_approval'] as any }
            },
            select: { phaseId: true, status: true }
          }
        }
      })
      
      // Extract phase IDs (which are used as account numbers in trades)
      propFirmPhaseNumbers = propFirmAccounts
        .flatMap((ma: { PhaseAccount: Array<{ phaseId: string | null; status: string }> }) => ma.PhaseAccount
          .filter((p): p is typeof p & { phaseId: string } => p.phaseId !== null && p.phaseId.trim() !== '')
          .map((p) => p.phaseId)
        )

      // Combine regular account numbers with prop firm phase IDs
      const filteredAccountNumbers = [
        ...filteredAccounts.map(acc => acc.number),
        ...propFirmPhaseNumbers
      ]

      // Build trade where clause that only includes trades from filtered accounts
      const tradeWhereClause: any = {
        userId: internalUserId,
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
        where: { userId: internalUserId },
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

