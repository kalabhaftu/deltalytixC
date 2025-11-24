import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

// PUT - Update a tag
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const body = await request.json()
    const { name, color } = body

    // Verify tag ownership
    const existingTag = await prisma.tradeTag.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Check if new name conflicts with another tag
    if (name && name !== existingTag.name) {
      const nameConflict = await prisma.tradeTag.findUnique({
        where: {
          name_userId: {
            name,
            userId
          }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Tag with this name already exists' },
          { status: 400 }
        )
      }
    }

    const updatedTag = await prisma.tradeTag.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color })
      }
    })

    return NextResponse.json({ tag: updatedTag })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update tag' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a tag
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Verify tag ownership
    const existingTag = await prisma.tradeTag.findFirst({
      where: {
        id,
        userId
      }
    })

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Remove tag from all trades
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        tags: {
          contains: id
        }
      }
    })

    for (const trade of trades) {
      const tagIds = trade.tags?.split(',').filter((tagId) => tagId !== id) || []
      await prisma.trade.update({
        where: { id: trade.id },
        data: { tags: tagIds.length > 0 ? tagIds.join(',') : null }
      })
    }

    // Delete the tag
    await prisma.tradeTag.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete tag' },
      { status: 500 }
    )
  }
}

