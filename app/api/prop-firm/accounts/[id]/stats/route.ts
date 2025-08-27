/**
 * Account Statistics API
 * Provides detailed statistics and analytics for a specific account
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/prop-firm/accounts/[id]/stats
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    const { searchParams } = new URL(request.url)
    
    // Optional phase filter
    const phaseId = searchParams.get('phaseId')
    const phaseType = searchParams.get('phaseType') as 'phase_1' | 'phase_2' | 'funded' | null

    // Check account access
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: {
        id: true,
        number: true,
        name: true,
        propfirm: true,
        status: true,
        startingBalance: true,
        profitTarget: true,
        drawdownThreshold: true,
        evaluationType: true,
        phases: true,
        equitySnapshots: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Build trade filter
    const tradeWhere: any = { accountId }
    if (phaseId) {
      tradeWhere.phaseId = phaseId
    } else if (phaseType) {
      const targetPhases = account.phases.filter(p => p.phaseType === phaseType)
      if (targetPhases.length > 0) {
        tradeWhere.phaseId = { in: targetPhases.map(p => p.id) }
      }
    }

    // Get trades with the filter
    const trades = await prisma.trade.findMany({
      where: tradeWhere,
      orderBy: { entryTime: 'desc' },
      include: {
        phase: true
      }
    })

    // Get current equity
    const currentEquity = account.equitySnapshots[0]?.equity || account.startingBalance

    // Calculate comprehensive statistics
    const stats = PropFirmBusinessRules.calculateRiskMetrics(
      account as any,
      trades as any,
      currentEquity
    )

    // Calculate additional metrics
    const totalPnl = trades.reduce((sum, trade) => sum + (trade.realizedPnl || trade.pnl), 0)
    const totalFees = trades.reduce((sum, trade) => sum + (trade.fees || trade.commission), 0)
    const netPnl = totalPnl - totalFees

    // Performance by symbol
    const symbolStats = trades.reduce((acc, trade) => {
      const symbol = trade.symbol || trade.instrument
      if (!acc[symbol]) {
        acc[symbol] = {
          symbol,
          trades: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0,
          totalVolume: 0
        }
      }
      
      const pnl = trade.realizedPnl || trade.pnl
      acc[symbol].trades++
      acc[symbol].totalPnl += pnl
      acc[symbol].totalVolume += trade.quantity
      
      if (pnl > 0) acc[symbol].wins++
      else if (pnl < 0) acc[symbol].losses++
      
      return acc
    }, {} as Record<string, any>)

    // Performance by strategy
    const strategyStats = trades.reduce((acc, trade) => {
      const strategy = trade.strategy || 'Unknown'
      if (!acc[strategy]) {
        acc[strategy] = {
          strategy,
          trades: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0
        }
      }
      
      const pnl = trade.realizedPnl || trade.pnl
      acc[strategy].trades++
      acc[strategy].totalPnl += pnl
      
      if (pnl > 0) acc[strategy].wins++
      else if (pnl < 0) acc[strategy].losses++
      
      return acc
    }, {} as Record<string, any>)

    // Performance by time of day
    const hourlyStats = trades.reduce((acc, trade) => {
      if (!trade.entryTime) return acc
      
      const hour = new Date(trade.entryTime).getHours()
      if (!acc[hour]) {
        acc[hour] = {
          hour,
          trades: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0
        }
      }
      
      const pnl = trade.realizedPnl || trade.pnl
      acc[hour].trades++
      acc[hour].totalPnl += pnl
      
      if (pnl > 0) acc[hour].wins++
      else if (pnl < 0) acc[hour].losses++
      
      return acc
    }, {} as Record<number, any>)

    // Day of week performance
    const dayOfWeekStats = trades.reduce((acc, trade) => {
      if (!trade.entryTime) return acc
      
      const dayOfWeek = new Date(trade.entryTime).getDay()
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const dayName = dayNames[dayOfWeek]
      
      if (!acc[dayName]) {
        acc[dayName] = {
          day: dayName,
          trades: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0
        }
      }
      
      const pnl = trade.realizedPnl || trade.pnl
      acc[dayName].trades++
      acc[dayName].totalPnl += pnl
      
      if (pnl > 0) acc[dayName].wins++
      else if (pnl < 0) acc[dayName].losses++
      
      return acc
    }, {} as Record<string, any>)

    // Calculate streak information
    let currentStreak = 0
    let longestWinStreak = 0
    let longestLossStreak = 0
    let tempWinStreak = 0
    let tempLossStreak = 0

    const sortedTrades = trades
      .filter(t => t.entryTime)
      .sort((a, b) => new Date(a.entryTime!).getTime() - new Date(b.entryTime!).getTime())

    for (let i = 0; i < sortedTrades.length; i++) {
      const pnl = sortedTrades[i].realizedPnl || sortedTrades[i].pnl
      const isWin = pnl > 0
      
      if (isWin) {
        tempWinStreak++
        tempLossStreak = 0
        longestWinStreak = Math.max(longestWinStreak, tempWinStreak)
      } else if (pnl < 0) {
        tempLossStreak++
        tempWinStreak = 0
        longestLossStreak = Math.max(longestLossStreak, tempLossStreak)
      }
      
      // Calculate current streak (from most recent trades)
      if (i === sortedTrades.length - 1) {
        currentStreak = isWin ? tempWinStreak : -tempLossStreak
      }
    }

    // Monthly performance
    const monthlyStats = trades.reduce((acc, trade) => {
      if (!trade.entryTime) return acc
      
      const date = new Date(trade.entryTime)
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          trades: 0,
          totalPnl: 0,
          wins: 0,
          losses: 0,
          fees: 0
        }
      }
      
      const pnl = trade.realizedPnl || trade.pnl
      acc[monthKey].trades++
      acc[monthKey].totalPnl += pnl
      acc[monthKey].fees += (trade.fees || trade.commission)
      
      if (pnl > 0) acc[monthKey].wins++
      else if (pnl < 0) acc[monthKey].losses++
      
      return acc
    }, {} as Record<string, any>)

    // Calculate drawdown history
    let runningEquity = account.startingBalance
    let peakEquity = account.startingBalance
    let maxDrawdownEncountered = 0

    const equityHistory = sortedTrades.map(trade => {
      const pnl = trade.realizedPnl || trade.pnl
      runningEquity += pnl
      peakEquity = Math.max(peakEquity, runningEquity)
      const currentDrawdown = peakEquity - runningEquity
      maxDrawdownEncountered = Math.max(maxDrawdownEncountered, currentDrawdown)
      
      return {
        date: trade.entryTime,
        equity: runningEquity,
        peakEquity,
        drawdown: currentDrawdown,
        drawdownPercent: peakEquity > 0 ? (currentDrawdown / peakEquity) * 100 : 0
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        // Basic stats
        totalTrades: stats.totalTrades,
        winRate: stats.winRate,
        totalPnl,
        totalFees,
        netPnl,
        averageWin: stats.avgWin,
        averageLoss: stats.avgLoss,
        profitFactor: stats.profitFactor,
        
        // Streak information
        currentStreak,
        longestWinStreak,
        longestLossStreak,
        
        // Drawdown metrics
        maxDrawdownEncountered,
        maxDrawdownPercent: account.startingBalance > 0 
          ? (maxDrawdownEncountered / account.startingBalance) * 100 
          : 0,
        
        // Risk metrics
        riskOfRuin: stats.riskOfRuin,
        
        // Performance breakdowns
        bySymbol: Object.values(symbolStats).sort((a: any, b: any) => b.totalPnl - a.totalPnl),
        byStrategy: Object.values(strategyStats).sort((a: any, b: any) => b.totalPnl - a.totalPnl),
        byHour: Object.values(hourlyStats).sort((a: any, b: any) => a.hour - b.hour),
        byDayOfWeek: Object.values(dayOfWeekStats),
        byMonth: Object.values(monthlyStats).sort((a: any, b: any) => a.month.localeCompare(b.month)),
        
        // Equity curve
        equityHistory,
        
        // Account context
        account: {
          id: account.id,
          number: account.number,
          name: account.name,
          startingBalance: account.startingBalance,
          currentEquity,
        },
        
        // Filter applied
        filter: {
          phaseId,
          phaseType,
          tradesIncluded: trades.length
        }
      }
    })

  } catch (error) {
    console.error('Error fetching account stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account statistics' },
      { status: 500 }
    )
  }
}


