/**
 * Prop Firm Trade Management API - Rebuilt System
 * GET /api/prop-firm-v2/accounts/[id]/trades - Get trades for account
 * POST /api/prop-firm-v2/accounts/[id]/trades - Add new trade
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'
import { PropFirmEngine } from '@/lib/prop-firm/prop-firm-engine'
import { z } from 'zod'

const prisma = new PrismaClient()

interface RouteParams {
  params: { id: string }
}

// Trade creation schema - CSV import trades
const CreateTradeSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(['long', 'short']),
  quantity: z.number().positive(),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive().optional(),
  entryTime: z.string().datetime(),
  exitTime: z.string().datetime().optional(),
  commission: z.number().default(0),
  swap: z.number().default(0),
  fees: z.number().default(0),
  comment: z.string().optional(),
  strategy: z.string().optional(),
  tags: z.array(z.string()).default([]),
  // No phaseId needed - trades go to current active phase of selected account
})

const TradeFilterSchema = z.object({
  phaseId: z.string().optional(),
  symbol: z.string().optional(),
  side: z.enum(['long', 'short']).optional(),
  strategy: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  minPnl: z.number().optional(),
  maxPnl: z.number().optional(),
  page: z.number().default(1),
  limit: z.number().default(50),
  sortBy: z.string().default('entryTime'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// GET /api/prop-firm-v2/accounts/[id]/trades
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id
    const { searchParams } = new URL(request.url)
    
    // Verify account ownership
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId }
    })
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }
    
    // Parse filters
    const filterData = {
      phaseId: searchParams.get('phaseId') || undefined,
      symbol: searchParams.get('symbol') || undefined,
      side: searchParams.get('side') as 'long' | 'short' | undefined,
      strategy: searchParams.get('strategy') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      minPnl: searchParams.get('minPnl') ? parseFloat(searchParams.get('minPnl')!) : undefined,
      maxPnl: searchParams.get('maxPnl') ? parseFloat(searchParams.get('maxPnl')!) : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sortBy: searchParams.get('sortBy') || 'entryTime',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    }
    
    const filters = TradeFilterSchema.parse(filterData)
    const offset = (filters.page - 1) * filters.limit
    
    // Build where clause
    const where: any = {
      accountId,
      // Use either accountPhaseId or accountId for trade linking
      OR: [
        { accountPhaseId: { not: null } },
        { accountId: accountId },
      ]
    }
    
    if (filters.phaseId) {
      where.accountPhaseId = filters.phaseId
    }
    
    if (filters.symbol) {
      where.symbol = { contains: filters.symbol, mode: 'insensitive' }
    }
    
    if (filters.side) {
      where.side = filters.side
    }
    
    if (filters.strategy) {
      where.strategy = { contains: filters.strategy, mode: 'insensitive' }
    }
    
    if (filters.dateFrom || filters.dateTo) {
      where.entryTime = {}
      if (filters.dateFrom) {
        where.entryTime.gte = new Date(filters.dateFrom)
      }
      if (filters.dateTo) {
        where.entryTime.lte = new Date(filters.dateTo)
      }
    }
    
    if (filters.minPnl !== undefined || filters.maxPnl !== undefined) {
      where.OR = [
        {
          realizedPnl: {
            ...(filters.minPnl !== undefined && { gte: filters.minPnl }),
            ...(filters.maxPnl !== undefined && { lte: filters.maxPnl }),
          }
        },
        {
          pnl: {
            ...(filters.minPnl !== undefined && { gte: filters.minPnl }),
            ...(filters.maxPnl !== undefined && { lte: filters.maxPnl }),
          }
        }
      ]
    }
    
    // Get total count
    const total = await prisma.trade.count({ where })
    
    // Get trades
    const trades = await prisma.trade.findMany({
      where,
      skip: offset,
      take: filters.limit,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      include: {
        account: {
          select: { id: true, name: true, propfirm: true }
        }
      }
    })
    
    // Calculate summary statistics
    const allTrades = await prisma.trade.findMany({
      where: { accountId },
      select: {
        realizedPnl: true,
        pnl: true,
        commission: true,
        fees: true,
        entryTime: true,
        exitTime: true,
        side: true,
        symbol: true,
      }
    })
    
    const statistics = calculateTradeStatistics(allTrades)
    
    // Get phase information
    const phases = await prisma.accountPhase?.findMany({
      where: { accountId },
      select: {
        id: true,
        phaseType: true,
        phaseStatus: true,
        phaseStartAt: true,
        phaseEndAt: true,
        _count: {
          select: { trades: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    }) || []
    
    return NextResponse.json({
      trades: trades.map(trade => ({
        id: trade.id,
        symbol: trade.symbol || trade.instrument,
        side: trade.side,
        quantity: trade.quantity,
        entryPrice: parseFloat(trade.entryPrice),
        exitPrice: trade.closePrice ? parseFloat(trade.closePrice) : null,
        entryTime: trade.entryTime,
        exitTime: trade.exitTime,
        realizedPnl: trade.realizedPnl || trade.pnl,
        commission: trade.commission || trade.fees || 0,
        swap: 0, // Not in legacy schema
        fees: trade.fees || 0,
        comment: trade.comment,
        strategy: trade.strategy,
        tags: trade.tags || [],
        phaseId: trade.phaseId,
        equityAtOpen: trade.equityAtOpen,
        equityAtClose: trade.equityAtClose,
        closeReason: trade.closeReason,
        createdAt: trade.createdAt,
        
        // Calculated fields
        isOpen: !trade.exitTime,
        duration: trade.entryTime && trade.exitTime ? 
          Math.floor((trade.exitTime.getTime() - trade.entryTime.getTime()) / (1000 * 60)) : null, // minutes
        pnlPercent: trade.entryPrice && trade.realizedPnl ? 
          (trade.realizedPnl / (parseFloat(trade.entryPrice) * trade.quantity)) * 100 : null,
      })),
      
      pagination: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
        hasNext: offset + filters.limit < total,
        hasPrev: filters.page > 1,
      },
      
      statistics,
      phases,
      
      summary: {
        totalTrades: statistics.totalTrades,
        totalPnL: statistics.totalPnL,
        winRate: statistics.winRate,
        profitFactor: statistics.profitFactor,
        avgWin: statistics.avgWin,
        avgLoss: statistics.avgLoss,
        currentStreak: statistics.currentStreak,
      }
    })
    
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/prop-firm-v2/accounts/[id]/trades
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const resolvedParams = await params
    const accountId = resolvedParams.id
    const body = await request.json()

    // Validate trade data
    const validatedData = CreateTradeSchema.parse(body)

    // Verify account ownership and get account with phases
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      include: {
        phases: {
          where: { phaseStatus: 'active' },
          orderBy: { createdAt: 'desc' },
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

    // Get current active phase
    const currentPhase = account.phases?.[0]
    if (!currentPhase) {
      return NextResponse.json(
        { error: 'No active phase found. Account may need to be created or may have failed.' },
        { status: 400 }
      )
    }

    // Validate account for trade addition
    const validation = PropFirmEngine.validateAccountForTrade(account as any, currentPhase as any)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }
    
    // Process trade using the new engine
    const tradeData = {
      symbol: validatedData.symbol,
      side: validatedData.side as 'long' | 'short',
      quantity: validatedData.quantity,
      entryPrice: validatedData.entryPrice,
      exitPrice: validatedData.exitPrice,
      entryTime: new Date(validatedData.entryTime),
      exitTime: validatedData.exitTime ? new Date(validatedData.exitTime) : null,
      commission: validatedData.commission,
      swap: validatedData.swap,
      fees: validatedData.fees,
      comment: validatedData.comment,
      strategy: validatedData.strategy,
    }

    const result = await prisma.$transaction(async (tx) => {
      // Process trade with engine
      const tradeResult = await PropFirmEngine.processTrade(
        account as any,
        currentPhase as any,
        tradeData
      )

      const { trade, updatedPhase, shouldAdvance, breachDetected, breachType } = tradeResult

      // Update phase in database
      await tx.accountPhase.update({
        where: { id: currentPhase.id },
        data: {
          currentEquity: updatedPhase.currentEquity,
          currentBalance: updatedPhase.currentBalance,
          netProfitSincePhaseStart: updatedPhase.currentEquity - updatedPhase.startingBalance,
          highestEquitySincePhaseStart: Math.max(updatedPhase.highestEquitySincePhaseStart, updatedPhase.currentEquity),
          totalTrades: updatedPhase.totalTrades,
          winningTrades: updatedPhase.winningTrades,
          totalCommission: updatedPhase.totalCommission,
        }
      })

      // Create the trade record
      const dbTrade = await tx.trade.create({
        data: {
          accountId,
          phaseId: currentPhase.id,
          symbol: trade.symbol,
          side: trade.side,
          quantity: trade.quantity,
          entryPrice: trade.entryPrice.toString(),
          closePrice: trade.exitPrice?.toString() || '',
          entryTime: trade.entryTime,
          exitTime: trade.exitTime,
          commission: trade.commission,
          fees: trade.fees,
          realizedPnl: trade.realizedPnl,
          comment: trade.comment,
          strategy: trade.strategy,
          tags: trade.tags,
          equityAtOpen: trade.equityAtOpen,
          equityAtClose: trade.equityAtClose,

          // Legacy compatibility
          accountNumber: currentPhase.accountNumber,
          instrument: trade.symbol,
          entryDate: trade.entryTime.toISOString().split('T')[0],
          closeDate: trade.exitTime?.toISOString().split('T')[0] || '',
          pnl: trade.realizedPnl || 0,
          userId,
        }
      })

      // Handle breach if detected
      if (breachDetected && breachType) {
        await tx.breach.create({
          data: {
            accountId,
            phaseId: currentPhase.id,
            breachType,
            breachAmount: Math.abs(updatedPhase.currentEquity - updatedPhase.startingBalance - updatedPhase.profitTarget),
            breachThreshold: breachType === 'daily_drawdown' ?
              currentPhase.dailyDrawdownAmount : currentPhase.maxDrawdownAmount,
            equity: updatedPhase.currentEquity,
            description: `Breach detected on trade ${dbTrade.id}`,
          }
        })

        // Mark phase as failed
        await tx.accountPhase.update({
          where: { id: currentPhase.id },
          data: { phaseStatus: 'failed' }
        })

        // Mark account as failed
        await tx.account.update({
          where: { id: accountId },
          data: { status: 'failed' }
        })
      }

      // Handle phase advancement
      if (shouldAdvance) {
        const nextPhaseType = PropFirmEngine.getNextPhaseType(currentPhase.phaseType, account.evaluationType as any)

        if (nextPhaseType) {
          // Mark current phase as passed
          await tx.accountPhase.update({
            where: { id: currentPhase.id },
            data: {
              phaseStatus: 'passed',
              phaseEndAt: new Date()
            }
          })

          // Create new phase
          const newPhaseData = PropFirmEngine.createNewPhase(account as any, nextPhaseType)
          await tx.accountPhase.create({
            data: {
              ...newPhaseData,
              accountId,
            }
          })
        }
      }

      return { dbTrade, updatedPhase, breachDetected, shouldAdvance }
    })
    
    return NextResponse.json({
      success: true,
      trade: result.dbTrade,
      phase: result.updatedPhase,
      breachDetected: result.breachDetected,
      shouldAdvance: result.shouldAdvance,
      message: result.breachDetected ?
        'Trade added but account failed due to rule breach!' :
        result.shouldAdvance ?
        'Trade added and phase advanced successfully!' :
        'Trade added successfully',
      warnings: result.breachDetected ? ['Account failed due to rule breach!'] : [],
    })
    
  } catch (error) {
    console.error('Error creating trade:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create trade', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Helper function to calculate trade statistics
function calculateTradeStatistics(trades: any[]) {
  const closedTrades = trades.filter(t => t.exitTime && (t.realizedPnl !== null || t.pnl !== null))
  const totalTrades = closedTrades.length
  
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      totalPnL: 0,
      totalCommission: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      currentStreak: 0,
      bestStreak: 0,
      worstStreak: 0,
      largestWin: 0,
      largestLoss: 0,
    }
  }
  
  const winners = closedTrades.filter(t => (t.realizedPnl || t.pnl || 0) > 0)
  const losers = closedTrades.filter(t => (t.realizedPnl || t.pnl || 0) < 0)
  
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.realizedPnl || t.pnl || 0), 0)
  const totalCommission = closedTrades.reduce((sum, t) => sum + (t.commission || t.fees || 0), 0)
  
  const totalWins = winners.reduce((sum, t) => sum + (t.realizedPnl || t.pnl || 0), 0)
  const totalLosses = Math.abs(losers.reduce((sum, t) => sum + (t.realizedPnl || t.pnl || 0), 0))
  
  const winRate = (winners.length / totalTrades) * 100
  const avgWin = winners.length > 0 ? totalWins / winners.length : 0
  const avgLoss = losers.length > 0 ? totalLosses / losers.length : 0
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0
  
  // Calculate streaks
  let currentStreak = 0
  let bestStreak = 0
  let worstStreak = 0
  let tempStreak = 0
  let lastWasWin = false
  
  closedTrades.forEach((trade, index) => {
    const isWin = (trade.realizedPnl || trade.pnl || 0) > 0
    
    if (index === 0) {
      tempStreak = isWin ? 1 : -1
      lastWasWin = isWin
    } else {
      if (isWin === lastWasWin) {
        tempStreak = isWin ? tempStreak + 1 : tempStreak - 1
      } else {
        if (lastWasWin) {
          bestStreak = Math.max(bestStreak, tempStreak)
        } else {
          worstStreak = Math.min(worstStreak, tempStreak)
        }
        tempStreak = isWin ? 1 : -1
        lastWasWin = isWin
      }
    }
    
    if (index === closedTrades.length - 1) {
      currentStreak = tempStreak
      if (isWin) {
        bestStreak = Math.max(bestStreak, tempStreak)
      } else {
        worstStreak = Math.min(worstStreak, tempStreak)
      }
    }
  })
  
  const largestWin = winners.length > 0 ? Math.max(...winners.map(t => t.realizedPnl || t.pnl || 0)) : 0
  const largestLoss = losers.length > 0 ? Math.min(...losers.map(t => t.realizedPnl || t.pnl || 0)) : 0
  
  return {
    totalTrades,
    totalPnL,
    totalCommission,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    currentStreak,
    bestStreak,
    worstStreak,
    largestWin,
    largestLoss,
  }
}
