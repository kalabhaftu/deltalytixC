import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function reconnectOrphanedImages() {
  try {
    console.log('🔧 Reconnecting orphaned images from storage to database...\n')

    // Get all trades
    const trades = await prisma.trade.findMany({
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
      take: 100
    })

    console.log(`Checking ${trades.length} trades...\n`)

    let fixedCount = 0

    for (const trade of trades) {
      // Check if trade already has all images
      const existingImages = [
        trade.cardPreviewImage,
        trade.imageOne,
        trade.imageTwo,
        trade.imageThree,
        trade.imageFour,
        trade.imageFive,
        trade.imageSix,
      ].filter(Boolean).length

      if (existingImages === 7) {
        continue // Skip trades that already have all images
      }

      // List files in storage for this trade
      const storagePath = `trades/${trade.userId}/${trade.id}`
      
      const { data: files, error } = await supabase.storage
        .from('trade-images')
        .list(storagePath, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'asc' }
        })

      if (error || !files || files.length === 0) {
        continue
      }

      console.log(`\n📊 ${trade.instrument} ${trade.side} - Found ${files.length} files in storage`)
      console.log(`   Current DB images: ${existingImages}/7`)

      const updates: any = {}

      for (const file of files) {
        const fileName = file.name.toLowerCase()
        const fullPath = `${storagePath}/${file.name}`
        
        // Get public URL
        const { data: urlData } = supabase.storage
          .from('trade-images')
          .getPublicUrl(fullPath)

        const url = urlData.publicUrl

        console.log(`   📄 ${file.name}`)

        // Map filename to database field
        if (fileName.includes('cardpreview') && !trade.cardPreviewImage) {
          updates.cardPreviewImage = url
          console.log(`      → Will save as cardPreviewImage`)
        } else if ((fileName.includes('imagebase64sixth') || fileName.includes('sixth')) && !trade.imageSix) {
          updates.imageSix = url
          console.log(`      → Will save as imageSix`)
        } else if ((fileName.includes('imagebase64fifth') || fileName.includes('fifth')) && !trade.imageFive) {
          updates.imageFive = url
          console.log(`      → Will save as imageFive`)
        } else if ((fileName.includes('imagebase64fourth') || fileName.includes('fourth')) && !trade.imageFour) {
          updates.imageFour = url
          console.log(`      → Will save as imageFour`)
        } else if ((fileName.includes('imagebase64third') || fileName.includes('third')) && !trade.imageThree) {
          updates.imageThree = url
          console.log(`      → Will save as imageThree`)
        } else if ((fileName.includes('imagebase64second') || fileName.includes('second')) && !trade.imageTwo) {
          updates.imageTwo = url
          console.log(`      → Will save as imageTwo`)
        } else if ((fileName.includes('imagebase64') || fileName.startsWith('image')) && !fileName.includes('second') && !fileName.includes('third') && !fileName.includes('fourth') && !fileName.includes('fifth') && !fileName.includes('sixth') && !trade.imageOne) {
          updates.imageOne = url
          console.log(`      → Will save as imageOne`)
        }
      }

      if (Object.keys(updates).length > 0) {
        console.log(`   ✅ Updating ${Object.keys(updates).length} image(s) in database`)
        
        await prisma.trade.update({
          where: { id: trade.id },
          data: updates
        })

        fixedCount++
      } else {
        console.log(`   ℹ️  No new mappings found`)
      }
    }

    console.log(`\n\n🎉 Successfully reconnected images for ${fixedCount} trades!`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

reconnectOrphanedImages()

