'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getUserId, getUserIdSafe } from './auth'

export async function getTrades() {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      console.error('No user ID found - user not authenticated')
      throw new Error('User not authenticated')
    }

    console.log('Fetching trades for user:', userId)

    const trades = await prisma.trade.findMany({
      where: { userId },
      include: {
        account: true,
        phase: true,
        propFirmPhase: true,
        tradeAnalytics: true
      },
      orderBy: {
        entryTime: 'desc'
      }
    })

    console.log('Found trades:', trades.length)
    return trades
  } catch (error) {
    console.error('Failed to fetch trades:', error)
    throw new Error(`Failed to fetch trades: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function deleteTrade(tradeId: string) {
  try {
    const userId = await getUserIdSafe()

    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Verify the trade belongs to the user
    const trade = await prisma.trade.findFirst({
      where: {
        id: tradeId,
        userId
      }
    })

    if (!trade) {
      throw new Error('Trade not found')
    }

    // Delete the trade
    await prisma.trade.delete({
      where: { id: tradeId }
    })

    revalidatePath('/dashboard/journal')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete trade:', error)
    throw error
  }
}

export async function updateTradeImage(
  tradeIds: string[],
  imageData: string | null,
  field: 'imageBase64' | 'imageBase64Second' | 'imageBase64Third' | 'imageBase64Fourth' | 'imageBase64Fifth' | 'imageBase64Sixth' | 'cardPreviewImage' = 'imageBase64'
) {
  console.log('Updating trade image:', tradeIds)
  try {
    // Get user ID for verification
    const userId = await getUserIdSafe()

    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Verify all trades exist and belong to user
    const trades = await prisma.trade.findMany({
      where: {
        id: { in: tradeIds },
        userId
      }
    })

    if (trades.length !== tradeIds.length) {
      throw new Error('Some trades not found or access denied')
    }

    // Update all trades with the image data (can be base64 or URL)
    await prisma.trade.updateMany({
      where: { id: { in: tradeIds } },
      data: {
        [field]: imageData
      }
    })

    revalidatePath('/')
    return trades
  } catch (error) {
    console.error('Failed to update trade image:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}