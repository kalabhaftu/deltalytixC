import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const tradingModelSchema = z.object({
  name: z.string().min(1, 'Model name is required').max(100),
  rules: z.array(z.string()).default([]),
  notes: z.string().optional(),
})

// GET - List all trading models for user
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const models = await prisma.tradingModel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, models })
  } catch (error) {
    console.error('Error fetching trading models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

// POST - Create new trading model
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = tradingModelSchema.parse(body)

    // Check if model with same name already exists
    const existing = await prisma.tradingModel.findUnique({
      where: {
        userId_name: {
          userId: user.id,
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
        userId: user.id,
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
    console.error('Error creating trading model:', error)
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    )
  }
}
