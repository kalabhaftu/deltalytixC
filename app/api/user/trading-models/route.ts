import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { BREAK_EVEN_THRESHOLD } from '@/lib/utils'

const tradingModelSchema = z.object({
  name: z.string().min(1, 'Model name is required').max(100),
  rules: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

// GET - List all trading models for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const models = await prisma.tradingModel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        Trade: {
          select: {
            pnl: true,
            commission: true
          }
        }
      }
    })

    // Parse rules from JSON to array and calculate stats
    const formattedModels = models.map(model => {
      const trades = model.Trade || []
      const tradeCount = trades.length

      let totalPnL = 0
      let winCount = 0
      let lossCount = 0
      let breakEvenCount = 0

      trades.forEach(trade => {
        const netPnL = (trade.pnl || 0) + (trade.commission || 0)
        totalPnL += netPnL

        if (netPnL > BREAK_EVEN_THRESHOLD) {
          winCount++
        } else if (netPnL < -BREAK_EVEN_THRESHOLD) {
          lossCount++
        } else {
          breakEvenCount++
        }
      })

      // Calculate win rate (excluding break-even from denominator)
      const tradableCount = winCount + lossCount
      const winRate = tradableCount > 0 ? (winCount / tradableCount) * 100 : 0

      // Remove Trade array from response to keep it light
      const { Trade, ...modelData } = model

      return {
        ...modelData,
        rules: typeof model.rules === 'string'
          ? JSON.parse(model.rules)
          : Array.isArray(model.rules)
            ? model.rules
            : [],
        stats: {
          tradeCount,
          totalPnL,
          winRate,
          winCount,
          lossCount,
          breakEvenCount
        }
      }
    })

    return NextResponse.json({ success: true, models: formattedModels })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

// POST - Create new trading model
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = tradingModelSchema.parse(body)

    // Check if model with same name already exists
    const existing = await prisma.tradingModel.findUnique({
      where: {
        userId_name: {
          userId,
          name: validated.name,
        },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A model with this name already exists' },
        { status: 400 }
      )
    }

    const model = await prisma.tradingModel.create({
      data: {
        id: randomUUID(),
        userId,
        name: validated.name,
        rules: validated.rules,
        notes: validated.notes,
      },
    })

    return NextResponse.json({ success: true, model }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    )
  }
}
