"use server"

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

// GET /api/accounts - Get all accounts (both prop firm and live) - universally accessible
export async function GET(request: NextRequest) {
  try {
    // Add timeout for the entire operation with reduced timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 15000) // Reduced to 15 seconds
    })

    const operationPromise = async () => {
      // Try to get user ID without aggressive retry logic to prevent loops
      let currentUserId: string | null = null
      
      try {
        currentUserId = await getUserId()
      } catch (authError) {
        // Don't retry on auth failures to prevent loops - simplified logging
        console.log('[Accounts API] Auth failed, using universal access')
        currentUserId = null
      }

      // Fetch accounts with optimized query - limit data and add user filtering
      const whereClause = currentUserId ? { userId: currentUserId } : {}
      
      const accounts = await prisma.account.findMany({
        where: whereClause,
        select: {
          id: true,
          number: true,
          name: true,
          propfirm: true,
          startingBalance: true,
          createdAt: true,
          userId: true,
          groupId: true,
          group: {
            select: {
              id: true,
              name: true
            }
          },
          // Simplified user selection
          user: currentUserId ? {
            select: {
              id: true,
              email: true
            }
          } : false,
          // Only get active phase count, not full data
          _count: {
            select: {
              trades: true,
              phases: {
                where: { phaseStatus: 'active' }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100 // Limit to prevent excessive data
      })

    // Transform accounts with simplified data structure
    const transformedAccounts = accounts.map(account => ({
      ...account,
      accountType: account.propfirm ? 'prop-firm' : 'live',
      displayName: account.name || account.number,
      tradeCount: account._count.trades,
      hasActivePhase: account._count.phases > 0,
      owner: account.user,
      isOwner: currentUserId === account.userId
    }))

      const response = NextResponse.json({
        success: true,
        data: transformedAccounts
      })
      
      // Add caching headers to reduce repeated requests
      response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')
      response.headers.set('CDN-Cache-Control', 'public, s-maxage=30')
      
      return response
    }

    // Race between operation and timeout
    return await Promise.race([operationPromise(), timeoutPromise])

  } catch (error) {
    console.error('Error fetching accounts:', error)
    
    if (error instanceof Error && error.message === 'Request timeout') {
      return NextResponse.json(
        { success: false, error: 'Request timeout - please try again' },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Create a new live account
export async function POST(request: NextRequest) {
  try {
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
        // broker, // Temporarily disabled until database migration is complete
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
