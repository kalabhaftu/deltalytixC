/**
 * Cleanup Duplicate Trades
 * 
 * This script finds and removes duplicate trades that exist within the same account
 * Keeps the oldest trade (first created) and removes duplicates
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDuplicateTrades() {
  console.log('🔍 Finding duplicate trades...')
  
  try {
    // Find all trades with their duplicate group
    const duplicates = await prisma.$queryRaw<Array<{
      userId: string
      accountNumber: string
      instrument: string
      entryTime: Date | null
      side: string | null
      entryPrice: string
      count: bigint
      ids: string[]
    }>>`
      SELECT 
        "userId",
        "accountNumber",
        "instrument",
        "entryTime",
        "side",
        "entryPrice",
        COUNT(*) as count,
        array_agg("id" ORDER BY "createdAt" ASC) as ids
      FROM "public"."Trade"
      GROUP BY "userId", "accountNumber", "instrument", "entryTime", "side", "entryPrice"
      HAVING COUNT(*) > 1
    `

    console.log(`📊 Found ${duplicates.length} duplicate groups`)
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!')
      return
    }

    let totalDeleted = 0

    // Process each duplicate group
    for (const dup of duplicates) {
      const count = Number(dup.count)
      const ids = dup.ids
      
      // Keep the first (oldest) trade, delete the rest
      const idsToDelete = ids.slice(1)
      
      console.log(`  🗑️  Duplicate: ${dup.instrument} on ${dup.accountNumber} - keeping 1, deleting ${idsToDelete.length}`)
      
      // Delete duplicates
      const result = await prisma.trade.deleteMany({
        where: {
          id: {
            in: idsToDelete
          }
        }
      })
      
      totalDeleted += result.count
    }

    console.log(`\n✅ Cleanup complete!`)
    console.log(`   - Duplicate groups: ${duplicates.length}`)
    console.log(`   - Trades deleted: ${totalDeleted}`)
    console.log(`   - Trades kept: ${duplicates.length}`)
    
  } catch (error) {
    console.error('❌ Error cleaning up duplicates:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the cleanup
cleanupDuplicateTrades()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })

