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

    // Get accounts with current phase info
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          phases: {
            where: { phaseStatus: 'active' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          breaches: {
            where: { breachTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            orderBy: { breachTime: 'desc' },
            take: 1,
          },
          equitySnapshots: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              trades: true,
              payouts: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: filters.limit,
      }),
      prisma.account.count({ where })
    ])

    // Transform accounts to include calculated data
    const accountsWithData = accounts.map(account => {
      const currentPhase = account.phases[0]
      const latestEquity = account.equitySnapshots[0]
      const hasRecentBreach = account.breaches.length > 0

      // Calculate basic metrics with safe defaults
      const currentEquity = Math.max(0, latestEquity?.equity || account.startingBalance)
      const currentBalance = Math.max(0, latestEquity?.balance || account.startingBalance)

      // Calculate drawdown
      const drawdown = currentPhase ? PropFirmBusinessRules.calculateDrawdown(
        account as any,
        currentPhase as any,
        currentEquity,
        currentBalance, // Using current balance as daily start for now
        Math.max(0, currentPhase.highestEquitySincePhaseStart || account.startingBalance)
      ) : null

      return {
        id: account.id,
        number: account.number,
        name: account.name,
        propfirm: account.propfirm,
        status: account.status,
        currentPhase: currentPhase?.phaseType || 'phase_1',
        currentEquity,
        currentBalance,
        dailyDrawdownRemaining: drawdown?.dailyDrawdownRemaining || 0,
        maxDrawdownRemaining: drawdown?.maxDrawdownRemaining || 0,
        profitTargetProgress: currentPhase?.profitTarget && currentPhase.profitTarget > 0
          ? Math.min(100, Math.max(0, (currentPhase.netProfitSincePhaseStart / currentPhase.profitTarget) * 100))
          : 0,
        totalTrades: account._count.trades,
        totalPayouts: account._count.payouts,
        hasRecentBreach,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
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

  } catch (error) {
    console.error('Error fetching prop firm accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
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
