/**
 * Prop Firm Accounts API - Rebuilt with MasterAccount/PhaseAccount Architecture
 * GET /api/prop-firm-v2/accounts - List all master accounts
 * POST /api/prop-firm-v2/accounts - Create new master account with initial phase
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'
import { validatePhaseId } from '@/lib/validation/phase-id-validator'
import { prisma } from '@/lib/prisma'

// Validation schema for creating a master account
const CreateMasterAccountSchema = z.object({
  // Basic master account info
  accountName: z.string().min(1, 'Account name is required'),
  propFirmName: z.string().min(1, 'Prop firm name is required'),
  accountSize: z.number().positive('Account size must be positive'),
  evaluationType: z.enum(['One Step', 'Two Step', 'Instant']),
  
  // Required Phase 1 ID
  phase1AccountId: z.string().min(1, 'Phase 1 account ID is required'),
  
  // Phase 1 rules
  phase1ProfitTargetPercent: z.number().min(0).max(100),
  phase1DailyDrawdownPercent: z.number().min(0).max(100),
  phase1MaxDrawdownPercent: z.number().min(0).max(100),
  phase1MinTradingDays: z.number().min(0).default(0),
  phase1TimeLimitDays: z.number().min(0).default(0).nullable(),
  phase1MaxDrawdownType: z.enum(['static', 'trailing']).default('static'),
  phase1ConsistencyRulePercent: z.number().min(0).max(100).default(0),
  
  // Phase 2 rules (optional for one-step and instant)
  phase2ProfitTargetPercent: z.number().min(0).max(100).optional(),
  phase2DailyDrawdownPercent: z.number().min(0).max(100).optional(),
  phase2MaxDrawdownPercent: z.number().min(0).max(100).optional(),
  phase2MinTradingDays: z.number().min(0).default(0).optional(),
  phase2TimeLimitDays: z.number().min(0).default(0).nullable().optional(),
  phase2MaxDrawdownType: z.enum(['static', 'trailing']).default('static').optional(),
  phase2ConsistencyRulePercent: z.number().min(0).max(100).default(0).optional(),
  
  // Funded rules
  fundedDailyDrawdownPercent: z.number().min(0).max(100),
  fundedMaxDrawdownPercent: z.number().min(0).max(100),
  fundedMaxDrawdownType: z.enum(['static', 'trailing']).default('static'),
  fundedProfitSplitPercent: z.number().min(0).max(100),
  fundedPayoutCycleDays: z.number().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = CreateMasterAccountSchema.parse(body)

    // ENHANCED: Validate Phase ID to prevent duplicates
    const phaseIdValidation = await validatePhaseId(userId, validatedData.phase1AccountId)
    if (!phaseIdValidation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: phaseIdValidation.error,
          conflictingAccount: phaseIdValidation.conflictingAccount
        },
        { status: 400 }
      )
    }

    // Create master account and initial phase in a transaction
    // Increased timeout to handle network latency issues
    const result = await prisma.$transaction(async (tx) => {
      // Create the master account
      const masterAccount = await tx.masterAccount.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          accountName: validatedData.accountName,
          propFirmName: validatedData.propFirmName,
          accountSize: validatedData.accountSize,
          evaluationType: validatedData.evaluationType,
          currentPhase: 1,
          isActive: true
        }
      })

      // Create Phase 1 (always exists and is active)
      const phase1 = await tx.phaseAccount.create({
        data: {
          id: crypto.randomUUID(),
          masterAccountId: masterAccount.id,
          phaseNumber: 1,
          phaseId: validatedData.phase1AccountId,
          status: 'active',
          profitTargetPercent: validatedData.evaluationType === 'Instant' ? 0 : validatedData.phase1ProfitTargetPercent,
          dailyDrawdownPercent: validatedData.phase1DailyDrawdownPercent,
          maxDrawdownPercent: validatedData.phase1MaxDrawdownPercent,
          maxDrawdownType: validatedData.phase1MaxDrawdownType || 'static',
          minTradingDays: validatedData.phase1MinTradingDays,
          timeLimitDays: validatedData.phase1TimeLimitDays || undefined,
          consistencyRulePercent: validatedData.phase1ConsistencyRulePercent
        }
      })

      // For Two Step evaluation, create Phase 2 (pending)
      let phase2 = null
      if (validatedData.evaluationType === 'Two Step') {
        phase2 = await tx.phaseAccount.create({
          data: {
            id: crypto.randomUUID(),
            masterAccountId: masterAccount.id,
            phaseNumber: 2,
            phaseId: null, // Will be set when user transitions
            status: 'pending',
            profitTargetPercent: validatedData.phase2ProfitTargetPercent!,
            dailyDrawdownPercent: validatedData.phase2DailyDrawdownPercent!,
            maxDrawdownPercent: validatedData.phase2MaxDrawdownPercent!,
            maxDrawdownType: validatedData.phase2MaxDrawdownType || 'static',
            minTradingDays: validatedData.phase2MinTradingDays || 0,
            timeLimitDays: validatedData.phase2TimeLimitDays || undefined,
            consistencyRulePercent: validatedData.phase2ConsistencyRulePercent || 0
          }
        })
      }

      // Create Funded phase (pending)
      const fundedPhaseNumber = validatedData.evaluationType === 'One Step' ? 2 : 
                               validatedData.evaluationType === 'Instant' ? 1 : 3
      
      const fundedPhase = await tx.phaseAccount.create({
        data: {
          id: crypto.randomUUID(),
          masterAccountId: masterAccount.id,
          phaseNumber: fundedPhaseNumber,
          phaseId: null, // Will be set when user transitions (for One Step/Two Step) or uses current ID (for Instant)
          status: validatedData.evaluationType === 'Instant' ? 'active' : 'pending',
          profitTargetPercent: 0, // No profit target for funded phase
          dailyDrawdownPercent: validatedData.fundedDailyDrawdownPercent,
          maxDrawdownPercent: validatedData.fundedMaxDrawdownPercent,
          maxDrawdownType: validatedData.fundedMaxDrawdownType || 'static',
          minTradingDays: 0,
          timeLimitDays: undefined,
          consistencyRulePercent: 0,
          profitSplitPercent: validatedData.fundedProfitSplitPercent,
          payoutCycleDays: validatedData.fundedPayoutCycleDays
        }
      })

      // For Instant accounts, set the funded phase to use the same ID
      if (validatedData.evaluationType === 'Instant') {
        await tx.phaseAccount.update({
          where: { id: fundedPhase.id },
          data: { phaseId: validatedData.phase1AccountId }
        })
        
        // Update master account to point to funded phase
        await tx.masterAccount.update({
          where: { id: masterAccount.id },
          data: { currentPhase: fundedPhaseNumber }
        })
      }

      return {
        masterAccount,
        phases: [phase1, phase2, fundedPhase].filter(Boolean)
      }
    }, {
      timeout: 15000, // Increased from default 5000ms to 15000ms for network latency
      maxWait: 20000  // Maximum wait time for transaction to start
    })

    // Invalidate accounts cache after successful creation
    revalidateTag(`accounts-${userId}`)
    
    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }

    // Handle specific database connection errors
    if (error?.code === 'P1001') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed. Please check your internet connection and try again.',
          retryable: true
        },
        { status: 503 } // Service Unavailable
      )
    }

    // Handle transaction timeout errors
    if (error?.code === 'P2028' || error?.message?.includes('Transaction already closed')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Request timed out due to network issues. Please try again.',
          retryable: true
        },
        { status: 408 } // Request Timeout
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create master account' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const masterAccounts = await prisma.masterAccount.findMany({
      where: { userId },
      include: {
        PhaseAccount: {
          orderBy: { phaseNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: masterAccounts
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch master accounts' 
      },
      { status: 500 }
    )
  }
}