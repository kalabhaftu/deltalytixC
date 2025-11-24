import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { WeeklyExpectation } from '@prisma/client'
import { randomUUID } from 'crypto'

function normalizeToMonday(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  const day = normalized.getDay()
  const diff = normalized.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(normalized.setDate(diff))
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ review: null }, { status: 401 })
    }

    const dateParam = request.nextUrl.searchParams.get('date')
    if (!dateParam) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 })
    }

    const monday = normalizeToMonday(new Date(dateParam))
    const review = await prisma.weeklyReview.findUnique({
      where: {
        userId_startDate: {
          userId,
          startDate: monday
        }
      }
    })

    return NextResponse.json({ review }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch weekly review' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      startDate,
      endDate,
      calendarImage,
      expectation,
      actualOutcome,
      isCorrect,
      notes,
    }: {
      startDate: string
      endDate: string
      calendarImage?: string
      expectation?: WeeklyExpectation | null
      actualOutcome?: WeeklyExpectation | null
      isCorrect?: boolean | null
      notes?: string | null
    } = body

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing startDate or endDate' }, { status: 400 })
    }

    const monday = normalizeToMonday(new Date(startDate))
    const review = await prisma.weeklyReview.upsert({
      where: {
        userId_startDate: {
          userId,
          startDate: monday
        }
      },
      update: {
        calendarImage,
        expectation: expectation ?? undefined,
        actualOutcome: actualOutcome ?? undefined,
        isCorrect: typeof isCorrect === 'boolean' ? isCorrect : undefined,
        notes: notes ?? undefined,
        endDate: new Date(endDate)
      },
      create: {
        id: randomUUID(),
        userId,
        startDate: monday,
        endDate: new Date(endDate),
        calendarImage,
        expectation: expectation ?? undefined,
        actualOutcome: actualOutcome ?? undefined,
        isCorrect: typeof isCorrect === 'boolean' ? isCorrect : undefined,
        notes: notes ?? undefined,
      }
    })

    return NextResponse.json({ review }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save weekly review' }, { status: 500 })
  }
}


