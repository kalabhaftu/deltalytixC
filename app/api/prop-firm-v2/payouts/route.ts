/**
 * Payout Management API
 * POST /api/prop-firm-v2/payouts - Request a new payout
 * DELETE /api/prop-firm-v2/payouts/[id] - Delete a pending payout
 */

import { NextRequest, NextResponse } from 'next/server'
import { savePayoutAction, deletePayoutAction } from '@/server/accounts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { masterAccountId, phaseAccountId, amount, notes } = body

    if (!masterAccountId || !phaseAccountId || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: masterAccountId, phaseAccountId, and amount' },
        { status: 400 }
      )
    }

    const result = await savePayoutAction({
      masterAccountId,
      phaseAccountId,
      amount: parseFloat(amount),
      notes: notes || undefined
    })

    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create payout'
      },
      { status: 500 }
    )
  }
}

