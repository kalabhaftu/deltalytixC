/**
 * Individual Payout API
 * Handles operations for specific payout requests
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

// GET /api/prop-firm/payouts/[id] - Get payout details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const payoutId = params.id

    const payout = await prisma.payout.findFirst({
      where: {
        id: payoutId,
        account: { userId }
      },
      include: {
        account: {
          select: {
            id: true,
            number: true,
            name: true,
            propfirm: true,
            status: true,
            profitSplitPercent: true
          }
        }
      }
    })

    if (!payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: payout
    })

  } catch (error) {
    console.error('Error fetching payout:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payout' },
      { status: 500 }
    )
  }
}

// PATCH /api/prop-firm/payouts/[id] - Update payout (approve/reject/pay)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const payoutId = params.id
    const body = await request.json()

    // Validate input
    const parseResult = PropFirmSchemas.UpdatePayout.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const updateData = parseResult.data

    // Get payout with account info
    const payout = await prisma.payout.findFirst({
      where: {
        id: payoutId,
        account: { userId }
      },
      include: {
        account: {
          include: {
            phases: {
              where: { phaseStatus: 'active' },
              take: 1
            }
          }
        }
      }
    })

    if (!payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    const account = payout.account
    const currentPhase = account.phases[0]

    // Handle payout completion (when status changes to PAID)
    if (updateData.status === 'PAID' && payout.status !== 'PAID') {
      if (!updateData.amountPaid) {
        return NextResponse.json(
          { error: 'Amount paid is required when marking payout as paid' },
          { status: 400 }
        )
      }

      // Calculate payout effects
      const payoutEffects = PropFirmBusinessRules.calculatePayoutEffects(
        account as any,
        currentPhase?.currentBalance || account.startingBalance,
        updateData.amountPaid
      )

      // Apply payout effects in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update payout
        const updatedPayout = await tx.payout.update({
          where: { id: payoutId },
          data: {
            ...updateData,
            paidAt: new Date(),
          }
        })

        // Apply account effects if needed
        if (payoutEffects.shouldReset) {
          // Close current phase
          if (currentPhase) {
            await tx.accountPhase.update({
              where: { id: currentPhase.id },
              data: {
                phaseStatus: 'passed',
                phaseEndAt: new Date()
              }
            })
          }

          // Create new funded phase with reset balance
          const newPhase = await tx.accountPhase.create({
            data: {
              accountId: account.id,
              phaseType: 'funded',
              phaseStatus: 'active',
              currentEquity: payoutEffects.newBalance,
              currentBalance: payoutEffects.newBalance,
              highestEquitySincePhaseStart: payoutEffects.newBalance,
              netProfitSincePhaseStart: 0,
              totalTrades: 0,
              winningTrades: 0,
              totalCommission: 0,
            }
          })

          // Reset daily anchors if required
          if (payoutEffects.resetAnchors) {
            await tx.dailyAnchor.deleteMany({
              where: { accountId: account.id }
            })

            await tx.dailyAnchor.create({
              data: {
                accountId: account.id,
                date: new Date(),
                anchorEquity: payoutEffects.newBalance,
              }
            })
          }

          // Create equity snapshot
          await tx.equitySnapshot.create({
            data: {
              accountId: account.id,
              phaseId: newPhase.id,
              equity: payoutEffects.newBalance,
              balance: payoutEffects.newBalance,
              openPnl: 0,
            }
          })

          // Create transition record
          await tx.accountTransition.create({
            data: {
              accountId: account.id,
              fromPhaseId: currentPhase?.id,
              toPhaseId: newPhase.id,
              reason: `Payout processed with account reset`,
              triggeredBy: userId,
              metadata: {
                payoutId: updatedPayout.id,
                payoutAmount: updateData.amountPaid,
                resetBalance: payoutEffects.newBalance,
                resetType: 'payout_reset'
              }
            }
          })

          // Update account balance if changed
          if (account.fundedResetBalance !== payoutEffects.newBalance) {
            await tx.account.update({
              where: { id: account.id },
              data: { fundedResetBalance: payoutEffects.newBalance }
            })
          }

        } else if (payoutEffects.newBalance !== currentPhase?.currentBalance) {
          // Just update current phase balance
          if (currentPhase) {
            await tx.accountPhase.update({
              where: { id: currentPhase.id },
              data: {
                currentBalance: payoutEffects.newBalance,
                currentEquity: payoutEffects.newBalance,
              }
            })

            // Create equity snapshot
            await tx.equitySnapshot.create({
              data: {
                accountId: account.id,
                phaseId: currentPhase.id,
                equity: payoutEffects.newBalance,
                balance: payoutEffects.newBalance,
                openPnl: 0,
              }
            })
          }
        }

        // Log payout completion
        await tx.auditLog.create({
          data: {
            userId,
            accountId: account.id,
            action: 'PAYOUT_COMPLETED',
            entity: 'payout',
            entityId: payoutId,
            oldValues: payout,
            newValues: updatedPayout,
            metadata: {
              payoutEffects,
              previousBalance: currentPhase?.currentBalance,
              newBalance: payoutEffects.newBalance
            }
          }
        })

        return updatedPayout
      })

      return NextResponse.json({
        success: true,
        data: result,
        message: 'Payout processed successfully'
      })

    } else {
      // Simple update without balance effects
      const updatedPayout = await prisma.$transaction(async (tx) => {
        const updated = await tx.payout.update({
          where: { id: payoutId },
          data: updateData
        })

        // Log the update
        await tx.auditLog.create({
          data: {
            userId,
            accountId: account.id,
            action: 'PAYOUT_UPDATED',
            entity: 'payout',
            entityId: payoutId,
            oldValues: payout,
            newValues: updateData,
          }
        })

        return updated
      })

      return NextResponse.json({
        success: true,
        data: updatedPayout,
        message: 'Payout updated successfully'
      })
    }

  } catch (error) {
    console.error('Error updating payout:', error)
    return NextResponse.json(
      { error: 'Failed to update payout' },
      { status: 500 }
    )
  }
}

// DELETE /api/prop-firm/payouts/[id] - Cancel payout request
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const userId = await getUserId()
    const payoutId = params.id

    // Get payout
    const payout = await prisma.payout.findFirst({
      where: {
        id: payoutId,
        account: { userId }
      },
      include: {
        account: {
          select: { id: true, number: true }
        }
      }
    })

    if (!payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      )
    }

    // Only allow cancellation of pending payouts
    if (payout.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only cancel pending payout requests' },
        { status: 400 }
      )
    }

    // Delete payout and log action
    await prisma.$transaction(async (tx) => {
      await tx.payout.delete({
        where: { id: payoutId }
      })

      // Log cancellation
      await tx.auditLog.create({
        data: {
          userId,
          accountId: payout.account.id,
          action: 'PAYOUT_CANCELLED',
          entity: 'payout',
          entityId: payoutId,
          oldValues: payout,
          metadata: { cancelledAt: new Date() }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Payout request cancelled'
    })

  } catch (error) {
    console.error('Error cancelling payout:', error)
    return NextResponse.json(
      { error: 'Failed to cancel payout' },
      { status: 500 }
    )
  }
}
