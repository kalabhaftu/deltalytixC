import { PrismaClient } from '@prisma/client'
import { createClient } from '@/lib/supabase'

const prisma = new PrismaClient()

async function fixMissingImages() {
  try {
    console.log('🔧 Fixing missing trade images...\n')

    const supabase = await createClient()

    // Get all trades with userId
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { cardPreviewImage: { not: null } },
          { imageOne: null },
          { imageTwo: null },
          { imageThree: null },
          { imageFour: null },
          { imageFive: null },
          { imageSix: null },
        ]
      },
      select: {
        id: true,
        userId: true,
        instrument: true,
        side: true,
        cardPreviewImage: true,
        imageOne: true,
        imageTwo: true,
        imageThree: true,
        imageFour: true,
        imageFive: true,
        imageSix: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    console.log(`Found ${trades.length} trades to check\n`)

    let fixedCount = 0

    for (const trade of trades) {
      console.log(`\n📊 Checking trade: ${trade.instrument} ${trade.side}`)
      console.log(`   Trade ID: ${trade.id}`)
      console.log(`   User ID: ${trade.userId}`)

      // List files in the trade folder
      const folderPath = `trades/${trade.userId}/${trade.id}`
      
      const { data: files, error } = await supabase.storage
        .from('trade-images')
        .list(folderPath, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'asc' }
        })

      if (error) {
        console.log(`   ⚠️  Error listing files: ${error.message}`)
        continue
      }

      if (!files || files.length === 0) {
        console.log(`   ℹ️  No files found in storage`)
        continue
      }

      console.log(`   Found ${files.length} files in storage:`)

      const imageMap: any = {}

      // Map filenames to database fields
      for (const file of files) {
        const fileName = file.name.toLowerCase()
        console.log(`      - ${file.name}`)

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('trade-images')
          .getPublicUrl(`${folderPath}/${file.name}`)

        const url = urlData.publicUrl

        // Map based on filename patterns
        if (fileName.includes('cardpreview') || fileName.includes('card_preview')) {
          imageMap.cardPreviewImage = url
        } else if (fileName.includes('imagebase64sixth') || fileName.includes('image_six') || fileName.includes('screenshot_6')) {
          imageMap.imageSix = url
        } else if (fileName.includes('imagebase64fifth') || fileName.includes('image_five') || fileName.includes('screenshot_5')) {
          imageMap.imageFive = url
        } else if (fileName.includes('imagebase64fourth') || fileName.includes('image_four') || fileName.includes('screenshot_4')) {
          imageMap.imageFour = url
        } else if (fileName.includes('imagebase64third') || fileName.includes('image_three') || fileName.includes('screenshot_3')) {
          imageMap.imageThree = url
        } else if (fileName.includes('imagebase64second') || fileName.includes('image_two') || fileName.includes('screenshot_2')) {
          imageMap.imageTwo = url
        } else if (fileName.includes('imagebase64') || fileName.includes('image_one') || fileName.includes('screenshot_1')) {
          // This should be last to avoid matching "imagebase64second" etc
          if (!imageMap.imageTwo && !imageMap.imageThree) {
            imageMap.imageOne = url
          }
        }
      }

      // Update database if we found new images
      const updateData: any = {}
      let hasUpdates = false

      if (imageMap.cardPreviewImage && !trade.cardPreviewImage) {
        updateData.cardPreviewImage = imageMap.cardPreviewImage
        hasUpdates = true
      }
      if (imageMap.imageOne && !trade.imageOne) {
        updateData.imageOne = imageMap.imageOne
        hasUpdates = true
      }
      if (imageMap.imageTwo && !trade.imageTwo) {
        updateData.imageTwo = imageMap.imageTwo
        hasUpdates = true
      }
      if (imageMap.imageThree && !trade.imageThree) {
        updateData.imageThree = imageMap.imageThree
        hasUpdates = true
      }
      if (imageMap.imageFour && !trade.imageFour) {
        updateData.imageFour = imageMap.imageFour
        hasUpdates = true
      }
      if (imageMap.imageFive && !trade.imageFive) {
        updateData.imageFive = imageMap.imageFive
        hasUpdates = true
      }
      if (imageMap.imageSix && !trade.imageSix) {
        updateData.imageSix = imageMap.imageSix
        hasUpdates = true
      }

      if (hasUpdates) {
        console.log(`   ✅ Updating database with ${Object.keys(updateData).length} new image URLs`)
        
        await prisma.trade.update({
          where: { id: trade.id },
          data: updateData
        })

        fixedCount++
      } else {
        console.log(`   ℹ️  No new images to add`)
      }
    }

    console.log(`\n\n🎉 Fixed ${fixedCount} trades with missing images!`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixMissingImages()

