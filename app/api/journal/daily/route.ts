import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'

// GET - Fetch journal entry for a specific date
export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const accountId = searchParams.get('accountId')

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const journal = await prisma.dailyNote.findFirst({
      where: {
        userId,
        date: new Date(date),
        accountId: accountId || null
      }
    })

    return NextResponse.json({ journal })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch journal entry' },
      { status: 500 }
    )
  }
}

// POST - Create new journal entry
export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { date, note, emotion, accountId } = body

    if (!date || note === undefined) {
      return NextResponse.json(
        { error: 'Date and note are required' },
        { status: 400 }
      )
    }

    // Validate accountId if provided - ensure it exists in Account table and belongs to user
    let validAccountId: string | null = null
    if (accountId) {
      try {
        // Check if account exists and belongs to the user in a single query
        const userAccount = await prisma.account.findFirst({
          where: {
            id: accountId,
            userId: userId
          },
          select: { id: true }
        })
        
        if (userAccount) {
          validAccountId = accountId
        } else {
          // Account doesn't exist or doesn't belong to user - set to null
          // This prevents foreign key constraint violation and data loss
          validAccountId = null
        }
      } catch (accountError) {
        // If there's any error checking account, default to null
        // This prevents data loss - we'll create a note without account association
        validAccountId = null
      }
    }

    // Check if journal already exists for this date and account
    const existing = await prisma.dailyNote.findFirst({
      where: {
        userId,
        date: new Date(date),
        accountId: validAccountId
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Journal entry already exists for this date' },
        { status: 409 }
      )
    }

    const journal = await prisma.dailyNote.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        userId,
        date: new Date(date),
        note: note || '',
        emotion: emotion || null,
        accountId: validAccountId
      }
    })

    return NextResponse.json({ journal }, { status: 201 })
  } catch (error) {
    console.error('Error creating journal entry:', error)
    return NextResponse.json(
      { error: 'Failed to create journal entry' },
      { status: 500 }
    )
  }
}

