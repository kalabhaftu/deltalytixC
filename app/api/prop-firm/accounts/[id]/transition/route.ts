import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/lib/auth/get-user-id'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'

const prisma = new PrismaClient()

interface RouteParams {
  params: {
    id: string
  }
}

// POST /api/prop-firm/accounts/[id]/transition - Handle phase transition
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    
    const body = await request.json()
    const { newAccountId, nextPhaseType, currentPhaseProfit } = body

    // Validate input
    if (!nextPhaseType || !['phase_2', 'funded'].includes(nextPhaseType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid next phase type' },
        { status: 400 }
      )
    }

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
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    const currentPhase = account.phases[0]
    if (!currentPhase) {
      return NextResponse.json(
        { success: false, error: 'No active phase found' },
        { status: 400 }
      )
    }

    // Validate phase progression
    const canProgress = 
      (currentPhase.phaseType === 'phase_1' && nextPhaseType === 'phase_2') ||
      (currentPhase.phaseType === 'phase_2' && nextPhaseType === 'funded')

    if (!canProgress) {
      return NextResponse.json(
        { success: false, error: `Cannot transition from ${currentPhase.phaseType} to ${nextPhaseType}` },
        { status: 400 }
      )
    }

    // Check if account ID already exists (if provided)
    if (newAccountId && newAccountId.trim()) {
      const existingAccount = await prisma.account.findFirst({
        where: { 
          number: newAccountId.trim(),
          userId,
          id: { not: accountId } // Exclude current account
        }
      })

      if (existingAccount) {
        return NextResponse.json(
          { success: false, error: 'Account ID already exists' },
          { status: 400 }
        )
      }
    }

    // Perform the transition in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark current phase as passed and set end date
      await tx.accountPhase.update({
        where: { id: currentPhase.id },
        data: {
          phaseStatus: 'passed',
          phaseEndAt: new Date(),
          netProfitSincePhaseStart: currentPhaseProfit || currentPhase.netProfitSincePhaseStart
        }
      })

      // 2. Update account number if new ID provided
      let updatedAccount = account
      if (newAccountId && newAccountId.trim()) {
        updatedAccount = await tx.account.update({
          where: { id: accountId },
          data: { number: newAccountId.trim() }
        })
      }

      // 3. Calculate new phase settings
      const newPhaseSettings = {
        profitTarget: nextPhaseType === 'funded' 
          ? undefined 
          : PropFirmBusinessRules.getDefaultProfitTarget(
              nextPhaseType,
              account.startingBalance,
              account.evaluationType
            ),
        dailyDrawdownLimit: account.dailyDrawdownAmount,
        maxDrawdownLimit: account.maxDrawdownAmount
      }

      // 4. Create new phase
      const newPhase = await tx.accountPhase.create({
        data: {
          accountId: accountId,
          phaseType: nextPhaseType,
          phaseStatus: 'active',
          phaseStartAt: new Date(),
          startingBalance: account.startingBalance,
          currentBalance: account.startingBalance, // Reset balance for new phase
          currentEquity: account.startingBalance,
          profitTarget: newPhaseSettings.profitTarget,
          netProfitSincePhaseStart: 0, // Reset profit tracking
          dailyDrawdownLimit: newPhaseSettings.dailyDrawdownLimit,
          maxDrawdownLimit: newPhaseSettings.maxDrawdownLimit,
          highWaterMark: account.startingBalance,
          lastDailyResetAt: new Date()
        }
      })

      // 5. Update account status if transitioning to funded
      if (nextPhaseType === 'funded') {
        await tx.account.update({
          where: { id: accountId },
          data: { status: 'funded' }
        })
      }

      // 6. Record the transition
      await tx.accountTransition.create({
        data: {
          accountId: accountId,
          fromPhaseId: currentPhase.id,
          toPhaseId: newPhase.id,
          fromStatus: 'active',
          toStatus: nextPhaseType === 'funded' ? 'funded' : 'active',
          reason: 'profit_target_achieved',
          triggeredBy: userId,
          metadata: {
            profitAchieved: currentPhaseProfit || currentPhase.netProfitSincePhaseStart,
            newAccountNumber: newAccountId?.trim() || null,
            fromPhaseType: currentPhase.phaseType,
            toPhaseType: nextPhaseType
          }
        }
      })

      return {
        account: updatedAccount,
        previousPhase: currentPhase,
        newPhase: newPhase
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        message: `Successfully transitioned to ${nextPhaseType}`,
        accountId: accountId,
        newAccountNumber: newAccountId?.trim() || account.number,
        previousPhase: {
          type: result.previousPhase.phaseType,
          status: 'passed',
          profit: currentPhaseProfit || result.previousPhase.netProfitSincePhaseStart
        },
        newPhase: {
          type: result.newPhase.phaseType,
          status: result.newPhase.phaseStatus,
          profitTarget: result.newPhase.profitTarget,
          startingBalance: result.newPhase.startingBalance
        }
      }
    })

  } catch (error) {
    console.error('Phase transition error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error during phase transition' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
