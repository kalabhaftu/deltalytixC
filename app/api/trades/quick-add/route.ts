import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
    try {
        const userId = await getUserId()
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { instrument, side, pnl, entryDate, accountNumber } = body

        if (!instrument || !side || pnl === undefined) {
            return NextResponse.json(
                { error: 'Missing required fields: instrument, side, pnl' },
                { status: 400 }
            )
        }

        // Get user's first account if no account specified
        let targetAccount = accountNumber
        if (!targetAccount) {
            const firstAccount = await prisma.account.findFirst({
                where: { userId },
                select: { number: true }
            })
            targetAccount = firstAccount?.number
        }

        if (!targetAccount) {
            return NextResponse.json(
                { error: 'No trading account found. Please add an account first.' },
                { status: 400 }
            )
        }

        const now = new Date()
        const dateString = entryDate ? new Date(entryDate).toISOString() : now.toISOString()

        // Create the trade
        const trade = await prisma.trade.create({
            data: {
                id: randomUUID(),
                instrument: instrument.toUpperCase(),
                side: side.toLowerCase(),
                pnl: parseFloat(String(pnl)),
                entryDate: dateString,
                closeDate: dateString,
                accountNumber: targetAccount,
                quantity: 1,
                entryPrice: '0',
                closePrice: '0',
                commission: 0,
                userId
            }
        })

        return NextResponse.json({ success: true, trade })
    } catch (error) {
        console.error('Quick add trade error:', error)
        return NextResponse.json(
            { error: 'Failed to add trade' },
            { status: 500 }
        )
    }
}
