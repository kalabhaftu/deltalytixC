import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { redirect } from "next/navigation"

// Add route segment config
export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    // Newsletter feature removed - return success message
    return NextResponse.json({
      message: 'Newsletter feature has been disabled. No action needed.',
      email: email
    })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
