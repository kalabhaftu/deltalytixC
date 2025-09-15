/**
 * Prop Firm Accounts API - Rebuilt System
 * GET /api/prop-firm-v2/accounts - List all prop firm accounts
 * POST /api/prop-firm-v2/accounts - Create new prop firm account
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'
import { PropFirmEngine } from '@/lib/prop-firm/prop-firm-engine'
import { z } from 'zod'

const prisma = new PrismaClient()

// Validation schemas
const CreateAccountSchema = z.object({
  firmType: z.enum(['FTMO', 'MyForexFunds', 'FundedNext', 'TheForexFirm', 'TopTierTrader', 'SurgeTrader', 'TrueForexFunds', 'FundingTraders', 'E8Funding', 'FastTrackTrading', 'Other']),
  accountSize: z.number().positive(),
  currency: z.string().default('USD'),
  leverage: z.number().default(100),
  name: z.string().optional(),
  
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
      search: searchParams.get('search') || undefined,
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
      OR: [
        { firmType: { not: null } },
        { phase1AccountId: { not: null } },
        { phase2AccountId: { not: null } },
        { fundedAccountId: { not: null } },
      ]
    }
    
    // Apply filters
    if (filters.status && filters.status.length > 0) {
      where.status = { in: filters.status }
    }
    
    if (!filters.includeFailed) {
      where.status = { not: 'failed' }
    }
    
    if (!filters.includeDemo) {
      where.isDemo = false
    }
    
    if (filters.firmType && filters.firmType.length > 0) {
      where.firmType = { in: filters.firmType }
    }
    
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { phase1AccountId: { contains: filters.search, mode: 'insensitive' } },
        { phase2AccountId: { contains: filters.search, mode: 'insensitive' } },
        { fundedAccountId: { contains: filters.search, mode: 'insensitive' } },
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
          const latestSnapshot = await prisma.dailyEquitySnapshot?.findFirst({
            where: { phaseId: currentPhase.id },
            orderBy: { date: 'desc' }
          })
          
          // Calculate drawdown
          drawdownData = PropFirmEngine.calculateDrawdown(
            currentPhase as any,
            currentEquity,
            latestSnapshot?.openingBalance || account.startingBalance,
            account.trailingDrawdownEnabled
          )
        }
        
        return {
          id: account.id,
          name: account.name,
          firmType: account.firmType,
          accountSize: account.accountSize,
          currency: account.currency || 'USD',
          status: account.status,
          isDemo: account.isDemo,
          
          // Phase account IDs
          phase1AccountId: account.phase1AccountId,
          phase2AccountId: account.phase2AccountId,
          fundedAccountId: account.fundedAccountId,
          
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
          challengeStartDate: account.challengeStartDate,
          fundedDate: account.fundedDate,
          
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
      // Create the main account
      const account = await tx.account.create({
        data: {
          userId,
          name: validatedData.name || `${validatedData.firmType} ${validatedData.accountSize}K`,
          firmType: validatedData.firmType,
          accountSize: validatedData.accountSize,
          currency: validatedData.currency,
          leverage: validatedData.leverage,
          startingBalance: validatedData.accountSize * 1000, // Convert K to actual amount
          
          // Phase account IDs
          phase1AccountId: validatedData.phase1AccountId,
          phase2AccountId: validatedData.phase2AccountId,
          fundedAccountId: validatedData.fundedAccountId,
          
          // Phase credentials
          phase1Login: validatedData.phase1Login,
          phase2Login: validatedData.phase2Login,
          fundedLogin: validatedData.fundedLogin,
          phase1Password: validatedData.phase1Password,
          phase2Password: validatedData.phase2Password,
          fundedPassword: validatedData.fundedPassword,
          
          // Phase servers
          phase1Server: validatedData.phase1Server,
          phase2Server: validatedData.phase2Server,
          fundedServer: validatedData.fundedServer,
          
          // Profit targets
          phase1ProfitTarget: validatedData.phase1ProfitTarget,
          phase2ProfitTarget: validatedData.phase2ProfitTarget,
          
          // Drawdown configuration
          phase1MaxDrawdown: validatedData.phase1MaxDrawdown,
          phase2MaxDrawdown: validatedData.phase2MaxDrawdown,
          fundedMaxDrawdown: validatedData.fundedMaxDrawdown,
          phase1DailyDrawdown: validatedData.phase1DailyDrawdown,
          phase2DailyDrawdown: validatedData.phase2DailyDrawdown,
          fundedDailyDrawdown: validatedData.fundedDailyDrawdown,
          trailingDrawdownEnabled: validatedData.trailingDrawdownEnabled,
          
          // Trading days
          minTradingDaysPhase1: validatedData.minTradingDaysPhase1,
          minTradingDaysPhase2: validatedData.minTradingDaysPhase2,
          maxTradingDaysPhase1: validatedData.maxTradingDaysPhase1,
          maxTradingDaysPhase2: validatedData.maxTradingDaysPhase2,
          
          // Payout configuration
          initialProfitSplit: validatedData.initialProfitSplit,
          maxProfitSplit: validatedData.maxProfitSplit,
          profitSplitIncrementPerPayout: validatedData.profitSplitIncrementPerPayout,
          minPayoutAmount: validatedData.minPayoutAmount,
          maxPayoutAmount: validatedData.maxPayoutAmount,
          payoutFrequencyDays: validatedData.payoutFrequencyDays,
          minDaysBeforeFirstPayout: validatedData.minDaysBeforeFirstPayout,
          
          // Trading rules
          consistencyRule: validatedData.consistencyRule,
          newsTradinAllowed: validatedData.newsTradinAllowed,
          weekendHoldingAllowed: validatedData.weekendHoldingAllowed,
          hedgingAllowed: validatedData.hedgingAllowed,
          eaAllowed: validatedData.eaAllowed,
          maxPositions: validatedData.maxPositions,
          
          // Metadata
          isDemo: validatedData.isDemo,
          tradingPlatform: validatedData.tradingPlatform,
          notes: validatedData.notes,
          status: 'active',
          challengeStartDate: new Date(),
        }
      })
      
      // Create Phase 1 automatically
      const phase1 = await tx.propFirmPhase?.create({
        data: {
          accountId: account.id,
          phaseType: 'phase_1',
          status: 'active',
          brokerAccountId: validatedData.phase1AccountId || `${account.id}-phase1`,
          brokerLogin: validatedData.phase1Login,
          brokerPassword: validatedData.phase1Password,
          brokerServer: validatedData.phase1Server,
          startingBalance: account.startingBalance,
          currentBalance: account.startingBalance,
          currentEquity: account.startingBalance,
          highWaterMark: account.startingBalance,
          profitTarget: (account.startingBalance * validatedData.phase1ProfitTarget) / 100,
          profitTargetPercent: validatedData.phase1ProfitTarget,
          maxDrawdownAmount: (account.startingBalance * validatedData.phase1MaxDrawdown) / 100,
          maxDrawdownPercent: validatedData.phase1MaxDrawdown,
          dailyDrawdownAmount: (account.startingBalance * validatedData.phase1DailyDrawdown) / 100,
          dailyDrawdownPercent: validatedData.phase1DailyDrawdown,
          minTradingDays: validatedData.minTradingDaysPhase1,
          maxTradingDays: validatedData.maxTradingDaysPhase1,
          startedAt: new Date(),
        }
      }) || null
      
      return { account, phase1 }
    })
    
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
    
    return NextResponse.json(
      { error: 'Failed to create account', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
