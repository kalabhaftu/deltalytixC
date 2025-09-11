'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getUserId } from './auth'

export async function updateTradeImage(
  tradeIds: string[], 
  imageData: string | null, 
  field: 'imageBase64' | 'imageBase64Second' | 'imageBase64Third' | 'imageBase64Fourth' = 'imageBase64'
) {
  console.log('Updating trade image:', tradeIds)
  try {
    // Verify all trades exist
    const trades = await prisma.trade.findMany({
      where: { id: { in: tradeIds } }
    })

    if (trades.length !== tradeIds.length) {
      throw new Error('Some trades not found')
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