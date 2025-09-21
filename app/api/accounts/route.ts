"use server"

import { NextRequest, NextResponse } from 'next/server'
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
      console.log('[API/accounts] User authenticated:', currentUserId)
    } catch (authError) {
      console.error('Authentication error in accounts API:', authError)
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Always exclude failed accounts unless explicitly requested
    const includeFailedAccounts = request.nextUrl.searchParams.get('error') === 'true'
    console.log('[API/accounts] Include failed accounts:', includeFailedAccounts)
    
    let whereClause: any = { userId: currentUserId }
    
    if (!includeFailedAccounts) {
      // Add status filter to exclude inactive accounts (failed and passed)
      whereClause = {
        userId: currentUserId,
        status: {
          in: ['active', 'funded']
        }
      }
    }
    
    console.log('[API/accounts] Where clause:', JSON.stringify(whereClause))

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
    
    console.log('[API/accounts] Raw accounts from DB:', accounts.length, 'accounts found')
    console.log('[API/accounts] Account details:', accounts.map(a => ({ 
      id: a.id, 
      number: a.number, 
      status: a.status, 
      userId: a.userId 
    })))

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
      accountType: account.propfirm ? 'prop-firm' : 'live',
      displayName: account.name || account.number,
      tradeCount: account._count.trades,
      owner: account.user,
      isOwner: currentUserId === account.userId,
      // Simplified - phases loaded separately for performance
      currentPhase: null
    }))

    console.log('[API/accounts] Transformed accounts:', transformedAccounts.length, 'accounts')
    console.log('[API/accounts] Response data:', transformedAccounts.map(a => ({ 
      id: a.id, 
      number: a.number, 
      status: a.status, 
      accountType: a.accountType 
    })))

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
    const userId = await getUserId()

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
        propfirm: '', // Empty string indicates it's a live account
        // Set default values for live accounts
        drawdownThreshold: 0,
        profitTarget: 0,
        isPerformance: false,
        payoutCount: 0,
      }
    })

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
