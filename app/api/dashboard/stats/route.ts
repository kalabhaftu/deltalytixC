"use server"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

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

      // Build where clause based on authentication
      const where = currentUserId ? { userId: currentUserId } : {}

      // Get basic statistics with minimal joins for performance
      const [
        totalAccounts,
        totalTrades,
        totalEquity,
        recentTrades
      ] = await Promise.all([
        // Total accounts count
        prisma.account.count({ where }),
        
        // Total trades count
        prisma.trade.count({
          where: currentUserId ? { userId: currentUserId } : {}
        }),
        
        // Sum of current equity (use starting balance as approximation for speed)
        prisma.account.aggregate({
          where,
          _sum: {
            startingBalance: true
          }
        }),
        
        // Recent trades for chart data (last 30 days)
        prisma.trade.findMany({
          where: {
            ...(currentUserId ? { userId: currentUserId } : {}),
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            }
          },
          select: {
            pnl: true,
            entryDate: true,
            closeDate: true,
            createdAt: true,
            instrument: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 100 // Limit for performance
        })
      ])

      // Calculate daily PnL for chart
      const dailyPnL = new Map<string, number>()
      recentTrades.forEach(trade => {
        const date = trade.createdAt.toISOString().split('T')[0]
        dailyPnL.set(date, (dailyPnL.get(date) || 0) + trade.pnl)
      })

      // Convert to array format for charts
      const chartData = Array.from(dailyPnL.entries())
        .map(([date, pnl]) => ({ date, pnl }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14) // Last 14 days for chart

      // Calculate win rate
      const winningTrades = recentTrades.filter(trade => trade.pnl > 0).length
      const winRate = recentTrades.length > 0 ? (winningTrades / recentTrades.length) * 100 : 0

      // Calculate total PnL
      const totalPnL = recentTrades.reduce((sum, trade) => sum + trade.pnl, 0)

      return NextResponse.json({
        success: true,
        data: {
          totalAccounts,
          totalTrades,
          totalEquity: totalEquity._sum.startingBalance || 0,
          totalPnL,
          winRate: Math.round(winRate * 100) / 100,
          chartData,
          isAuthenticated: !!currentUserId,
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

