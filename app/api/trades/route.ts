import { NextRequest, NextResponse } from 'next/server'
import { getTrades, deleteTrade } from '@/server/trades'
import { getUserIdSafe } from '@/server/auth'

export async function GET() {
  try {
    console.log('API: Fetching trades...')

    // Try to get trades without authentication first (for debugging)
    const userId = await getUserIdSafe()
    console.log('API: User ID:', userId)

    if (!userId) {
      console.log('API: No user ID, returning empty array for debugging')
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        debug: 'No authenticated user'
      })
    }

    const trades = await getTrades()
    console.log('API: Returning trades:', trades.length)
    return NextResponse.json({
      success: true,
      data: trades,
      count: trades.length
    })
  } catch (error) {
    console.error('API: Failed to fetch trades:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Handle authentication errors with 401 status
    if (errorMessage.includes('not authenticated')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          timestamp: new Date().toISOString()
        },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updatedTrade = await request.json()

    if (!updatedTrade.id) {
      return NextResponse.json(
        { success: false, error: 'Trade ID is required' },
        { status: 400 }
      )
    }

    // Import the update function
    const { updateTradeImage } = await import('@/server/trades')

    // Handle image updates
    const imageFields = ['imageBase64', 'imageBase64Second', 'imageBase64Third', 'imageBase64Fourth', 'imageBase64Fifth', 'imageBase64Sixth', 'cardPreviewImage']

    for (const field of imageFields) {
      if (updatedTrade[field] !== undefined) {
        await updateTradeImage([updatedTrade.id], updatedTrade[field], field as any)
      }
    }

    // Handle other trade updates
    const { prisma } = await import('@/lib/prisma')
    const userId = await getUserIdSafe()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      )
    }

    // Update the trade with non-image fields
    const { id, ...updateData } = updatedTrade
    delete updateData.imageBase64
    delete updateData.imageBase64Second
    delete updateData.imageBase64Third
    delete updateData.imageBase64Fourth
    delete updateData.imageBase64Fifth
    delete updateData.imageBase64Sixth
    delete updateData.cardPreviewImage
    delete updateData.tradingModel // Handle tradingModel separately

    // Update trading model if provided
    if (updatedTrade.tradingModel !== undefined) {
      await prisma.trade.update({
        where: { id, userId },
        data: { tradingModel: updatedTrade.tradingModel }
      })
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.trade.update({
        where: { id, userId },
        data: updateData
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update trade:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update trade' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tradeId = searchParams.get('id')

    if (!tradeId) {
      return NextResponse.json(
        { success: false, error: 'Trade ID is required' },
        { status: 400 }
      )
    }

    const result = await deleteTrade(tradeId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to delete trade:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete trade' },
      { status: 500 }
    )
  }
}
