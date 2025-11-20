
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Checking last 5 trades for image data...')
  
  const trades = await prisma.trade.findMany({
    take: 5,
    orderBy: {
      createdAt: 'desc'
    },
    select: {
      id: true,
      instrument: true,
      cardPreviewImage: true,
      imageOne: true,
      imageTwo: true,
      imageThree: true,
      imageFour: true,
      imageFive: true,
      imageSix: true,
      createdAt: true
    }
  })

  console.log('Found trades:', trades.length)
  
  trades.forEach(trade => {
    console.log('------------------------------------------------')
    console.log(`Trade ID: ${trade.id} (${trade.instrument})`)
    console.log(`Created: ${trade.createdAt}`)
    console.log(`Preview: ${trade.cardPreviewImage ? '✅ Present' : '❌ NULL'} - ${trade.cardPreviewImage?.substring(0, 50)}...`)
    console.log(`Image 1: ${trade.imageOne ? '✅ Present' : '❌ NULL'} - ${trade.imageOne?.substring(0, 50)}...`)
    console.log(`Image 2: ${trade.imageTwo ? '✅ Present' : '❌ NULL'} - ${trade.imageTwo?.substring(0, 50)}...`)
    console.log(`Image 3: ${trade.imageThree ? '✅ Present' : '❌ NULL'} - ${trade.imageThree?.substring(0, 50)}...`)
    console.log(`Image 4: ${trade.imageFour ? '✅ Present' : '❌ NULL'} - ${trade.imageFour?.substring(0, 50)}...`)
    console.log(`Image 5: ${trade.imageFive ? '✅ Present' : '❌ NULL'} - ${trade.imageFive?.substring(0, 50)}...`)
    console.log(`Image 6: ${trade.imageSix ? '✅ Present' : '❌ NULL'} - ${trade.imageSix?.substring(0, 50)}...`)
  })
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
