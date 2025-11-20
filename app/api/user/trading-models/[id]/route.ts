import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const tradingModelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  rules: z.array(z.string()).optional(),
  notes: z.string().optional(),
})

// PATCH - Update trading model
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validated = tradingModelSchema.parse(body)

    // Verify model belongs to user
    const existing = await prisma.tradingModel.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If name is being changed, check for duplicates
    if (validated.name && validated.name !== existing.name) {
      const duplicate = await prisma.tradingModel.findUnique({
        where: {
          userId_name: {
            userId,
            name: validated.name,
          },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A model with this name already exists' },
          { status: 400 }
        )
      }
    }

    const model = await prisma.tradingModel.update({
      where: { id: params.id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.rules && { rules: validated.rules }),
        ...(validated.notes !== undefined && { notes: validated.notes }),
      },
    })

    return NextResponse.json({ success: true, model })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error updating trading model:', error)
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    )
  }
}

// DELETE - Delete trading model
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify model belongs to user
    const existing = await prisma.tradingModel.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: { Trade: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if model is used in trades
    const tradesCount = existing._count.Trade

    // Delete the model (trades will have modelId set to null due to onDelete: SetNull)
    await prisma.tradingModel.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: tradesCount > 0 
        ? `Model deleted. ${tradesCount} trade(s) no longer reference this model.`
        : 'Model deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting trading model:', error)
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    )
  }
}

