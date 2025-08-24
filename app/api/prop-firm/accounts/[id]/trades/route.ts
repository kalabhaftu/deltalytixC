/**
 * Account Trades API
 * Handles trade management for specific accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { PropFirmSchemas } from '@/lib/validation/prop-firm-schemas'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/prop-firm/accounts/[id]/trades - List trades for account
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    const { searchParams } = new URL(request.url)

    // Parse filter parameters with safe defaults
    const filterData = {
      accountId,
      phaseId: searchParams.get('phaseId') || undefined,
      symbol: searchParams.getAll('symbol'),
      strategy: searchParams.getAll('strategy'),
      side: searchParams.getAll('side'),
      dateRange: searchParams.get('dateFrom') && searchParams.get('dateTo') ? {
        start: new Date(searchParams.get('dateFrom')!),
        end: new Date(searchParams.get('dateTo')!)
      } : undefined,
      pnlRange: searchParams.get('minPnl') || searchParams.get('maxPnl') ? {
        min: searchParams.get('minPnl') ? parseFloat(searchParams.get('minPnl')!) || 0 : undefined,
        max: searchParams.get('maxPnl') ? parseFloat(searchParams.get('maxPnl')!) || 0 : undefined
      } : undefined,
      page: Math.max(1, parseInt(searchParams.get('page') || '1') || 1),
      limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50)),
    }

    // Validate filters
    const parseResult = PropFirmSchemas.TradeFilter.safeParse(filterData)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const filters = parseResult.data

    // Check account access
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Build where clause
    const where: any = { accountId }

    if (filters.phaseId) {
      where.phaseId = filters.phaseId
    }

    if (filters.symbol && filters.symbol.length > 0) {
      where.OR = [
        { symbol: { in: filters.symbol } },
        { instrument: { in: filters.symbol } }
      ]
    }

    if (filters.strategy && filters.strategy.length > 0) {
      where.strategy = { in: filters.strategy }
    }

    if (filters.side && filters.side.length > 0) {
      where.side = { in: filters.side }
    }

    if (filters.dateRange) {
      where.OR = [
        {
          entryTime: {
            gte: filters.dateRange.start,
            lte: filters.dateRange.end
          }
        },
        {
          AND: [
            { entryTime: null },
            {
              entryDate: {
                gte: filters.dateRange.start.toISOString().split('T')[0],
                lte: filters.dateRange.end.toISOString().split('T')[0]
              }
            }
          ]
        }
      ]
    }

    if (filters.pnlRange) {
      const pnlWhere: any = {}
      if (filters.pnlRange.min !== undefined) {
        pnlWhere.gte = filters.pnlRange.min
      }
      if (filters.pnlRange.max !== undefined) {
        pnlWhere.lte = filters.pnlRange.max
      }
      where.OR = [
        { realizedPnl: pnlWhere },
        { pnl: pnlWhere }
      ]
    }

    // Calculate pagination
    const offset = (filters.page - 1) * filters.limit

    // Get trades with pagination
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        orderBy: { entryTime: 'desc' },
        skip: offset,
        take: filters.limit,
        include: {
          phase: {
            select: {
              id: true,
              phaseType: true,
              phaseStatus: true
            }
          }
        }
      }),
      prisma.trade.count({ where })
    ])

    // Transform trades to ensure consistent data structure
    const transformedTrades = trades.map(trade => ({
      id: trade.id,
      symbol: trade.symbol || trade.instrument || '',
      side: trade.side || '',
      quantity: trade.quantity || 0,
      entryPrice: trade.entryPrice ? parseFloat(trade.entryPrice) || 0 : 0,
      exitPrice: trade.closePrice ? parseFloat(trade.closePrice) || 0 : 0,
      entryTime: trade.entryTime?.toISOString() || trade.entryDate || '',
      exitTime: trade.exitTime?.toISOString() || trade.closeDate || '',
      pnl: trade.realizedPnl || trade.pnl || 0,
      fees: trade.fees || trade.commission || 0,
      strategy: trade.strategy || '',
      notes: trade.comment || '',
      phase: trade.phase ? {
        id: trade.phase.id,
        type: trade.phase.phaseType,
        status: trade.phase.phaseStatus
      } : null,
      createdAt: trade.createdAt.toISOString()
    }))

    return NextResponse.json({
      success: true,
      data: transformedTrades,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
        hasNext: offset + filters.limit < total,
        hasPrevious: filters.page > 1,
      },
    })

  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    )
  }
}

// POST /api/prop-firm/accounts/[id]/trades - Create new trade
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    const body = await request.json()

    // Validate input
    const parseResult = PropFirmSchemas.CreateTrade.safeParse({
      ...body,
      accountId
    })
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid trade data', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const tradeData = parseResult.data

    // Get account with current phase
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

    if (account.status === 'failed') {
      return NextResponse.json(
        { error: 'Cannot add trades to failed account' },
        { status: 400 }
      )
    }

    const currentPhase = account.phases[0]
    if (!currentPhase) {
      return NextResponse.json(
        { error: 'Account has no active phase' },
        { status: 400 }
      )
    }

    // Calculate trade PnL and fees with safe defaults
    const quantity = Math.max(0, tradeData.quantity || 0)
    const entryPrice = Math.max(0, tradeData.entryPrice || 0)
    const exitPrice = tradeData.exitPrice ? Math.max(0, tradeData.exitPrice) : null
    const fees = Math.max(0, tradeData.fees || 0)
    const commission = Math.max(0, tradeData.commission || 0)
    const totalFees = fees + commission

    let realizedPnl = 0
    if (exitPrice && exitPrice > 0 && entryPrice > 0 && quantity > 0) {
      // Calculate PnL based on side
      if (tradeData.side === 'long') {
        realizedPnl = (exitPrice - entryPrice) * quantity
      } else {
        realizedPnl = (entryPrice - exitPrice) * quantity
      }
      realizedPnl -= totalFees
    }

    // Ensure PnL is a valid number
    if (isNaN(realizedPnl) || !isFinite(realizedPnl)) {
      realizedPnl = 0
    }

    // Create trade and update account metrics in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the trade
      const trade = await tx.trade.create({
        data: {
          ...tradeData,
          accountNumber: account.number,
          phaseId: currentPhase.id,
          realizedPnl: exitPrice ? realizedPnl : null,
          fees: totalFees,
          // Legacy fields for compatibility
          instrument: tradeData.symbol,
          entryPrice: entryPrice.toString(),
          closePrice: exitPrice?.toString() || '',
          entryDate: tradeData.entryTime?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          closeDate: tradeData.exitTime?.toISOString().split('T')[0] || '',
          pnl: realizedPnl,
          commission: totalFees,
          userId,
        }
      })

      // Update phase statistics if trade is closed
      if (exitPrice) {
        const updatedPhase = await tx.accountPhase.update({
          where: { id: currentPhase.id },
          data: {
            totalTrades: { increment: 1 },
            winningTrades: { increment: realizedPnl > 0 ? 1 : 0 },
            totalCommission: { increment: totalFees },
            netProfitSincePhaseStart: { increment: realizedPnl },
          }
        })

        // Calculate new equity
        const newEquity = updatedPhase.currentEquity + realizedPnl
        const newHighestEquity = Math.max(newEquity, updatedPhase.highestEquitySincePhaseStart)

        // Update phase with new equity values
        await tx.accountPhase.update({
          where: { id: currentPhase.id },
          data: {
            currentEquity: newEquity,
            currentBalance: newEquity,
            highestEquitySincePhaseStart: newHighestEquity,
          }
        })

        // Check for drawdown breaches
        const drawdown = PropFirmBusinessRules.calculateDrawdown(
          account as any,
          updatedPhase as any,
          newEquity,
          updatedPhase.currentBalance, // Using current balance as daily anchor
          newHighestEquity
        )

        if (drawdown.isBreached) {
          // Create breach record
          await tx.breach.create({
            data: {
              accountId: account.id,
              phaseId: currentPhase.id,
              breachType: drawdown.breachType!,
              breachAmount: drawdown.breachAmount!,
              breachThreshold: drawdown.breachType === 'daily_drawdown' 
                ? (account.dailyDrawdownAmount || 0)
                : (account.maxDrawdownAmount || 0),
              equity: newEquity,
              description: `${drawdown.breachType} breach on trade ${trade.id}`
            }
          })

          // Mark account and phase as failed
          await tx.account.update({
            where: { id: account.id },
            data: { status: 'failed' }
          })

          await tx.accountPhase.update({
            where: { id: currentPhase.id },
            data: { 
              phaseStatus: 'failed',
              phaseEndAt: new Date()
            }
          })
        } else {
          // Check for phase progression
          const progress = PropFirmBusinessRules.calculatePhaseProgress(
            account as any,
            updatedPhase as any,
            updatedPhase.netProfitSincePhaseStart
          )

          if (progress.canProgress && progress.nextPhaseType) {
            // Mark current phase as passed
            await tx.accountPhase.update({
              where: { id: currentPhase.id },
              data: {
                phaseStatus: 'passed',
                phaseEndAt: new Date()
              }
            })

            // Create next phase
            const nextProfitTarget = progress.nextPhaseType === 'funded' 
              ? undefined 
              : PropFirmBusinessRules.getDefaultProfitTarget(
                  progress.nextPhaseType,
                  account.startingBalance,
                  account.evaluationType
                )

            await tx.accountPhase.create({
              data: {
                accountId: account.id,
                phaseType: progress.nextPhaseType,
                phaseStatus: 'active',
                profitTarget: nextProfitTarget,
                currentEquity: newEquity,
                currentBalance: newEquity,
                highestEquitySincePhaseStart: newEquity,
              }
            })

            // Update account status if reaching funded
            if (progress.nextPhaseType === 'funded') {
              await tx.account.update({
                where: { id: account.id },
                data: { status: 'funded' }
              })
            }
          }

          // Update equity
          await tx.accountPhase.update({
            where: { id: currentPhase.id },
            data: {
              currentEquity: newEquity,
              currentBalance: newEquity,
            }
          })
        }
      }

      // Create equity snapshot
      await tx.equitySnapshot.create({
        data: {
          accountId: account.id,
          phaseId: currentPhase.id,
          equity: exitPrice ? (currentPhase.currentEquity + realizedPnl) : currentPhase.currentEquity,
          balance: exitPrice ? (currentPhase.currentBalance + realizedPnl) : currentPhase.currentBalance,
          openPnl: exitPrice ? 0 : realizedPnl,
        }
      })

      return trade
    })

    return NextResponse.json({
      success: true,
      data: {
        id: result.id,
        symbol: result.symbol || result.instrument || '',
        side: result.side || '',
        quantity: result.quantity || 0,
        entryPrice: result.entryPrice ? parseFloat(result.entryPrice) || 0 : 0,
        exitPrice: result.closePrice ? parseFloat(result.closePrice) || 0 : 0,
        entryTime: result.entryTime?.toISOString() || result.entryDate || '',
        exitTime: result.exitTime?.toISOString() || result.closeDate || '',
        pnl: result.realizedPnl || result.pnl || 0,
        fees: result.fees || result.commission || 0,
        strategy: result.strategy || '',
        notes: result.comment || '',
        createdAt: result.createdAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error creating trade:', error)
    return NextResponse.json(
      { error: 'Failed to create trade' },
      { status: 500 }
    )
  }
}
