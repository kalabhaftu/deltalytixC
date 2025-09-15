/**
 * Prop Firm Phase Management API
 * GET /api/prop-firm-v2/accounts/[id]/phases - Get all phases for account
 * POST /api/prop-firm-v2/accounts/[id]/phases - Create new phase or advance to next phase
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

// Phase creation/advancement schema
const PhaseActionSchema = z.object({
  action: z.enum(['advance', 'fail', 'reset', 'create']),
  phaseType: z.enum(['phase_1', 'phase_2', 'funded']).optional(),
  reason: z.string().optional(),
  brokerAccountId: z.string().optional(),
  brokerLogin: z.string().optional(),
  brokerPassword: z.string().optional(),
  brokerServer: z.string().optional(),
  startingBalance: z.number().optional(),
  notes: z.string().optional(),
})

// GET /api/prop-firm-v2/accounts/[id]/phases
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    
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
    
    // Get all phases with detailed information
    const phases = await prisma.propFirmPhase?.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
      include: {
        trades: {
          select: {
            id: true,
            symbol: true,
            side: true,
            quantity: true,
            entryPrice: true,
            exitPrice: true,
            entryTime: true,
            exitTime: true,
            realizedPnl: true,
            commission: true,
            fees: true,
          },
          orderBy: { entryTime: 'desc' },
          take: 50 // Latest trades per phase
        },
        dailySnapshots: {
          orderBy: { date: 'desc' },
          take: 90 // Last 3 months of snapshots
        },
        breaches: {
          orderBy: { breachedAt: 'desc' }
        },
        payouts: {
          orderBy: { requestedAt: 'desc' }
        }
      }
    }) || []
    
    // Calculate metrics for each phase
    const enhancedPhases = phases.map(phase => {
      const trades = phase.trades || []
      const snapshots = phase.dailySnapshots || []
      const latestSnapshot = snapshots[0]
      
      // Calculate drawdown
      const drawdown = PropFirmEngine.calculateDrawdown(
        phase as any,
        phase.currentEquity,
        latestSnapshot?.openingBalance || phase.startingBalance,
        account.trailingDrawdownEnabled
      )
      
      // Calculate progress
      const progress = PropFirmEngine.calculatePhaseProgress(
        account as any,
        phase as any,
        trades as any
      )
      
      // Calculate risk metrics
      const riskMetrics = PropFirmEngine.calculateRiskMetrics(trades as any)
      
      // Determine next action
      const evaluation = PropFirmEngine.evaluatePhaseTransition(
        account as any,
        phase as any,
        drawdown,
        progress
      )
      
      return {
        ...phase,
        drawdown,
        progress,
        riskMetrics,
        nextAction: evaluation,
        summary: {
          profitLoss: phase.currentEquity - phase.startingBalance,
          profitLossPercent: ((phase.currentEquity - phase.startingBalance) / phase.startingBalance) * 100,
          daysActive: phase.startedAt ? Math.floor((Date.now() - phase.startedAt.getTime()) / (1000 * 60 * 60 * 24)) : 0,
          totalTrades: trades.length,
          winRate: riskMetrics.winRate,
          profitFactor: riskMetrics.profitFactor,
          isBreached: drawdown.isBreached,
          canAdvance: progress.readyToAdvance,
        }
      }
    })
    
    // Determine overall account status
    const currentPhase = enhancedPhases.find(p => p.status === 'active')
    const accountSummary = {
      totalPhases: enhancedPhases.length,
      currentPhase: currentPhase?.phaseType,
      currentStatus: currentPhase?.status,
      overallPnL: enhancedPhases.reduce((sum, p) => sum + (p.currentEquity - p.startingBalance), 0),
      canCreateNextPhase: currentPhase?.summary.canAdvance || false,
      needsAttention: enhancedPhases.some(p => p.summary.isBreached),
      suggestedActions: getSuggestedActions(enhancedPhases, account as any),
    }
    
    return NextResponse.json({
      phases: enhancedPhases,
      summary: accountSummary,
      account: {
        id: account.id,
        name: account.name,
        firmType: account.firmType,
        status: account.status,
      }
    })
    
  } catch (error) {
    console.error('Error fetching phases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch phases', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/prop-firm-v2/accounts/[id]/phases
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    const body = await request.json()
    
    // Validate request
    const validatedData = PhaseActionSchema.parse(body)
    
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
    
    // Get current active phase
    const currentPhase = await prisma.propFirmPhase?.findFirst({
      where: {
        accountId,
        status: 'active'
      },
      include: {
        trades: true
      }
    })
    
    const result = await prisma.$transaction(async (tx) => {
      let newPhase = null
      let updatedAccount = null
      
      switch (validatedData.action) {
        case 'advance':
          if (!currentPhase) {
            throw new Error('No active phase to advance from')
          }
          
          // Mark current phase as passed
          await tx.propFirmPhase?.update({
            where: { id: currentPhase.id },
            data: {
              status: 'passed',
              completedAt: new Date(),
            }
          })
          
          // Determine next phase type
          const nextPhaseType = getNextPhaseType(currentPhase.phaseType)
          if (!nextPhaseType) {
            throw new Error('No next phase available')
          }
          
          // Get appropriate account ID for the next phase
          const brokerAccountId = getBrokerAccountId(account as any, nextPhaseType, validatedData.brokerAccountId)
          
          // Create next phase
          newPhase = await tx.propFirmPhase?.create({
            data: {
              accountId,
              phaseType: nextPhaseType,
              status: 'active',
              brokerAccountId,
              brokerLogin: validatedData.brokerLogin || getBrokerLogin(account as any, nextPhaseType),
              brokerPassword: validatedData.brokerPassword || getBrokerPassword(account as any, nextPhaseType),
              brokerServer: validatedData.brokerServer || getBrokerServer(account as any, nextPhaseType),
              startingBalance: validatedData.startingBalance || getPhaseStartingBalance(account as any, nextPhaseType, currentPhase.currentEquity),
              currentBalance: validatedData.startingBalance || getPhaseStartingBalance(account as any, nextPhaseType, currentPhase.currentEquity),
              currentEquity: validatedData.startingBalance || getPhaseStartingBalance(account as any, nextPhaseType, currentPhase.currentEquity),
              highWaterMark: validatedData.startingBalance || getPhaseStartingBalance(account as any, nextPhaseType, currentPhase.currentEquity),
              ...getPhaseTargets(account as any, nextPhaseType),
              startedAt: new Date(),
            }
          })
          
          // Update account status if reaching funded phase
          if (nextPhaseType === 'funded') {
            updatedAccount = await tx.account.update({
              where: { id: accountId },
              data: {
                status: 'funded',
                fundedDate: new Date(),
              }
            })
          }
          
          break
          
        case 'fail':
          if (!currentPhase) {
            throw new Error('No active phase to fail')
          }
          
          // Mark current phase as failed
          await tx.propFirmPhase?.update({
            where: { id: currentPhase.id },
            data: {
              status: 'failed',
              failedAt: new Date(),
            }
          })
          
          // Update account status
          updatedAccount = await tx.account.update({
            where: { id: accountId },
            data: {
              status: 'failed',
            }
          })
          
          break
          
        case 'reset':
          if (!currentPhase) {
            throw new Error('No active phase to reset')
          }
          
          // Reset current phase
          newPhase = await tx.propFirmPhase?.update({
            where: { id: currentPhase.id },
            data: {
              currentBalance: currentPhase.startingBalance,
              currentEquity: currentPhase.startingBalance,
              highWaterMark: currentPhase.startingBalance,
              totalTrades: 0,
              winningTrades: 0,
              losingTrades: 0,
              daysTraded: 0,
              startedAt: new Date(),
            }
          })
          
          // Delete all trades for this phase
          await tx.trade.deleteMany({
            where: { propFirmPhaseId: currentPhase.id }
          })
          
          break
          
        case 'create':
          if (!validatedData.phaseType) {
            throw new Error('Phase type is required for create action')
          }
          
          // Create new phase
          newPhase = await tx.propFirmPhase?.create({
            data: {
              accountId,
              phaseType: validatedData.phaseType,
              status: 'active',
              brokerAccountId: validatedData.brokerAccountId || `${accountId}-${validatedData.phaseType}`,
              brokerLogin: validatedData.brokerLogin,
              brokerPassword: validatedData.brokerPassword,
              brokerServer: validatedData.brokerServer,
              startingBalance: validatedData.startingBalance || account.startingBalance,
              currentBalance: validatedData.startingBalance || account.startingBalance,
              currentEquity: validatedData.startingBalance || account.startingBalance,
              highWaterMark: validatedData.startingBalance || account.startingBalance,
              ...getPhaseTargets(account as any, validatedData.phaseType),
              startedAt: new Date(),
            }
          })
          
          break
          
        default:
          throw new Error(`Unknown action: ${validatedData.action}`)
      }
      
      return { newPhase, updatedAccount, action: validatedData.action }
    })
    
    return NextResponse.json({
      success: true,
      action: result.action,
      phase: result.newPhase,
      account: result.updatedAccount,
      message: getActionMessage(result.action),
    })
    
  } catch (error) {
    console.error('Error managing phase:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to manage phase', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Helper functions
function getSuggestedActions(phases: any[], account: any): string[] {
  const actions: string[] = []
  const currentPhase = phases.find(p => p.status === 'active')
  
  if (!currentPhase) {
    actions.push('Create Phase 1 to start trading')
    return actions
  }
  
  if (currentPhase.summary.isBreached) {
    actions.push('Phase has been breached - consider resetting or moving to failed status')
  }
  
  if (currentPhase.summary.canAdvance) {
    actions.push(`Ready to advance from ${currentPhase.phaseType} to next phase`)
  }
  
  if (currentPhase.phaseType === 'funded' && !currentPhase.summary.isBreached) {
    actions.push('Request payout if profit targets are met')
  }
  
  return actions
}

function getNextPhaseType(currentPhaseType: string): string | null {
  switch (currentPhaseType) {
    case 'phase_1':
      return 'phase_2'
    case 'phase_2':
      return 'funded'
    case 'funded':
      return null // No next phase after funded
    default:
      return null
  }
}

function getBrokerAccountId(account: any, phaseType: string, override?: string): string {
  if (override) return override
  
  switch (phaseType) {
    case 'phase_1':
      return account.phase1AccountId || `${account.id}-phase1`
    case 'phase_2':
      return account.phase2AccountId || `${account.id}-phase2`
    case 'funded':
      return account.fundedAccountId || `${account.id}-funded`
    default:
      return `${account.id}-${phaseType}`
  }
}

function getBrokerLogin(account: any, phaseType: string): string | undefined {
  switch (phaseType) {
    case 'phase_1':
      return account.phase1Login
    case 'phase_2':
      return account.phase2Login
    case 'funded':
      return account.fundedLogin
    default:
      return undefined
  }
}

function getBrokerPassword(account: any, phaseType: string): string | undefined {
  switch (phaseType) {
    case 'phase_1':
      return account.phase1Password
    case 'phase_2':
      return account.phase2Password
    case 'funded':
      return account.fundedPassword
    default:
      return undefined
  }
}

function getBrokerServer(account: any, phaseType: string): string | undefined {
  switch (phaseType) {
    case 'phase_1':
      return account.phase1Server
    case 'phase_2':
      return account.phase2Server
    case 'funded':
      return account.fundedServer
    default:
      return undefined
  }
}

function getPhaseStartingBalance(account: any, phaseType: string, currentEquity: number): number {
  // For prop firms, usually the next phase starts with the same balance
  // but some firms allow carrying forward profits
  return account.startingBalance // Most common approach
}

function getPhaseTargets(account: any, phaseType: string) {
  const startingBalance = account.startingBalance
  
  switch (phaseType) {
    case 'phase_1':
      return {
        profitTarget: (startingBalance * account.phase1ProfitTarget) / 100,
        profitTargetPercent: account.phase1ProfitTarget,
        maxDrawdownAmount: (startingBalance * account.phase1MaxDrawdown) / 100,
        maxDrawdownPercent: account.phase1MaxDrawdown,
        dailyDrawdownAmount: (startingBalance * account.phase1DailyDrawdown) / 100,
        dailyDrawdownPercent: account.phase1DailyDrawdown,
        minTradingDays: account.minTradingDaysPhase1,
        maxTradingDays: account.maxTradingDaysPhase1,
      }
    case 'phase_2':
      return {
        profitTarget: (startingBalance * account.phase2ProfitTarget) / 100,
        profitTargetPercent: account.phase2ProfitTarget,
        maxDrawdownAmount: (startingBalance * account.phase2MaxDrawdown) / 100,
        maxDrawdownPercent: account.phase2MaxDrawdown,
        dailyDrawdownAmount: (startingBalance * account.phase2DailyDrawdown) / 100,
        dailyDrawdownPercent: account.phase2DailyDrawdown,
        minTradingDays: account.minTradingDaysPhase2,
        maxTradingDays: account.maxTradingDaysPhase2,
      }
    case 'funded':
      return {
        profitTarget: 0, // No profit target for funded accounts
        profitTargetPercent: 0,
        maxDrawdownAmount: (startingBalance * account.fundedMaxDrawdown) / 100,
        maxDrawdownPercent: account.fundedMaxDrawdown,
        dailyDrawdownAmount: (startingBalance * account.fundedDailyDrawdown) / 100,
        dailyDrawdownPercent: account.fundedDailyDrawdown,
        minTradingDays: 0,
        maxTradingDays: null,
      }
    default:
      throw new Error(`Unknown phase type: ${phaseType}`)
  }
}

function getActionMessage(action: string): string {
  switch (action) {
    case 'advance':
      return 'Successfully advanced to next phase'
    case 'fail':
      return 'Phase marked as failed'
    case 'reset':
      return 'Phase reset successfully'
    case 'create':
      return 'New phase created successfully'
    default:
      return 'Phase action completed'
  }
}
