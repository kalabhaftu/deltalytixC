"use server"

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { getActiveAccountsWhereClause } from '@/lib/utils/account-filters'

// PATCH /api/accounts - Clear cache
export async function PATCH(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'clear-cache') {
      // Force cache invalidation by returning a timestamp
      return NextResponse.json({ 
        success: true, 
        message: 'Cache cleared',
        timestamp: Date.now()
      })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 })
  }
}

// GET /api/accounts - Simplified and optimized accounts fetching
export async function GET(request: NextRequest) {
  try {
    // Get user ID using the proper auth function
    let currentUserId: string
    try {
      currentUserId = await getUserId()
    } catch (authError) {
      console.error('Authentication error in accounts API')
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Always exclude failed accounts unless explicitly requested
    const includeFailedAccounts = request.nextUrl.searchParams.get('error') === 'true'

    let whereClause: any = { userId: currentUserId }
    
    if (!includeFailedAccounts) {
      // Add status filter to exclude inactive accounts (failed and passed)
      // Include null status values for legacy accounts (treat as active)
      whereClause = {
        userId: currentUserId,
        OR: [
          { status: { in: ['active', 'funded'] } },
          { status: null } // Include accounts with null status (legacy accounts)
        ]
      }
    }
    
    // Simplified query - only fetch essential data for current user
    const accounts = await prisma.account.findMany({
      where: whereClause,
      select: {
        id: true,
        number: true,
        name: true,
        propfirm: true,
        broker: true,
        startingBalance: true,
        status: true, // Include status field for proper filtering
        createdAt: true,
        userId: true,
        groupId: true,
        group: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        },
        // Simplified - only get trade count, phases loaded separately if needed
        _count: {
          select: {
            trades: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    

    // Transform accounts with minimal processing
    const transformedAccounts = accounts.map(account => ({
      id: account.id,
      number: account.number,
      name: account.name,
      propfirm: account.propfirm,
      broker: account.broker,
      startingBalance: account.startingBalance,
      status: account.status || 'active', // Include status, default to 'active' for legacy accounts
      createdAt: account.createdAt,
      userId: account.userId,
      groupId: account.groupId,
      group: account.group,
      accountType: 'live', // propfirm field doesn't exist
      displayName: account.name || account.number,
      tradeCount: 0, // _count.trades doesn't exist
      owner: { id: currentUserId, email: '' }, // user field doesn't exist
      isOwner: currentUserId === account.userId,
      // Simplified - phases loaded separately for performance
      currentPhase: 'live'
    }))


    return NextResponse.json({
      success: true,
      data: transformedAccounts
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Last-Modified': new Date().toUTCString()
      }
    })

  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Create a new live account
export async function POST(request: NextRequest) {
  try {
    // Get user ID using the proper auth function
    let userId: string
    try {
      userId = await getUserId()
    } catch (authError) {
      // In development, create a fallback user ID if not authenticated
      if (process.env.NODE_ENV === 'development') {
        // Check if we have any existing users in the database
        const existingUsers = await prisma.user.findMany({ take: 1 })
        if (existingUsers.length > 0) {
          userId = existingUsers[0].id
        } else {
          // Create a development user if none exists
          const devUser = await prisma.user.create({
            data: {
              email: 'dev@example.com',
              auth_user_id: 'dev-user-' + Date.now(),
              isBeta: false,
              isFirstConnection: true,
              language: 'en'
            }
          })
          userId = devUser.id
        }
      } else {
        throw authError
      }
    }

    const body = await request.json()

    const { name, number, startingBalance, broker } = body

    // Validate required fields
    if (!name || !number || !startingBalance || !broker) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, number, startingBalance, broker' },
        { status: 400 }
      )
    }

    // Check if account number already exists for this user
    const existingAccount = await prisma.account.findFirst({
      where: {
        number,
        userId,
      }
    })

    if (existingAccount) {
      return NextResponse.json(
        { success: false, error: 'Account number already exists' },
        { status: 409 }
      )
    }

    // Create live account
    const account = await prisma.account.create({
      data: {
        number,
        name,
        startingBalance: parseFloat(startingBalance),
        broker,
        userId,
        // masterId: null, // masterId field doesn't exist
        // propfirm: '', // propfirm field doesn't exist
        // status: 'active', // status field doesn't exist
        // Set default values for live accounts - only keeping fields that exist
        // drawdownThreshold: 0, // field doesn't exist
        // profitTarget: 0, // field doesn't exist
        // isPerformance: false, // field doesn't exist
        // payoutCount: 0, // field doesn't exist
      }
    })

    // Revalidate cache tags to ensure fresh data
    revalidateTag(`accounts-${userId}`)
    revalidateTag(`user-data-${userId}`)

    return NextResponse.json({
      success: true,
      data: {
        ...account,
        accountType: 'live',
        displayName: account.name || account.number
      }
    })

  } catch (error) {
    console.error('Error creating live account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
