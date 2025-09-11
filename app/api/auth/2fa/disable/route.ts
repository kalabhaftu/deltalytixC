'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { disableTwoFactor } from '@/lib/auth/2fa'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const success = await disableTwoFactor(token)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid token or 2FA not enabled' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json(
      { error: 'Failed to disable 2FA' },
      { status: 500 }
    )
  }
}
