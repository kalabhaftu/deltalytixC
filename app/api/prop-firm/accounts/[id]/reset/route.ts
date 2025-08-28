/**
 * Account Reset API
 * Handles resetting failed accounts or funded account cycles
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

// POST /api/prop-firm/accounts/[id]/reset - Reset account
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const accountId = params.id
    const body = await request.json()

    // Validate input
    const parseResult = PropFirmSchemas.ResetAccount.safeParse({
      ...body,
      accountId
    })
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid reset request', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const resetData = parseResult.data

    // Get account with current state
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
        dailyDrawdownAmount: true,
        dailyDrawdownType: true,
        maxDrawdownAmount: true,
        maxDrawdownType: true,
        drawdownModeMax: true,
        timezone: true,
        dailyResetTime: true,
        allowManualPhaseOverride: true,
        fundedResetBalance: true,
        phases: {
          orderBy: { createdAt: 'desc' }
        },
        trades: {
          where: { accountId },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        payouts: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        breaches: {
          orderBy: { breachTime: 'desc' },
          take: 5
        }
      }
    })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    const currentPhase = account.phases.find(p => p.phaseStatus === 'active')
    
    // Determine reset type based on account status
    let resetType: 'failed_account' | 'funded_cycle' | 'manual_reset'
    
    if (account.status === 'failed') {
      resetType = 'failed_account'
    } else if (account.status === 'funded' && currentPhase?.phaseType === 'funded') {
      resetType = 'funded_cycle'
    } else {
      resetType = 'manual_reset'
    }

    // Validate reset permissions
    if (resetType === 'manual_reset' && !account.allowManualPhaseOverride) {
      return NextResponse.json(
        { error: 'Manual reset not allowed for this account' },
        { status: 403 }
      )
    }

    // Perform reset in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Close current active phase
      if (currentPhase) {
        await tx.accountPhase.update({
          where: { id: currentPhase.id },
          data: {
            phaseStatus: 'failed',
            phaseEndAt: new Date()
          }
        })
      }

      // Determine reset balance
      let resetBalance = account.startingBalance
      if (resetType === 'funded_cycle' && account.fundedResetBalance) {
        resetBalance = account.fundedResetBalance
      }

      // Clear trades if requested
      if (resetData.clearTrades) {
        await tx.trade.deleteMany({
          where: { accountId }
        })
      }

      // Clear equity snapshots and daily anchors for fresh start
      await tx.equitySnapshot.deleteMany({
        where: { accountId }
      })

      await tx.dailyAnchor.deleteMany({
        where: { accountId }
      })

      // Create new Phase 1
      const profitTarget = PropFirmBusinessRules.getDefaultProfitTarget(
        'phase_1',
        resetBalance,
        account.evaluationType
      )

      const newPhase = await tx.accountPhase.create({
        data: {
          accountId: account.id,
          phaseType: resetType === 'funded_cycle' ? 'funded' : 'phase_1',
          phaseStatus: 'active',
          profitTarget: resetType === 'funded_cycle' ? undefined : profitTarget,
          currentEquity: resetBalance,
          currentBalance: resetBalance,
          highestEquitySincePhaseStart: resetBalance,
          netProfitSincePhaseStart: 0,
          totalTrades: 0,
          winningTrades: 0,
          totalCommission: 0,
        }
      })

      // Update account status
      const newStatus = resetType === 'funded_cycle' ? 'funded' : 'active'
      const updatedAccount = await tx.account.update({
        where: { id: accountId },
        data: {
          status: newStatus,
          resetDate: new Date(),
          // Update balance if funded reset
          ...(resetType === 'funded_cycle' && account.fundedResetBalance ? {
            startingBalance: resetBalance
          } : {})
        }
      })

      // Create new daily anchor
      await tx.dailyAnchor.create({
        data: {
          accountId: account.id,
          date: new Date(),
          anchorEquity: resetBalance,
        }
      })

      // Create initial equity snapshot
      await tx.equitySnapshot.create({
        data: {
          accountId: account.id,
          phaseId: newPhase.id,
          equity: resetBalance,
          balance: resetBalance,
          openPnl: 0,
        }
      })

      // Create transition record
      await tx.accountTransition.create({
        data: {
          accountId: account.id,
          fromPhaseId: currentPhase?.id,
          toPhaseId: newPhase.id,
          fromStatus: account.status,
          toStatus: newStatus,
          reason: `Account reset: ${resetData.reason}`,
          triggeredBy: userId,
          metadata: {
            resetType,
            clearTrades: resetData.clearTrades,
            previousBalance: account.startingBalance,
            newBalance: resetBalance,
            resetAt: new Date().toISOString()
          }
        }
      })

      // Log in audit trail
      await tx.auditLog.create({
        data: {
          userId,
          accountId: account.id,
          action: 'ACCOUNT_RESET',
          entity: 'account',
          entityId: account.id,
          oldValues: {
            status: account.status,
            currentPhaseId: currentPhase?.id,
            balance: account.startingBalance
          },
          newValues: {
            status: newStatus,
            newPhaseId: newPhase.id,
            balance: resetBalance
          },
          metadata: {
            resetType,
            reason: resetData.reason,
            clearTrades: resetData.clearTrades
          }
        }
      })

      return {
        account: updatedAccount,
        newPhase,
        resetType,
        previousPhase: currentPhase
      }
    })

    // Prepare response message
    let message = 'Account reset successfully'
    if (result.resetType === 'failed_account') {
      message = 'Failed account reset to Phase 1'
    } else if (result.resetType === 'funded_cycle') {
      message = 'Funded account cycle reset'
    }

    return NextResponse.json({
      success: true,
      data: {
        account: result.account,
        newPhase: result.newPhase,
        resetType: result.resetType,
        message: resetData.reason
      },
      message
    })

  } catch (error) {
    console.error('Error resetting account:', error)
    return NextResponse.json(
      { error: 'Failed to reset account' },
      { status: 500 }
    )
  }
}
