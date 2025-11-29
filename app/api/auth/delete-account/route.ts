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


    // Create Supabase admin client for user deletion
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
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

      // Get user's email for business invitations
      const user = await tx.user.findUnique({ 
        where: { auth_user_id: userId },
        select: { id: true, email: true }
      })
      
      // If user doesn't exist in our database, skip database deletion
      if (!user) {
        // User only exists in Supabase auth, not in our database
        // This can happen if database sync failed during signup
        return
      }
      
      // Use the internal user.id for queries on related tables
      const internalUserId = user.id

      // Get user's trade IDs and account IDs for related deletions
      const userTradeIds = await tx.trade.findMany({
        where: { userId: internalUserId },
        select: { id: true }
      })
      
      const userAccounts = await tx.account.findMany({
        where: { userId: internalUserId },
        select: { id: true }
      })

      const tradeIds = userTradeIds.map(trade => trade.id)
      const accountIds = userAccounts.map(acc => acc.id)

      if (accountIds.length > 0) {
        await tx.dailyAnchor.deleteMany({
          where: {
            PhaseAccount: {
              MasterAccount: {
                userId: internalUserId
              }
            }
          }
        })
      }

      await tx.dashboardTemplate.deleteMany({
        where: { userId: internalUserId }
      })

      await tx.trade.deleteMany({
        where: { userId: internalUserId }
      })
      
      await tx.account.deleteMany({
        where: { userId: internalUserId }
      })
      
      await tx.group.deleteMany({
        where: { userId: internalUserId }
      })

      await tx.user.delete({
        where: { id: internalUserId }
      })

    }, {
      timeout: 30000 // 30 second timeout instead of default 5 seconds
    })

    // After successfully deleting from our database, delete from Supabase Auth
    
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (authError) {
      // If we can't delete from auth, we should probably restore the user data
      // But for now, we'll log the error and continue
      // In a production environment, you might want to implement a rollback mechanism
    } else {
    }


    return NextResponse.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted'
    })

  } catch (error) {
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
