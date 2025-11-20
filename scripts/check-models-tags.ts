import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  try {
    const models = await prisma.tradingModel.findMany({
      select: {
        id: true,
        name: true,
        rules: true,
        userId: true,
      }
    })

    const tags = await prisma.tradeTag.findMany({
      select: {
        id: true,
        name: true,
        color: true,
        userId: true,
      }
    })

    console.log('\n📊 Trading Models:', models.length)
    models.forEach(m => {
      console.log(`  - ${m.name} (${m.id.substring(0, 8)}...)`)
      console.log(`    Rules:`, typeof m.rules, Array.isArray(m.rules) ? `Array[${m.rules.length}]` : m.rules)
    })

    console.log('\n🏷️  Tags:', tags.length)
    tags.forEach(t => {
      console.log(`  - ${t.name} (${t.color})`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()

