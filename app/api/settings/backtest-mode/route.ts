import { NextRequest, NextResponse } from 'next/server'
import { getUserIdSafe } from '@/server/auth'
import { prisma } from '@/lib/prisma'

// GET - Get backtest input mode preference
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json({ mode: 'manual' }, { status: 200 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { backtestInputMode: true }
    })

    return NextResponse.json({ 
      mode: user?.backtestInputMode || 'manual' 
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ mode: 'manual' }, { status: 200 })
  }
}

// POST - Update backtest input mode preference
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mode } = await request.json()

    if (!mode || !['manual', 'simple'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: userId },
      data: { backtestInputMode: mode }
    })

    return NextResponse.json({ success: true, mode }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update preference' },
      { status: 500 }
    )
  }
}

