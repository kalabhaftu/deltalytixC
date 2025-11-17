import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

// PUT - Update existing journal entry
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
    const { note, emotion } = body

    // Verify ownership
    const existing = await prisma.dailyNote.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const journal = await prisma.dailyNote.update({
      where: { id },
      data: {
        note: note !== undefined ? note : existing.note,
        emotion: emotion !== undefined ? emotion : existing.emotion
      }
    })

    return NextResponse.json({ journal })
  } catch (error) {
    console.error('Failed to update journal:', error)
    return NextResponse.json(
      { error: 'Failed to update journal entry' },
      { status: 500 }
    )
  }
}

// DELETE - Delete journal entry
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

    // Verify ownership
    const existing = await prisma.dailyNote.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
    }

    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await prisma.dailyNote.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete journal:', error)
    return NextResponse.json(
      { error: 'Failed to delete journal entry' },
      { status: 500 }
    )
  }
}

