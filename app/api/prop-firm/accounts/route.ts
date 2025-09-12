/**
 * Prop Firm Accounts API
 * Handles CRUD operations for prop firm evaluation accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { PropFirmSchemas } from '@/lib/validation/prop-firm-schemas'
import { PropFirmBusinessRules } from '@/lib/prop-firm/business-rules'
// Removed heavy validation import - using Zod directly
import { PhaseType, EvaluationType } from '@/types/prop-firm'

// GET /api/prop-firm/accounts - List accounts with filtering
export async function GET(request: NextRequest) {
  try {
    // Add timeout wrapper for the entire operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 10000) // 10 second timeout
    })

    const operationPromise = async () => {
      // Get user ID using the proper authentication function
      const userId = await getUserId()

      const { searchParams } = new URL(request.url)
    
    // Parse and validate filter parameters
    const filterData = {
      status: searchParams.getAll('status'),
      phaseType: searchParams.getAll('phaseType'),
      propfirm: searchParams.getAll('propfirm'),
      evaluationType: searchParams.getAll('evaluationType'),
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    // Validate filter parameters
    const parseResult = PropFirmSchemas.AccountFilter.safeParse(filterData)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const filters = parseResult.data
    const offset = (filters.page - 1) * filters.limit

    // Build where clause
    const where: any = {
      userId,
      propfirm: { not: '' }, // Only prop firm accounts
    }

    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status }
    }

    if (filters.propfirm && filters.propfirm.length > 0) {
      where.propfirm = { in: filters.propfirm }
    }

    if (filters.evaluationType && filters.evaluationType.length > 0) {
      where.evaluationType = { in: filters.evaluationType }
    }

    // Filter by phase type requires a subquery
    if (filters.phaseType && filters.phaseType.length > 0) {
      where.phases = {
        some: {
          phaseType: { in: filters.phaseType },
          phaseStatus: 'active'
        }
      }
    }

    // Simplified and optimized query - remove complex joins that cause timeouts
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        select: {
          id: true,
          number: true,
          name: true,
          propfirm: true,
          status: true,
          startingBalance: true,
          dailyDrawdownAmount: true,
          dailyDrawdownType: true,
          maxDrawdownAmount: true,
          maxDrawdownType: true,
          drawdownModeMax: true,
          createdAt: true,
          // Simplified - only get active phase count for performance
          _count: {
            select: {
              trades: true,
              payouts: true,
              phases: {
                where: { phaseStatus: 'active' }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: filters.limit,
      }),
      prisma.account.count({ where })
    ])

    // Get trade counts for all accounts (both by accountId and accountNumber)
    const tradeCounts = await prisma.trade.groupBy({
      by: ['accountId', 'accountNumber'],
      where: {
        OR: [
          { accountId: { in: accounts.map(a => a.id) } },
          { accountNumber: { in: accounts.map(a => a.number) } }
        ]
      },
      _count: true
    })

    // Create a map for quick lookup
    const tradeCountMap = new Map()
    tradeCounts.forEach(count => {
      const key = count.accountId || count.accountNumber
      if (key) {
        tradeCountMap.set(key, (tradeCountMap.get(key) || 0) + count._count)
      }
    })

    // Simplified transformation for performance - detailed data loaded separately
    const accountsWithData = accounts.map(account => {
      const hasActivePhase = account._count.phases > 0
      const totalTrades = tradeCountMap.get(account.id) || tradeCountMap.get(account.number) || 0

      return {
        id: account.id,
        number: account.number,
        name: account.name,
        propfirm: account.propfirm,
        status: account.status,
        currentPhase: hasActivePhase ? 'active' : 'phase_1',
        currentEquity: account.startingBalance, // Default to starting balance for performance
        currentBalance: account.startingBalance,
        dailyDrawdownRemaining: account.dailyDrawdownAmount || 0,
        maxDrawdownRemaining: account.maxDrawdownAmount || 0,
        profitTargetProgress: 0, // Will be loaded separately for performance
        totalTrades: totalTrades,
        totalPayouts: account._count.payouts,
        hasRecentBreach: false, // Will be loaded separately
        createdAt: account.createdAt,
        updatedAt: new Date(),
      }
    })

      return NextResponse.json({
        success: true,
        data: accountsWithData,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
          hasNext: offset + filters.limit < total,
          hasPrevious: filters.page > 1,
        },
      })
    }

    // Race between operation and timeout
    return await Promise.race([operationPromise(), timeoutPromise])

  } catch (error) {
    console.error('Error fetching prop firm accounts:', error)
    
    // Handle specific error types with detailed error codes
    if (error instanceof Error) {
      // Database connection errors
      if (error.message.includes("Can't reach database server") ||
          error.message.includes('P1001') ||
          error.message.includes('Connection timeout') ||
          error.message.includes('connection pool timeout') ||
          error.message.includes('ECONNREFUSED')) {
        return NextResponse.json(
          { 
            error: 'Database temporarily unavailable', 
            code: 'DB_CONNECTION_ERROR',
            details: 'Please check your database connection and try again.',
            retryAfter: 30
          },
          { status: 503 }
        )
      }
      
      if (error.message.includes('Authentication service temporarily unavailable')) {
        return NextResponse.json(
          { 
            error: 'Authentication service temporarily unavailable', 
            code: 'AUTH_TIMEOUT',
            retryAfter: 15
          },
          { status: 503 }
        )
      }
      
      if (error.message.includes('User not authenticated')) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        )
      }
      
      if (error.message === 'Request timeout') {
        return NextResponse.json(
          { 
            error: 'Request timed out', 
            code: 'REQUEST_TIMEOUT',
            retryAfter: 10
          },
          { status: 408 }
        )
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch accounts', 
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    )
  }
}

// POST /api/prop-firm/accounts - Create new account
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    const body = await request.json()

    // Validate input
    const parseResult = PropFirmSchemas.CreateAccount.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parseResult.error.errors },
        { status: 400 }
      )
    }

    const accountData = parseResult.data

    // Validate business rules
    const configValidation = PropFirmBusinessRules.validateAccountConfiguration(accountData)
    if (!configValidation.valid) {
      return NextResponse.json(
        { error: 'Business Rule Violation', details: configValidation.errors },
        { status: 400 }
      )
    }

    // Check for duplicate account number
    const existingAccount = await prisma.account.findFirst({
      where: {
        number: accountData.number,
        userId,
      }
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Duplicate Account Number', message: 'An account with this number already exists for your user.' },
        { status: 409 }
      )
    }

    // Create account and initial phase in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the account
      const account = await tx.account.create({
        data: {
          ...accountData,
          userId,
          // Set defaults
          status: 'active',
          dailyDrawdownType: accountData.dailyDrawdownType || 'percent',
          maxDrawdownType: accountData.maxDrawdownType || 'percent',
          drawdownModeMax: accountData.drawdownModeMax || 'static',
          evaluationType: accountData.evaluationType || 'two_step',
          timezone: accountData.timezone || 'UTC',
          dailyResetTime: accountData.dailyResetTime || '00:00',
          ddIncludeOpenPnl: false,
          progressionIncludeOpenPnl: false,
          allowManualPhaseOverride: false,
          profitSplitPercent: 80,
          payoutCycleDays: 14,
          minDaysToFirstPayout: 4,
          resetOnPayout: false,
          reduceBalanceByPayout: true,
        }
      })

      // Determine profit target for Phase 1
      const profitTarget = accountData.profitTarget || 
        PropFirmBusinessRules.getDefaultProfitTarget(
          'phase_1', 
          accountData.startingBalance, 
          accountData.evaluationType || 'two_step'
        )

      // Create initial Phase 1
      const initialPhase = await tx.accountPhase.create({
        data: {
          accountId: account.id,
          phaseType: 'phase_1',
          phaseStatus: 'active',
          profitTarget,
          currentEquity: accountData.startingBalance,
          currentBalance: accountData.startingBalance,
          highestEquitySincePhaseStart: accountData.startingBalance,
        }
      })

      // Create initial daily anchor
      await tx.dailyAnchor.create({
        data: {
          accountId: account.id,
          date: new Date(),
          anchorEquity: accountData.startingBalance,
        }
      })

      // Create initial equity snapshot
      await tx.equitySnapshot.create({
        data: {
          accountId: account.id,
          phaseId: initialPhase.id,
          equity: accountData.startingBalance,
          balance: accountData.startingBalance,
          openPnl: 0,
        }
      })

      // Log account creation in audit log
      await tx.auditLog.create({
        data: {
          userId,
          accountId: account.id,
          action: 'ACCOUNT_CREATED',
          entity: 'account',
          entityId: account.id,
          newValues: account,
          metadata: {
            initialPhaseId: initialPhase.id,
            profitTarget,
          }
        }
      })

      return { account, initialPhase }
    })

    return NextResponse.json({
      success: true,
      data: {
        account: result.account,
        initialPhase: result.initialPhase,
      },
      message: 'Account created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating prop firm account:', error)
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred while creating the account.' },
      { status: 500 }
    )
  }
}
