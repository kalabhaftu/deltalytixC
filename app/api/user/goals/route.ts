import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const goalsSchema = z.object({
    monthlyTrades: z.number().int().min(1).default(20),
    winRate: z.number().min(0).max(100).default(55),
    weeklyPnl: z.number().default(250),
})

// GET - Get user's goal settings
export async function GET(request: NextRequest) {
    try {
        const userId = await getUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { goalSettings: true }
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Return defaults if no settings found
        if (!user.goalSettings) {
            return NextResponse.json({
                goals: {
                    monthlyTrades: 20,
                    winRate: 55,
                    weeklyPnl: 250
                }
            })
        }

        return NextResponse.json({ goals: user.goalSettings })
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to fetch goals' },
            { status: 500 }
        )
    }
}

// POST - Update user's goal settings
export async function POST(request: NextRequest) {
    try {
        const userId = await getUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const validated = goalsSchema.parse(body)

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                goalSettings: validated
            },
            select: { goalSettings: true }
        })

        return NextResponse.json({ success: true, goals: user.goalSettings })
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid input', details: error.errors },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { error: 'Failed to update goals' },
            { status: 500 }
        )
    }
}
