/**
 * Prop Firm Accounts API - Rebuilt System
 * GET /api/prop-firm-v2/accounts - List all prop firm accounts
 * POST /api/prop-firm-v2/accounts - Create new prop firm account
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'
import { PropFirmEngine } from '@/lib/prop-firm/prop-firm-engine'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const CreateAccountSchema = z.object({
  // Basic account info
  name: z.string().min(1, 'Account name is required'),
  firmType: z.enum(['FTMO', 'MyForexFunds', 'FundedNext', 'TheForexFirm', 'TopTierTrader', 'SurgeTrader', 'TrueForexFunds', 'FundingTraders', 'E8Funding', 'FastTrackTrading', 'Maven', 'Other']),
  accountSize: z.number().positive('Account size must be positive'),
  evaluationType: z.enum(['one_step', 'two_step']).default('two_step'),

  // Phase account numbers (user-provided)
  phase1AccountId: z.string().optional(),

  // Phase configurations (percentages)
  phase1ProfitTarget: z.number().min(0).max(100).default(8),
  phase2ProfitTarget: z.number().min(0).max(100).default(5),
  phase1MaxDrawdown: z.number().min(0).max(100).default(10),
  phase2MaxDrawdown: z.number().min(0).max(100).default(10),
  fundedMaxDrawdown: z.number().min(0).max(100).default(5),
  phase1DailyDrawdown: z.number().min(0).max(100).default(5),
  phase2DailyDrawdown: z.number().min(0).max(100).default(5),
  fundedDailyDrawdown: z.number().min(0).max(100).default(3),

  // Trading rules
  minTradingDaysPhase1: z.number().min(1).default(4),
  minTradingDaysPhase2: z.number().min(1).default(4),
  maxTradingDaysPhase1: z.number().min(1).optional(),
  maxTradingDaysPhase2: z.number().min(1).optional(),
  consistencyRule: z.number().min(0).max(100).default(30),
  trailingDrawdownEnabled: z.boolean().default(true),

  // Payout configuration
  initialProfitSplit: z.number().min(0).max(100).default(80),
  maxProfitSplit: z.number().min(0).max(100).default(90),
  profitSplitIncrementPerPayout: z.number().min(0).max(100).default(5),
  minPayoutAmount: z.number().min(0).default(50),
  maxPayoutAmount: z.number().min(0).optional(),
  payoutFrequencyDays: z.number().min(1).default(14),
  minDaysBeforeFirstPayout: z.number().min(0).default(7),

  // Trading permissions
  newsTradingAllowed: z.boolean().default(false),
  weekendHoldingAllowed: z.boolean().default(false),
  hedgingAllowed: z.boolean().default(true),
  eaAllowed: z.boolean().default(true),
  maxPositions: z.number().min(1).default(10),

  // Optional fields
  currency: z.string().default('USD'),
  leverage: z.number().min(1).default(100),
  notes: z.string().optional(),
  isDemo: z.boolean().default(true),
})

const AccountFilterSchema = z.object({
  status: z.array(z.enum(['active', 'failed', 'passed', 'funded'])).optional(),
  phaseType: z.array(z.enum(['phase_1', 'phase_2', 'funded'])).optional(),
  firmType: z.array(z.string()).optional(),
  includeFailed: z.boolean().default(false),
  includeDemo: z.boolean().default(true),
  search: z.string().optional(),
  page: z.number().default(1),
  limit: z.number().default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// GET /api/prop-firm-v2/accounts
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    const { searchParams } = new URL(request.url)
    
    // Parse and validate filters
    const filterData = {
      status: searchParams.getAll('status'),
      phaseType: searchParams.getAll('phaseType'),
      firmType: searchParams.getAll('firmType'),
      includeFailed: searchParams.get('includeFailed') === 'true',
      includeDemo: searchParams.get('includeDemo') !== 'false',
      search: searchParams.get("search") || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    }
    
    const filters = AccountFilterSchema.parse(filterData)
    const offset = (filters.page - 1) * filters.limit
    
    // Build where clause
    const where: any = {
      userId,
      // Only include prop firm accounts (exclude regular trading accounts)
      propfirm: { not: '' }
    }
    
    // Apply filters
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status }
    }
    
    if (!filters.includeFailed) {
      where.status = { not: 'failed' }
    }
    
    // Demo filter not available in current schema
    
    if (filters.firmType && filters.firmType.length > 0) {
      where.propfirm = { in: filters.firmType }
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { number: { contains: filters.search, mode: 'insensitive' } },
      ]
    }
    
    // Get total count
    const total = await prisma.account.count({ where })
    
    // Get accounts with related data
    const accounts = await prisma.account.findMany({
      where,
      skip: offset,
      take: filters.limit,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true }
        },
        // Include any existing phases if they exist
        phases: {
          where: { phaseStatus: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })
    
    // Transform accounts to include calculated metrics
    const enhancedAccounts = await Promise.all(
      accounts.map(async (account) => {
        // Get current phase
        const currentPhase = account.phases?.[0]

        // Calculate basic metrics
        let currentEquity = account.startingBalance
        let drawdownData = null
        let progressData = null

        if (currentPhase) {
          currentEquity = currentPhase.currentEquity || account.startingBalance

          // Get daily snapshot for drawdown calculation
          const latestSnapshot = await prisma.equitySnapshot?.findFirst({
            where: { phaseId: currentPhase.id },
            orderBy: { timestamp: 'desc' }
          })

          // Calculate drawdown
          drawdownData = PropFirmEngine.calculateDrawdown(
            currentPhase as any,
            currentEquity,
            latestSnapshot?.balance || account.startingBalance,
            account.trailingDrawdownEnabled
          )
        }

        // Get phase display info
        const phaseDisplayInfo = currentPhase ?
          PropFirmEngine.getPhaseDisplayInfo(currentPhase as any) : null

        return {
          // Account info
          id: account.id, // Master ID
          name: account.name, // Display name (e.g., "My Maven")
          propfirm: account.propfirm,
          accountSize: account.accountSize,
          status: account.status,
          evaluationType: account.evaluationType,

          // Phase info
          currentPhase: currentPhase ? {
            id: currentPhase.id,
            phaseType: currentPhase.phaseType,
            status: currentPhase.phaseStatus,
            accountNumber: currentPhase.accountNumber, // Phase account number
            profitTarget: currentPhase.profitTarget,
            currentEquity: currentPhase.currentEquity,
            startingBalance: currentPhase.currentBalance,
            totalTrades: currentPhase.totalTrades,
            winningTrades: currentPhase.winningTrades,
            phaseDisplayInfo: phaseDisplayInfo,
          } : null,

          // Account numbers
          phase1AccountId: account.phase1AccountId,
          phase2AccountId: account.phase2AccountId,
          fundedAccountId: account.fundedAccountId,

          // Current metrics
          currentEquity,
          startingBalance: account.startingBalance,

          // Drawdown info
          drawdown: drawdownData,

          // Dates
          createdAt: account.createdAt,

          // User info
          owner: account.user,
        }
      })
    )
    
    return NextResponse.json({
      accounts: enhancedAccounts,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      hasNext: offset + filters.limit < total,
      hasPrev: filters.page > 1,
    })
    
  } catch (error) {
    console.error('Error fetching prop firm accounts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/prop-firm-v2/accounts
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    const body = await request.json()
    
    // Validate request data
    const validatedData = CreateAccountSchema.parse(body)
    
    // Create account with initial phase in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the main account
      const account = await tx.account.create({
        data: {
          userId,
          name: validatedData.name,
          propfirm: validatedData.firmType,
          accountSize: validatedData.accountSize.toString(),
          startingBalance: validatedData.accountSize,
          number: `${Date.now()}`, // Master ID (internal)
          currency: validatedData.currency,
          leverage: validatedData.leverage,
          evaluationType: validatedData.evaluationType,
          status: 'active',

          // Phase account numbers
          phase1AccountId: validatedData.phase1AccountId,

          // Phase configurations
          phase1ProfitTarget: validatedData.phase1ProfitTarget,
          phase2ProfitTarget: validatedData.phase2ProfitTarget,
          phase1MaxDrawdown: validatedData.phase1MaxDrawdown,
          phase2MaxDrawdown: validatedData.phase2MaxDrawdown,
          fundedMaxDrawdown: validatedData.fundedMaxDrawdown,
          phase1DailyDrawdown: validatedData.phase1DailyDrawdown,
          phase2DailyDrawdown: validatedData.phase2DailyDrawdown,
          fundedDailyDrawdown: validatedData.fundedDailyDrawdown,
          minTradingDaysPhase1: validatedData.minTradingDaysPhase1,
          minTradingDaysPhase2: validatedData.minTradingDaysPhase2,
          maxTradingDaysPhase1: validatedData.maxTradingDaysPhase1,
          maxTradingDaysPhase2: validatedData.maxTradingDaysPhase2,
          consistencyRule: validatedData.consistencyRule,
          trailingDrawdownEnabled: validatedData.trailingDrawdownEnabled,

          // Payout configuration
          initialProfitSplit: validatedData.initialProfitSplit,
          maxProfitSplit: validatedData.maxProfitSplit,
          profitSplitIncrementPerPayout: validatedData.profitSplitIncrementPerPayout,
          minPayoutAmount: validatedData.minPayoutAmount,
          maxPayoutAmount: validatedData.maxPayoutAmount,
          payoutFrequencyDays: validatedData.payoutFrequencyDays,
          minDaysBeforeFirstPayout: validatedData.minDaysBeforeFirstPayout,

          // Trading permissions
          tradingNewsAllowed: validatedData.newsTradingAllowed,
          weekendHoldingAllowed: validatedData.weekendHoldingAllowed,
          hedgingAllowed: validatedData.hedgingAllowed,
          eaAllowed: validatedData.eaAllowed,
          maxPositions: validatedData.maxPositions,

          // System defaults
          dailyDrawdownType: 'percent',
          maxDrawdownType: 'percent',
          drawdownModeMax: 'trailing',
          timezone: 'UTC',
          dailyResetTime: '00:00',
          ddIncludeOpenPnl: false,
          progressionIncludeOpenPnl: false,
          allowManualPhaseOverride: false,
          resetOnPayout: false,
          reduceBalanceByPayout: true,
          autoRenewal: false,
          paymentFrequency: 'MONTHLY',
          renewalNotice: 3,
          isDemo: validatedData.isDemo,
          notes: validatedData.notes,
        }
      })

      // Create initial Phase 1
      const phase1 = await tx.accountPhase.create({
        data: {
          accountId: account.id,
          phaseType: 'phase_1',
          phaseStatus: 'active',
          accountNumber: validatedData.phase1AccountId || 'Not Set',
          profitTarget: (validatedData.accountSize * validatedData.phase1ProfitTarget) / 100,
          currentEquity: validatedData.accountSize,
          currentBalance: validatedData.accountSize,
          netProfitSincePhaseStart: 0,
          highestEquitySincePhaseStart: validatedData.accountSize,
          totalTrades: 0,
          winningTrades: 0,
          totalCommission: 0,
        }
      })

      return { account, phase1 }
    })

    // Revalidate cache tags to ensure fresh data
    revalidateTag(`accounts-${userId}`)
    revalidateTag(`user-data-${userId}`)
    
    return NextResponse.json({
      success: true,
      account: result.account,
      currentPhase: result.phase1,
      message: 'Prop firm account created successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating prop firm account:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    // Handle authentication-specific errors
    if (error instanceof Error) {
      if (error.message === "Authentication service temporarily unavailable") {
        return NextResponse.json(
          {
            error: 'Authentication service is currently unavailable. Please check your internet connection and try again in a few moments.',
            details: 'Supabase authentication timeout'
          },
          { status: 503 } // Service Unavailable
        )
      }

      if (error.message.includes("fetch failed") || error.message.includes("ConnectTimeoutError")) {
        return NextResponse.json(
          {
            error: 'Network connection error. Please check your internet connection and try again.',
            details: 'Connection timeout'
          },
          { status: 503 } // Service Unavailable
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
