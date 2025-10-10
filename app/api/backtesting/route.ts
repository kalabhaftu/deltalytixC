import { NextRequest, NextResponse } from 'next/server'
import { getUserIdSafe } from '@/server/auth'
import { prisma } from '@/lib/prisma'

// GET - Fetch all backtests for user
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json({ 
        backtests: [],
        message: 'No authenticated user' 
      }, { status: 200 })
    }

    // Fetch all backtests for user
    const backtests = await prisma.backtestTrade.findMany({
      where: { userId },
      orderBy: { dateExecuted: 'desc' }
    })

    return NextResponse.json({ backtests }, { status: 200 })
  } catch (error) {
    console.error('Error fetching backtests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch backtests' },
      { status: 500 }
    )
  }
}

// POST - Create new backtest
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      pair,
      direction,
      outcome,
      session,
      model,
      customModel,
      riskRewardRatio,
      entryPrice,
      stopLoss,
      takeProfit,
      exitPrice,
      pnl,
      images,
      cardPreviewImage,
      notes,
      tags,
      dateExecuted,
      backtestDate
    } = body

    // Validate required fields
    if (!pair || !direction || !outcome || !session || !model) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create backtest
    const backtest = await prisma.backtestTrade.create({
      data: {
        userId,
        pair,
        direction,
        outcome,
        session,
        model,
        customModel: customModel || null,
        riskRewardRatio: parseFloat(riskRewardRatio) || 0,
        entryPrice: parseFloat(entryPrice),
        stopLoss: parseFloat(stopLoss),
        takeProfit: parseFloat(takeProfit),
        exitPrice: parseFloat(exitPrice),
        pnl: parseFloat(pnl),
        imageOne: images?.[0] || null,
        imageTwo: images?.[1] || null,
        imageThree: images?.[2] || null,
        imageFour: images?.[3] || null,
        imageFive: images?.[4] || null,
        imageSix: images?.[5] || null,
        cardPreviewImage: cardPreviewImage || null,
        notes: notes || null,
        tags: tags || [],
        dateExecuted: dateExecuted ? new Date(dateExecuted) : new Date(),
        backtestDate: backtestDate ? new Date(backtestDate) : null,
      }
    })

    return NextResponse.json({ backtest }, { status: 201 })
  } catch (error) {
    console.error('Error creating backtest:', error)
    return NextResponse.json(
      { error: 'Failed to create backtest' },
      { status: 500 }
    )
  }
}

// PUT - Update backtest
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, notes, tags, model, customModel, images, cardPreviewImage } = body

    if (!id) {
      return NextResponse.json({ error: 'Backtest ID required' }, { status: 400 })
    }

    // Verify ownership
    const existingBacktest = await prisma.backtestTrade.findFirst({
      where: { id, userId }
    })

    if (!existingBacktest) {
      return NextResponse.json(
        { error: 'Backtest not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update backtest
    const updateData: any = {
      updatedAt: new Date()
    }

    if (notes !== undefined) updateData.notes = notes || null
    if (tags !== undefined) updateData.tags = tags || []
    if (model !== undefined) updateData.model = model
    if (customModel !== undefined) updateData.customModel = customModel || null
    if (cardPreviewImage !== undefined) updateData.cardPreviewImage = cardPreviewImage || null

    if (images !== undefined) {
      updateData.imageOne = images[0] || null
      updateData.imageTwo = images[1] || null
      updateData.imageThree = images[2] || null
      updateData.imageFour = images[3] || null
      updateData.imageFive = images[4] || null
      updateData.imageSix = images[5] || null
    }

    const backtest = await prisma.backtestTrade.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({ backtest }, { status: 200 })
  } catch (error) {
    console.error('Error updating backtest:', error)
    return NextResponse.json(
      { error: 'Failed to update backtest' },
      { status: 500 }
    )
  }
}

// DELETE - Delete backtest
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Backtest ID required' }, { status: 400 })
    }

    // Verify ownership and delete
    const backtest = await prisma.backtestTrade.deleteMany({
      where: { id, userId }
    })

    if (backtest.count === 0) {
      return NextResponse.json(
        { error: 'Backtest not found or unauthorized' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting backtest:', error)
    return NextResponse.json(
      { error: 'Failed to delete backtest' },
      { status: 500 }
    )
  }
}

