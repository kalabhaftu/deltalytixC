import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth'
import { CacheHeaders } from '@/lib/api-cache-headers'

// GET - Fetch all tags for a user
export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tags = await prisma.tradeTag.findMany({
      where: { userId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ tags }, {
      headers: CacheHeaders.short // Cache for 60 seconds
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tags' },
      { status: 500 }
    )
  }
}

// POST - Create a new tag
export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      )
    }

    // Check if tag already exists
    const existingTag = await prisma.tradeTag.findUnique({
      where: {
        name_userId: {
          name,
          userId
        }
      }
    })

    if (existingTag) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      )
    }

    const tag = await prisma.tradeTag.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        name,
        color: color || '#3b82f6',
        userId
      }
    })

    return NextResponse.json({ tag })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create tag' },
      { status: 500 }
    )
  }
}

