'use server'

import { prisma } from '@/lib/prisma'
import { getUserIdSafe } from '@/server/auth'
import { ImageCompressor } from '@/lib/image-compression'

/**
 * Delete a trade by ID
 */
export async function deleteTrade(tradeId: string) {
  try {
    const userId = await getUserIdSafe()
    
    if (!userId) {
      return {
        success: false,
        error: 'User not authenticated'
      }
    }

    // Delete the trade (ensure it belongs to the user)
    await prisma.trade.delete({
      where: {
        id: tradeId,
        userId: userId
      }
    })

    return {
      success: true,
      message: 'Trade deleted successfully'
    }
  } catch (error) {
    console.error('Error deleting trade:', error)
    return {
      success: false,
      error: 'Failed to delete trade'
    }
  }
}

/**
 * Update trade image field (Supabase storage URL)
 */
export async function updateTradeImage(
  tradeIds: string[],
  imageUrl: string | null,
  fieldName: 'cardPreviewImage' | 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix'
) {
  try {
    const userId = await getUserIdSafe()
    
    if (!userId) {
      throw new Error('User not authenticated')
    }

  let processedImage = imageUrl

    // Update all specified trades
    await prisma.trade.updateMany({
      where: {
        id: { in: tradeIds },
        userId: userId
      },
      data: {
        [fieldName]: processedImage
      }
    })

    return {
      success: true,
      message: 'Trade image updated successfully'
    }
  } catch (error) {
    console.error('Error updating trade image:', error)
    throw error
  }
}

