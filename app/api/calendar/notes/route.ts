import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

export async function GET(request: NextRequest) {
  try {
    // Try to get user ID - don't throw if not authenticated
    let authUserId: string
    try {
      authUserId = await getUserId()
    } catch (authError) {
      // Not authenticated - return empty notes gracefully
      return NextResponse.json({ notes: [] }, {
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
      })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ notes: [] }, { status: 200 })
    }

    // Get notes for the user - limited to 1 year
    const notes = await prisma.dailyNote.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 365
    })

    return NextResponse.json({ notes }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    // Gracefully return empty notes on any error
    return NextResponse.json({ notes: [] }, { 
      status: 200,
      headers: { 'Cache-Control': 'no-store' }
    })
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

    // Upsert the note (create or update) - accountId is NULL for "all accounts" notes
    const savedNote = await prisma.dailyNote.upsert({
      where: {
        userId_accountId_date: {
          userId: user.id,
          accountId: '', // Empty string matches NULL in unique constraint
          date: noteDate
        }
      },
      update: {
        note: note
      },
      create: {
        userId: user.id,
        accountId: null,
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
        userId_accountId_date: {
          userId: user.id,
          accountId: '', // Empty string matches NULL in unique constraint
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

