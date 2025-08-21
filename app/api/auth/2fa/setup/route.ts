'use server'

import { NextRequest, NextResponse } from 'next/server'
import { getUserId, getUserEmail } from '@/server/auth'
import { generateTwoFactorSecret } from '@/lib/auth/2fa'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    const userEmail = await getUserEmail()
    
    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const secretData = await generateTwoFactorSecret(userEmail)
    
    return NextResponse.json({
      secret: secretData.secret,
      qrCode: secretData.qrCodeUrl,
      manualEntryKey: secretData.manualEntryKey,
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json(
      { error: 'Failed to setup 2FA' },
      { status: 500 }
    )
  }
}
