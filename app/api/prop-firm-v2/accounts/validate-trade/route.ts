/**
 * Trade Validation API
 * POST /api/prop-firm-v2/accounts/validate-trade - Validate if trade can be added to an account
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// Validation schema
const ValidateTradeSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required')
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
    const { accountNumber } = ValidateTradeSchema.parse(body)

    // First, check if this is a phase account (prop firm)
    const phaseAccount = await prisma.phaseAccount.findFirst({
      where: {
        phaseId: accountNumber,
        status: 'active',
        MasterAccount: {
          userId
        }
      },
      include: {
        MasterAccount: true
      }
    })

    if (phaseAccount) {
      // This is a prop firm account - validate phase ID
      if (!phaseAccount.phaseId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Please set the ID for the current phase before adding trades.' 
          },
          { status: 403 }
        )
      }

      // Phase ID is set - validation passed
      return NextResponse.json({
        success: true,
        data: {
          accountType: 'prop-firm',
          phaseNumber: phaseAccount.phaseNumber,
          masterAccountId: phaseAccount.masterAccountId
        }
      })
    }

    // Not a prop firm account - check if it's a regular account
    const regularAccount = await prisma.account.findFirst({
      where: {
        number: accountNumber,
        userId
      }
    })

    if (regularAccount) {
      // Regular account - no validation needed
      return NextResponse.json({
        success: true,
        data: {
          accountType: 'regular',
          accountId: regularAccount.id
        }
      })
    }

    // Account not found
    return NextResponse.json(
      { 
        success: false, 
        error: 'Account not found or unauthorized' 
      },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error validating trade:', error)
    
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

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to validate trade' 
      },
      { status: 500 }
    )
  }
}

