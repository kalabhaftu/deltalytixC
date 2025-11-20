import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTradeImages() {
  try {
    console.log('🔍 Checking trade images in database...\n')

    // Get all trades with any image fields
    const trades = await prisma.trade.findMany({
      where: {
        OR: [
          { cardPreviewImage: { not: null } },
          { imageOne: { not: null } },
          { imageTwo: { not: null } },
          { imageThree: { not: null } },
          { imageFour: { not: null } },
          { imageFive: { not: null } },
          { imageSix: { not: null } },
        ]
      },
      select: {
        id: true,
        instrument: true,
        side: true,
        pnl: true,
        userId: true,
        cardPreviewImage: true,
        imageOne: true,
        imageTwo: true,
        imageThree: true,
        imageFour: true,
        imageFive: true,
        imageSix: true,
      },
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${trades.length} trades with images\n`)

    for (const trade of trades) {
      const imageCount = [
        trade.cardPreviewImage,
        trade.imageOne,
        trade.imageTwo,
        trade.imageThree,
        trade.imageFour,
        trade.imageFive,
        trade.imageSix,
      ].filter(Boolean).length

      console.log(`📊 Trade: ${trade.instrument} ${trade.side} (P&L: $${trade.pnl})`)
      console.log(`   ID: ${trade.id.substring(0, 20)}...`)
      console.log(`   User ID: ${trade.userId.substring(0, 20)}...`)
      console.log(`   Total Images: ${imageCount}/7`)
      console.log(`   - cardPreviewImage: ${trade.cardPreviewImage ? '✅' : '❌'}`)
      console.log(`   - imageOne: ${trade.imageOne ? '✅' : '❌'}`)
      console.log(`   - imageTwo: ${trade.imageTwo ? '✅' : '❌'}`)
      console.log(`   - imageThree: ${trade.imageThree ? '✅' : '❌'}`)
      console.log(`   - imageFour: ${trade.imageFour ? '✅' : '❌'}`)
      console.log(`   - imageFive: ${trade.imageFive ? '✅' : '❌'}`)
      console.log(`   - imageSix: ${trade.imageSix ? '✅' : '❌'}`)
      
      if (trade.cardPreviewImage) {
        console.log(`   Preview URL: ${trade.cardPreviewImage.substring(0, 80)}...`)
      }
      if (trade.imageOne) {
        console.log(`   Image 1 URL: ${trade.imageOne.substring(0, 80)}...`)
      }
      
      console.log('')
    }

    // Group by user to see distribution
    console.log('\n📈 Summary by User:')
    const userStats = trades.reduce((acc: any, trade) => {
      const userId = trade.userId.substring(0, 10)
      if (!acc[userId]) {
        acc[userId] = { trades: 0, totalImages: 0 }
      }
      acc[userId].trades++
      acc[userId].totalImages += [
        trade.cardPreviewImage,
        trade.imageOne,
        trade.imageTwo,
        trade.imageThree,
        trade.imageFour,
        trade.imageFive,
        trade.imageSix,
      ].filter(Boolean).length
      return acc
    }, {})

    for (const [userId, stats] of Object.entries(userStats)) {
      console.log(`   User ${userId}...: ${(stats as any).trades} trades, ${(stats as any).totalImages} total images`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTradeImages()

