/**
 * User Data Management API
 * DELETE /api/user/data - Delete all user data (keeps account intact)
 * 
 * This deletes all user DATA but keeps the user account.
 * For complete account deletion, use /api/user/account endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { prisma } from '@/lib/prisma'
import { revalidateTag } from 'next/cache'

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify confirmation in request body
    const body = await request.json().catch(() => ({}))
    if (body.confirmation !== 'DELETE ALL DATA') {
      return NextResponse.json(
        { success: false, error: 'Confirmation required. Please type "DELETE ALL DATA" to confirm.' },
        { status: 400 }
      )
    }

    // First, get the internal user ID from auth_user_id
    const user = await prisma.user.findUnique({
      where: { auth_user_id: userId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const internalUserId = user.id

    // Delete all user data in a transaction
    // Order matters due to foreign key constraints
    await prisma.$transaction(async (tx) => {
      // 1. Delete all trades
      await tx.trade.deleteMany({
        where: { userId: internalUserId }
      })

      // 3. Delete prop firm related data
      // Breach records, daily anchors, payouts (FK to phase accounts)
      const masterAccountIds = await tx.masterAccount.findMany({
        where: { userId: internalUserId },
        select: { id: true }
      })
      const masterIds = masterAccountIds.map(m => m.id)

      if (masterIds.length > 0) {
        // Get phase account IDs
        const phaseAccounts = await tx.phaseAccount.findMany({
          where: { masterAccountId: { in: masterIds } },
          select: { id: true }
        })
        const phaseIds = phaseAccounts.map(p => p.id)

        if (phaseIds.length > 0) {
          await tx.breachRecord.deleteMany({
            where: { phaseAccountId: { in: phaseIds } }
          })
          await tx.dailyAnchor.deleteMany({
            where: { phaseAccountId: { in: phaseIds } }
          })
          await tx.payout.deleteMany({
            where: { phaseAccountId: { in: phaseIds } }
          })
        }

        // Delete phase accounts
        await tx.phaseAccount.deleteMany({
          where: { masterAccountId: { in: masterIds } }
        })

        // Delete master accounts
        await tx.masterAccount.deleteMany({
          where: { userId: internalUserId }
        })
      }

      // 4. Delete live account transactions
      await tx.liveAccountTransaction.deleteMany({
        where: { userId: internalUserId }
      })

      // 5. Delete regular accounts
      await tx.account.deleteMany({
        where: { userId: internalUserId }
      })

      // 6. Groups removed - no longer used

      // 7. Delete daily notes
      await tx.dailyNote.deleteMany({
        where: { userId: internalUserId }
      })

      // 8. Delete backtest trades
      await tx.backtestTrade.deleteMany({
        where: { userId: internalUserId }
      })

      // 9. Delete tags
      await tx.tradeTag.deleteMany({
        where: { userId: internalUserId }
      })

      // 10. Delete notifications
      await tx.notification.deleteMany({
        where: { userId: internalUserId }
      })

      // 11. Delete dashboard templates
      await tx.dashboardTemplate.deleteMany({
        where: { userId: internalUserId }
      })

      // 12. Reset user settings (keep account)
      await tx.user.update({
        where: { id: internalUserId },
        data: {
          accountFilterSettings: null,
          isFirstConnection: true
        }
      })
    }, {
      timeout: 60000, // 60 second timeout for large deletions
      maxWait: 65000
    })

    // Invalidate all caches (use internal user ID for consistency with other cache keys)
    revalidateTag(`trades-${internalUserId}`)
    revalidateTag(`accounts-${internalUserId}`)
    revalidateTag(`user-data-${internalUserId}`)

    return NextResponse.json({
      success: true,
      message: 'All user data has been permanently deleted. Your account remains active.'
    })

  } catch (error) {
    console.error('Delete all data error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete data. Please try again.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  )
}

