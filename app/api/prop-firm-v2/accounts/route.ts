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
  firmType: z.enum(['FTMO', 'MyForexFunds', 'FundedNext', 'TheForexFirm', 'TopTierTrader', 'SurgeTrader', 'TrueForexFunds', 'FundingTraders', 'E8Funding', 'FastTrackTrading', 'Maven', 'Other']),
  accountSize: z.number().positive(),
  currency: z.string().default('USD'),
  leverage: z.number().default(100),
  name: z.string().optional(),
  evaluationType: z.enum(['one_step', 'two_step']).optional(),
  
  // Phase account IDs
  phase1AccountId: z.string().optional(),
  phase2AccountId: z.string().optional(),
  fundedAccountId: z.string().optional(),
  
  // Phase credentials
  phase1Login: z.string().optional(),
  phase2Login: z.string().optional(),
  fundedLogin: z.string().optional(),
  phase1Password: z.string().optional(),
  phase2Password: z.string().optional(),
  fundedPassword: z.string().optional(),
  
  // Phase servers
  phase1Server: z.string().optional(),
  phase2Server: z.string().optional(),
  fundedServer: z.string().optional(),
  
  // Profit targets (percentages)
  phase1ProfitTarget: z.number().default(10),
  phase2ProfitTarget: z.number().default(5),
  
  // Drawdown limits (percentages)
  phase1MaxDrawdown: z.number().default(10),
  phase2MaxDrawdown: z.number().default(10),
  fundedMaxDrawdown: z.number().default(5),
  phase1DailyDrawdown: z.number().default(5),
  phase2DailyDrawdown: z.number().default(5),
  fundedDailyDrawdown: z.number().default(3),
  
  // Trading days
  minTradingDaysPhase1: z.number().default(4),
  minTradingDaysPhase2: z.number().default(4),
  maxTradingDaysPhase1: z.number().optional(),
  maxTradingDaysPhase2: z.number().optional(),
  
  // Payout configuration
  initialProfitSplit: z.number().default(80),
  maxProfitSplit: z.number().default(90),
  profitSplitIncrementPerPayout: z.number().default(5),
  minPayoutAmount: z.number().default(50),
  maxPayoutAmount: z.number().optional(),
  payoutFrequencyDays: z.number().default(14),
  minDaysBeforeFirstPayout: z.number().default(7),
  
  // Trading rules
  consistencyRule: z.number().default(30),
  trailingDrawdownEnabled: z.boolean().default(true),
  newsTradinAllowed: z.boolean().default(false),
  weekendHoldingAllowed: z.boolean().default(false),
  hedgingAllowed: z.boolean().default(true),
  eaAllowed: z.boolean().default(true),
  maxPositions: z.number().default(10),
  
  // Metadata
  isDemo: z.boolean().default(true),
  tradingPlatform: z.string().optional(),
  notes: z.string().optional(),
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
        // Get current phase or create virtual phase data
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
            account.trailingDrawdown
          )
        }
        
        return {
          id: account.id,
          name: account.name,
          propfirm: account.propfirm,
          accountSize: account.accountSize,
          status: account.status,
          
          // Current metrics
          currentEquity,
          startingBalance: account.startingBalance,
          currentPhase: currentPhase ? {
            id: currentPhase.id,
            phaseType: currentPhase.phaseType,
            status: currentPhase.phaseStatus,
            profitTarget: currentPhase.profitTarget,
            daysTraded: currentPhase.totalTrades > 0 ? 1 : 0, // Simplified for now
          } : null,
          
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
    
    // Create account with phases in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the main account using proper Prisma client
      const account = await tx.account.create({
        data: {
          userId,
          name: validatedData.name || `${validatedData.firmType} $${validatedData.accountSize.toLocaleString()}`,
          propfirm: validatedData.firmType,
          accountSize: validatedData.accountSize.toString(),
          startingBalance: validatedData.accountSize,
          number: `${Date.now()}`, // Generate a unique account number
          broker: validatedData.firmType, // Use firmType as broker for now

          // Map to existing Prisma fields
          trailingDrawdown: validatedData.trailingDrawdownEnabled || false,
          tradingNewsAllowed: validatedData.newsTradinAllowed !== undefined ? validatedData.newsTradinAllowed : true,
          profitSplitPercent: validatedData.initialProfitSplit || 80,
          payoutCycleDays: validatedData.payoutFrequencyDays || 14,
          minDaysToFirstPayout: validatedData.minDaysBeforeFirstPayout || 7,
          consistencyPercentage: validatedData.consistencyRule || 30,
          dailyDrawdownAmount: (validatedData.accountSize * (validatedData.phase1DailyDrawdown || 5)) / 100,
          maxDrawdownAmount: (validatedData.accountSize * (validatedData.phase1MaxDrawdown || 10)) / 100,
          profitTarget: (validatedData.accountSize * (validatedData.phase1ProfitTarget || 10)) / 100,
          status: 'active',
          evaluationType: validatedData.evaluationType || 'two_step',
          dailyDrawdownType: 'percent',
          maxDrawdownType: 'percent',
          drawdownModeMax: 'static',
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
        }
      })

      // Create Phase 1 using proper Prisma client
      const phase1 = await tx.accountPhase.create({
        data: {
          accountId: account.id,
          phaseType: 'phase_1',
          phaseStatus: 'active',
          profitTarget: (validatedData.accountSize * (validatedData.phase1ProfitTarget || 10)) / 100,
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
