'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { enableTwoFactor } from '@/lib/auth/2fa'

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
    const { secret, token } = body

    if (!secret || !token) {
      return NextResponse.json(
        { error: 'Secret and token are required' },
        { status: 400 }
      )
    }

    const success = await enableTwoFactor(secret, token)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA enable error:', error)
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    )
  }
}
