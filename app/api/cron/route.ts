import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { Resend } from 'resend'
import { headers } from 'next/headers'

// Add route segment config
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options)
    return response
  } catch (error) {
    if (retries > 0 && (error instanceof Error && error.message.includes('ECONNRESET'))) {
      console.warn(`Retrying fetch (${MAX_RETRIES - retries + 1}/${MAX_RETRIES}) for ${url}`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return fetchWithRetry(url, options, retries - 1)
    }
    throw error
  }
}

// Vercel cron job handler - runs every Sunday at 8 AM UTC+1
export async function GET(req: Request) {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY
    
    if (!RESEND_API_KEY) {
      console.warn('Resend API key not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 503 }
      )
    }
    
    const resend = new Resend(RESEND_API_KEY)
    // Verify that this is a legitimate Vercel cron job request
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Newsletter feature removed - return early
    return NextResponse.json(
      { message: 'Newsletter feature has been disabled' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
