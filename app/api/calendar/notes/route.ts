import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

export async function GET(request: NextRequest) {
  try {
    const authUserId = await getUserId()

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { auth_user_id: authUserId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get all notes for the user
    const notes = await prisma.dailyNote.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Error fetching daily notes:', error)
    if (error instanceof Error && error.message.includes('not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUserId = await getUserId()

    const body = await request.json()
    const { date, note } = body

    if (!date || note === undefined) {
      return NextResponse.json({ error: 'Date and note are required' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { auth_user_id: authUserId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse date string to Date object
    const noteDate = new Date(date)
    noteDate.setHours(0, 0, 0, 0)

    // Upsert the note (create or update)
    const savedNote = await prisma.dailyNote.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: noteDate
        }
      },
      update: {
        note: note
      },
      create: {
        userId: user.id,
        date: noteDate,
        note: note
      }
    })

    return NextResponse.json({ note: savedNote })
  } catch (error) {
    console.error('Error saving daily note:', error)
    if (error instanceof Error && error.message.includes('not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUserId = await getUserId()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { auth_user_id: authUserId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Parse date string to Date object
    const noteDate = new Date(date)
    noteDate.setHours(0, 0, 0, 0)

    // Delete the note
    await prisma.dailyNote.delete({
      where: {
        userId_date: {
          userId: user.id,
          date: noteDate
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting daily note:', error)
    if (error instanceof Error && error.message.includes('not authenticated')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}

