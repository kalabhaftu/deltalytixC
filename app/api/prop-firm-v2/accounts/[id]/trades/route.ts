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

// Trade creation schema
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
  phaseId: z.string().optional(), // If not provided, will use active phase
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
    const accountId = params.id
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
      phaseId: searchParams.get('error') || undefined,
      symbol: searchParams.get('symbol') || undefined,
      side: searchParams.get('side') as 'long' | 'short' | undefined,
      strategy: searchParams.get('error') || undefined,
      dateFrom: searchParams.get('error') || undefined,
      dateTo: searchParams.get('error') || undefined,
      minPnl: searchParams.get('error') ? parseFloat(searchParams.get('error')!) : undefined,
      maxPnl: searchParams.get('error') ? parseFloat(searchParams.get('error')!) : undefined,
      page: parseInt(searchParams.get('error') || '1'),
      limit: parseInt(searchParams.get('error') || '50'),
      sortBy: searchParams.get('error') || 'entryTime',
      sortOrder: (searchParams.get('error') as 'asc' | 'desc') || 'desc',
    }
    
    const filters = TradeFilterSchema.parse(filterData)
    const offset = (filters.page - 1) * filters.limit
    
    // Build where clause
    const where: any = {
      accountId,
      // Use either propFirmPhaseId or accountId for trade linking
      OR: [
        { propFirmPhaseId: { not: null } },
        { accountId: accountId },
      ]
    }
    
    if (filters.phaseId) {
      where.propFirmPhaseId = filters.phaseId
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
          select: { id: true, name: true, firmType: true }
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
    const phases = await prisma.propFirmPhase?.findMany({
      where: { accountId },
      select: {
        id: true,
        phaseType: true,
        status: true,
        startedAt: true,
        completedAt: true,
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
        phaseId: trade.propFirmPhaseId || trade.phaseId,
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
    const accountId = params.id
    const body = await request.json()
    
    // Validate trade data
    const validatedData = CreateTradeSchema.parse(body)
    
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
    
    // Get target phase (specified or active)
    let targetPhase = null
    if (validatedData.phaseId) {
      targetPhase = await prisma.propFirmPhase?.findFirst({
        where: { id: validatedData.phaseId, accountId }
      })
    } else {
      targetPhase = await prisma.propFirmPhase?.findFirst({
        where: { accountId, status: 'active' }
      })
    }
    
    if (!targetPhase) {
      return NextResponse.json(
        { error: 'No active phase found. Please create a phase first.' },
        { status: 400 }
      )
    }
    
    // Calculate trade metrics
    const entryTime = new Date(validatedData.entryTime)
    const exitTime = validatedData.exitTime ? new Date(validatedData.exitTime) : null
    const isClosedTrade = exitTime && validatedData.exitPrice
    
    let realizedPnl = 0
    if (isClosedTrade) {
      // Calculate PnL based on side
      const priceDiff = validatedData.side === 'long' ? 
        validatedData.exitPrice! - validatedData.entryPrice :
        validatedData.entryPrice - validatedData.exitPrice!
      
      realizedPnl = priceDiff * validatedData.quantity
      realizedPnl -= (validatedData.commission + validatedData.swap + validatedData.fees)
    }
    
    // Create trade and update phase in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the trade
      const trade = await tx.trade.create({
        data: {
          // New prop firm fields
          accountId,
          propFirmPhaseId: targetPhase.id,
          symbol: validatedData.symbol,
          side: validatedData.side,
          quantity: validatedData.quantity,
          entryTime,
          exitTime,
          commission: validatedData.commission,
          fees: validatedData.fees,
          realizedPnl: isClosedTrade ? realizedPnl : null,
          comment: validatedData.comment,
          strategy: validatedData.strategy,
          tags: validatedData.tags,
          equityAtOpen: targetPhase.currentEquity,
          equityAtClose: isClosedTrade ? targetPhase.currentEquity + realizedPnl : null,
          
          // Legacy fields for compatibility
          accountNumber: account.phase1AccountId || account.id,
          instrument: validatedData.symbol,
          entryPrice: validatedData.entryPrice.toString(),
          closePrice: validatedData.exitPrice?.toString() || '',
          entryDate: entryTime.toISOString().split('T')[0],
          closeDate: exitTime?.toISOString().split('T')[0] || '',
          pnl: realizedPnl,
          userId,
        }
      })
      
      // Update phase statistics if trade is closed
      if (isClosedTrade) {
        const isWin = realizedPnl > 0
        const updatedPhase = await tx.propFirmPhase?.update({
          where: { id: targetPhase.id },
          data: {
            totalTrades: { increment: 1 },
            winningTrades: { increment: isWin ? 1 : 0 },
            losingTrades: { increment: isWin ? 0 : 1 },
            totalCommission: { increment: validatedData.commission + validatedData.fees },
            totalSwap: { increment: validatedData.swap },
            currentEquity: { increment: realizedPnl },
            currentBalance: { increment: realizedPnl },
            highWaterMark: targetPhase.currentEquity + realizedPnl > targetPhase.highWaterMark ? 
              { set: targetPhase.currentEquity + realizedPnl } : undefined,
            bestTrade: realizedPnl > targetPhase.bestTrade ? { set: realizedPnl } : undefined,
            worstTrade: realizedPnl < targetPhase.worstTrade ? { set: realizedPnl } : undefined,
          }
        })
        
        // Calculate drawdown after trade
        const newEquity = targetPhase.currentEquity + realizedPnl
        const drawdown = PropFirmEngine.calculateDrawdown(
          { ...targetPhase, currentEquity: newEquity } as any,
          newEquity,
          targetPhase.currentBalance, // Using current balance as daily anchor for now
          account.trailingDrawdownEnabled
        )
        
        // Check for breaches
        if (drawdown.isBreached) {
          // Create breach record
          await tx.drawdownBreach?.create({
            data: {
              phaseId: targetPhase.id,
              accountId,
              breachType: drawdown.breachType!,
              breachAmount: drawdown.breachAmount!,
              limitAmount: drawdown.breachType === 'daily_drawdown' ? 
                drawdown.dailyDrawdownLimit : drawdown.maxDrawdownLimit,
              equityAtBreach: newEquity,
              balanceAtBreach: targetPhase.currentBalance + realizedPnl,
              tradeIdTrigger: trade.id,
              breachedAt: new Date(),
              isActive: true,
            }
          })
          
          // Update phase status to failed
          await tx.propFirmPhase?.update({
            where: { id: targetPhase.id },
            data: {
              status: 'failed',
              failedAt: new Date(),
            }
          })
          
          // Update account status to failed
          await tx.account.update({
            where: { id: accountId },
            data: { status: 'failed' }
          })
        }
        
        // Check if phase should advance (profit target met + other conditions)
        const progress = PropFirmEngine.calculatePhaseProgress(
          account as any,
          { ...targetPhase, currentEquity: newEquity } as any,
          [] // We'd need to fetch all trades for proper calculation
        )
        
        if (progress.readyToAdvance && !drawdown.isBreached) {
          await tx.propFirmPhase?.update({
            where: { id: targetPhase.id },
            data: {
              status: 'passed',
              completedAt: new Date(),
            }
          })
          
          if (targetPhase.phaseType === 'phase_2') {
            await tx.account.update({
              where: { id: accountId },
              data: { status: 'funded' }
            })
          }
        }
        
        return { trade, updatedPhase, drawdown, progress }
      }
      
      return { trade, updatedPhase: null, drawdown: null, progress: null }
    })
    
    return NextResponse.json({
      success: true,
      trade: result.trade,
      phase: result.updatedPhase,
      drawdown: result.drawdown,
      progress: result.progress,
      message: isClosedTrade ? 'Trade added and phase updated' : 'Open trade added',
      warnings: result.drawdown?.isBreached ? ['Drawdown breach detected!'] : [],
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
