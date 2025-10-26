import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdSafe } from '@/server/auth'

/**
 * GET /api/user/trading-models
 * Retrieve user's custom trading models from database
 */
export async function GET() {
  try {
    const userId = await getUserIdSafe()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { customTradingModels: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse JSON array or return empty array
    const models = user.customTradingModels 
      ? JSON.parse(user.customTradingModels)
      : []

    return NextResponse.json({ models }, { status: 200 })
  } catch (error) {
    console.error('Error fetching trading models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trading models' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/user/trading-models
 * Save user's custom trading models to database
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { models } = body

    if (!Array.isArray(models)) {
      return NextResponse.json(
        { error: 'Invalid data format. Expected array of models.' },
        { status: 400 }
      )
    }

    // Validate that all models are strings
    if (!models.every(model => typeof model === 'string')) {
      return NextResponse.json(
        { error: 'All models must be strings' },
        { status: 400 }
      )
    }

    // Save to database as JSON
    await prisma.user.update({
      where: { id: userId },
      data: {
        customTradingModels: JSON.stringify(models)
      }
    })

    return NextResponse.json({ 
      success: true, 
      models 
    }, { status: 200 })
  } catch (error) {
    console.error('Error saving trading models:', error)
    return NextResponse.json(
      { error: 'Failed to save trading models' },
      { status: 500 }
    )
  }
}

