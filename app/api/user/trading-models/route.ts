import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { randomUUID } from 'crypto'

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
    })

    // Parse rules from JSON to array
    const formattedModels = models.map(model => ({
      ...model,
      rules: typeof model.rules === 'string' 
        ? JSON.parse(model.rules) 
        : Array.isArray(model.rules) 
          ? model.rules 
          : [],
    }))

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
