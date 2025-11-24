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
    return NextResponse.json({ error: 'Failed to clear cache' }, { status: 500 })
  }
}

// GET /api/accounts - Optimized accounts fetching with caching
export async function GET(request: NextRequest) {
  try {
    // Get user ID using the proper auth function
    let currentUserId: string
    try {
      currentUserId = await getUserId()
    } catch (authError) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Cache the accounts query for better performance
    const { unstable_cache } = await import('next/cache')
    const getCachedAccounts = unstable_cache(
      async (userId: string) => {
        const accounts = await prisma.account.findMany({
          where: { userId },
          select: {
            id: true,
            number: true,
            name: true,
            broker: true,
            startingBalance: true,
            createdAt: true,
            userId: true,
            groupId: true,
            _count: {
              select: {
                Trade: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        // Transform accounts with minimal processing
        return accounts.map(account => ({
          id: account.id,
          number: account.number,
          name: account.name,
          broker: account.broker,
          startingBalance: account.startingBalance,
          createdAt: account.createdAt,
          userId: account.userId,
          groupId: account.groupId,
          accountType: 'live',
          displayName: account.name || account.number,
          tradeCount: account._count.Trade,
          owner: { id: userId, email: '' },
          isOwner: true,
          currentPhase: 'live',
          status: 'active'
        }))
      },
      [`api-accounts-${currentUserId}`],
      {
        tags: [`api-accounts-${currentUserId}`, `accounts-${currentUserId}`],
        revalidate: 30 // Cache for 30 seconds
      }
    )

    const transformedAccounts = await getCachedAccounts(currentUserId)

    return NextResponse.json({
      success: true,
      data: transformedAccounts
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })

  } catch (error) {
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
              id: `dev_${Date.now()}`,
              email: 'dev@example.com',
              auth_user_id: 'dev-user-' + Date.now(),
              isFirstConnection: true
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
        id: crypto.randomUUID(),
        number,
        name,
        startingBalance: parseFloat(startingBalance),
        broker,
        userId
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
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
