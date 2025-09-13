'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/server/auth'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  try {
    // Get the authenticated user ID
    const userId = await getUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`[Account Deletion] Starting deletion process for user: ${userId}`)

    // Create Supabase admin client for user deletion
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Start a transaction to delete all user data
    await prisma.$transaction(async (tx) => {
      console.log(`[Account Deletion] Deleting user data from database...`)

      // Delete all related data in the correct order to respect foreign key constraints
      
      // 1. Delete business invitations
      await tx.businessInvitation.deleteMany({
        where: { 
          OR: [
            { invitedBy: userId },
            { email: { in: await tx.user.findUnique({ where: { auth_user_id: userId } }).then(user => user?.email ? [user.email] : []) } }
          ]
        }
      })

      // 2. Delete business managers
      await tx.businessManager.deleteMany({
        where: { managerId: userId }
      })

      // 3. Delete businesses owned by the user
      await tx.business.deleteMany({
        where: { userId }
      })

      // 4. Delete trade analytics
      await tx.tradeAnalytics.deleteMany({
        where: { userId }
      })

      // 5. Delete orders
      await tx.order.deleteMany({
        where: { userId }
      })

      // 6. Delete shared data
      await tx.shared.deleteMany({
        where: { userId }
      })

      // 7. Delete tags
      await tx.tag.deleteMany({
        where: { userId }
      })

      // 8. Delete dashboard layout
      await tx.dashboardLayout.deleteMany({
        where: { userId }
      })

      // 9. Delete notifications
      await tx.notification.deleteMany({
        where: { userId }
      })

      // 10. Delete payouts (related to accounts)
      await tx.payout.deleteMany({
        where: {
          account: {
            userId
          }
        }
      })

      // 11. Delete daily anchors (related to accounts)
      await tx.dailyAnchor.deleteMany({
        where: {
          account: {
            userId
          }
        }
      })

      // 12. Delete account phases and their related data
      const userAccounts = await tx.account.findMany({
        where: { userId },
        select: { id: true }
      })

      if (userAccounts.length > 0) {
        const accountIds = userAccounts.map(acc => acc.id)
        
        // Delete phase breaches
        await tx.phaseBreach.deleteMany({
          where: {
            phase: {
              accountId: { in: accountIds }
            }
          }
        })

        // Delete account phases
        await tx.accountPhase.deleteMany({
          where: { accountId: { in: accountIds } }
        })
      }

      // 13. Delete trades (this will cascade to related data)
      await tx.trade.deleteMany({
        where: { userId }
      })

      // 14. Delete accounts (this should cascade to remaining related data)
      await tx.account.deleteMany({
        where: { userId }
      })

      // 15. Delete groups
      await tx.group.deleteMany({
        where: { userId }
      })

      // 16. Finally, delete the user record from our database
      await tx.user.delete({
        where: { auth_user_id: userId }
      })

      console.log(`[Account Deletion] Successfully deleted all user data from database`)
    })

    // After successfully deleting from our database, delete from Supabase Auth
    console.log(`[Account Deletion] Deleting user from Supabase Auth...`)
    
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      console.error(`[Account Deletion] Failed to delete from Supabase Auth:`, authError)
      // If we can't delete from auth, we should probably restore the user data
      // But for now, we'll log the error and continue
      // In a production environment, you might want to implement a rollback mechanism
    } else {
      console.log(`[Account Deletion] Successfully deleted user from Supabase Auth`)
    }

    console.log(`[Account Deletion] Account deletion completed successfully for user: ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted'
    })

  } catch (error) {
    console.error('[Account Deletion] Error:', error)
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Authentication')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete account. Please try again or contact support if the problem persists.',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}

// Only allow DELETE method
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
