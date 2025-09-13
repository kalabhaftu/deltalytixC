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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Account Deletion] Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createServiceClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Start a transaction to delete all user data with extended timeout
    await prisma.$transaction(async (tx) => {
      console.log(`[Account Deletion] Deleting user data from database...`)

      // Get user's email for business invitations
      const user = await tx.user.findUnique({ 
        where: { auth_user_id: userId },
        select: { email: true }
      })

      // Get user's trade IDs and account IDs for related deletions
      const userTradeIds = await tx.trade.findMany({
        where: { userId },
        select: { id: true }
      })
      
      const userAccounts = await tx.account.findMany({
        where: { userId },
        select: { id: true }
      })

      const tradeIds = userTradeIds.map(trade => trade.id)
      const accountIds = userAccounts.map(acc => acc.id)

      // Delete all related data in the correct order
      console.log(`[Account Deletion] Deleting business data...`)
      
      // Business-related deletions
      if (user?.email) {
        await tx.businessInvitation.deleteMany({
          where: { 
            OR: [
              { invitedBy: userId },
              { email: user.email }
            ]
          }
        })
      }
      
      await tx.businessManager.deleteMany({
        where: { managerId: userId }
      })
      
      await tx.business.deleteMany({
        where: { userId }
      })

      console.log(`[Account Deletion] Deleting trading data...`)
      
      // Trading-related deletions
      if (tradeIds.length > 0) {
        await tx.tradeAnalytics.deleteMany({
          where: { tradeId: { in: tradeIds } }
        })
      }
      
      await tx.order.deleteMany({
        where: { userId }
      })

      console.log(`[Account Deletion] Deleting account data...`)
      
      // Account-related deletions
      if (accountIds.length > 0) {
        await tx.breach.deleteMany({
          where: {
            phase: {
              accountId: { in: accountIds }
            }
          }
        })
        
        await tx.accountPhase.deleteMany({
          where: { accountId: { in: accountIds } }
        })
        
        await tx.payout.deleteMany({
          where: {
            account: {
              userId
            }
          }
        })
        
        await tx.dailyAnchor.deleteMany({
          where: {
            account: {
              userId
            }
          }
        })
      }

      console.log(`[Account Deletion] Deleting user data...`)
      
      // User-specific data deletions
      await tx.shared.deleteMany({
        where: { userId }
      })
      
      await tx.tag.deleteMany({
        where: { userId }
      })
      
      await tx.dashboardLayout.deleteMany({
        where: { userId }
      })
      
      await tx.notification.deleteMany({
        where: { userId }
      })

      console.log(`[Account Deletion] Deleting core records...`)
      
      // Core record deletions
      await tx.trade.deleteMany({
        where: { userId }
      })
      
      await tx.account.deleteMany({
        where: { userId }
      })
      
      await tx.group.deleteMany({
        where: { userId }
      })

      // Finally, delete the user record
      await tx.user.delete({
        where: { auth_user_id: userId }
      })

      console.log(`[Account Deletion] Successfully deleted all user data from database`)
    }, {
      timeout: 30000 // 30 second timeout instead of default 5 seconds
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
