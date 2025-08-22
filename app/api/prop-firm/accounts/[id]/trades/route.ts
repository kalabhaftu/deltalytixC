/**
 * Account Trades API
 * Handles trade management for specific accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { PropFirmSchemas } from '@/lib/validation/prop-firm-schemas'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'
// Removed heavy validation import - using Zod directly

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

    // Parse filter parameters
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
        min: searchParams.get('minPnl') ? parseFloat(searchParams.get('minPnl')!) : undefined,
        max: searchParams.get('maxPnl') ? parseFloat(searchParams.get('maxPnl')!) : undefined
      } : undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
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
      const pnlConditions: any = {}
      if (filters.pnlRange.min !== undefined) {
        pnlConditions.gte = filters.pnlRange.min
      }
      if (filters.pnlRange.max !== undefined) {
        pnlConditions.lte = filters.pnlRange.max
      }
      
      where.OR = [
        { realizedPnl: pnlConditions },
        { 
          AND: [
            { realizedPnl: null },
            { pnl: pnlConditions }
          ]
        }
      ]
    }

    const offset = (filters.page - 1) * filters.limit

    // Get trades with phase information
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          phase: {
            select: {
              id: true,
              phaseType: true,
              phaseStatus: true,
              phaseStartAt: true,
              phaseEndAt: true
            }
          }
        },
        orderBy: [
          { entryTime: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: offset,
        take: filters.limit,
      }),
      prisma.trade.count({ where })
    ])

    // Calculate running totals
    let runningPnl = 0
    const tradesWithRunningTotals = trades.map(trade => {
      const tradePnl = trade.realizedPnl || trade.pnl
      runningPnl += tradePnl
      
      return {
        ...trade,
        displayPnl: tradePnl,
        runningPnl,
        symbol: trade.symbol || trade.instrument,
        entryDateTime: trade.entryTime || trade.entryDate,
        exitDateTime: trade.exitTime || trade.closeDate,
      }
    })

    return NextResponse.json({
      success: true,
      data: tradesWithRunningTotals,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
        hasNext: offset + filters.limit < total,
        hasPrevious: filters.page > 1,
      },
      summary: {
        totalTrades: total,
        totalPnl: trades.reduce((sum, t) => sum + (t.realizedPnl || t.pnl), 0),
        totalFees: trades.reduce((sum, t) => sum + (t.fees || t.commission), 0),
        winningTrades: trades.filter(t => (t.realizedPnl || t.pnl) > 0).length,
        losingTrades: trades.filter(t => (t.realizedPnl || t.pnl) < 0).length,
      }
    })

  } catch (error) {
    console.error('Error fetching account trades:', error)
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

    // Calculate trade PnL and fees
    const quantity = tradeData.quantity
    const entryPrice = tradeData.entryPrice
    const exitPrice = tradeData.exitPrice
    const fees = tradeData.fees || 0
    const commission = tradeData.commission || 0
    const totalFees = fees + commission

    let realizedPnl = 0
    if (exitPrice && exitPrice > 0) {
      // Calculate PnL based on side
      if (tradeData.side === 'long') {
        realizedPnl = (exitPrice - entryPrice) * quantity
      } else {
        realizedPnl = (entryPrice - exitPrice) * quantity
      }
      realizedPnl -= totalFees
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
      if (exitPrice && realizedPnl !== 0) {
        const isWinningTrade = realizedPnl > 0
        
        await tx.accountPhase.update({
          where: { id: currentPhase.id },
          data: {
            totalTrades: { increment: 1 },
            winningTrades: isWinningTrade ? { increment: 1 } : undefined,
            netProfitSincePhaseStart: { increment: realizedPnl },
            totalCommission: { increment: totalFees },
            // Update highest equity if this trade increased it
            highestEquitySincePhaseStart: realizedPnl > 0 ? {
              increment: realizedPnl
            } : undefined,
          }
        })

        // Check for breaches and phase progression
        const updatedPhase = await tx.accountPhase.findUnique({
          where: { id: currentPhase.id }
        })

        if (updatedPhase) {
          const newEquity = updatedPhase.currentEquity + realizedPnl

          // Check for drawdown breaches
          const drawdown = PropFirmBusinessRules.calculateDrawdown(
            account as any,
            updatedPhase as any,
            newEquity,
            updatedPhase.currentBalance, // Using current balance as daily anchor
            updatedPhase.highestEquitySincePhaseStart
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
          equity: currentPhase.currentEquity + (realizedPnl || 0),
          balance: currentPhase.currentBalance + (realizedPnl || 0),
          openPnl: 0,
        }
      })

      return trade
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Trade created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating trade:', error)
    return NextResponse.json(
      { error: 'Failed to create trade' },
      { status: 500 }
    )
  }
}
