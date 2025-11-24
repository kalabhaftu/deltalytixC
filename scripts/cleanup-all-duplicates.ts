/**
 * Cleanup All Duplicate Records
 * 
 * Finds and removes duplicates from:
 * - MasterAccounts (by userId + accountName)
 * - PhaseAccounts (by masterAccountId + phaseNumber)
 * - BacktestTrades (by userId + pair + dateExecuted + entryPrice + direction)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupDuplicateMasterAccounts() {
  console.log('\n🔍 Finding duplicate MasterAccounts...')
  
  const duplicates = await prisma.$queryRaw<Array<{
    userId: string
    accountName: string
    count: bigint
    ids: string[]
  }>>`
    SELECT 
      "userId",
      "accountName",
      COUNT(*) as count,
      array_agg("id" ORDER BY "createdAt" ASC) as ids
    FROM "public"."MasterAccount"
    GROUP BY "userId", "accountName"
    HAVING COUNT(*) > 1
  `

  console.log(`📊 Found ${duplicates.length} duplicate MasterAccount groups`)
  
  if (duplicates.length === 0) {
    console.log('✅ No MasterAccount duplicates found!')
    return 0
  }

  let totalDeleted = 0
  for (const dup of duplicates) {
    const idsToDelete = dup.ids.slice(1)
    console.log(`  🗑️  Duplicate: ${dup.accountName} - keeping 1, deleting ${idsToDelete.length}`)
    
    const result = await prisma.masterAccount.deleteMany({
      where: { id: { in: idsToDelete } }
    })
    totalDeleted += result.count
  }

  return totalDeleted
}

async function cleanupDuplicatePhaseAccounts() {
  console.log('\n🔍 Finding duplicate PhaseAccounts...')
  
  const duplicates = await prisma.$queryRaw<Array<{
    masterAccountId: string
    phaseNumber: number
    count: bigint
    ids: string[]
  }>>`
    SELECT 
      "masterAccountId",
      "phaseNumber",
      COUNT(*) as count,
      array_agg("id" ORDER BY "startDate" ASC) as ids
    FROM "public"."PhaseAccount"
    GROUP BY "masterAccountId", "phaseNumber"
    HAVING COUNT(*) > 1
  `

  console.log(`📊 Found ${duplicates.length} duplicate PhaseAccount groups`)
  
  if (duplicates.length === 0) {
    console.log('✅ No PhaseAccount duplicates found!')
    return 0
  }

  let totalDeleted = 0
  for (const dup of duplicates) {
    const idsToDelete = dup.ids.slice(1)
    console.log(`  🗑️  Duplicate: Master ${dup.masterAccountId} Phase ${dup.phaseNumber} - keeping 1, deleting ${idsToDelete.length}`)
    
    const result = await prisma.phaseAccount.deleteMany({
      where: { id: { in: idsToDelete } }
    })
    totalDeleted += result.count
  }

  return totalDeleted
}

async function cleanupDuplicateBacktestTrades() {
  console.log('\n🔍 Finding duplicate BacktestTrades...')
  
  const duplicates = await prisma.$queryRaw<Array<{
    userId: string
    pair: string
    dateExecuted: Date
    entryPrice: number
    direction: string
    count: bigint
    ids: string[]
  }>>`
    SELECT 
      "userId",
      "pair",
      "dateExecuted",
      "entryPrice",
      "direction",
      COUNT(*) as count,
      array_agg("id" ORDER BY "createdAt" ASC) as ids
    FROM "public"."BacktestTrade"
    GROUP BY "userId", "pair", "dateExecuted", "entryPrice", "direction"
    HAVING COUNT(*) > 1
  `

  console.log(`📊 Found ${duplicates.length} duplicate BacktestTrade groups`)
  
  if (duplicates.length === 0) {
    console.log('✅ No BacktestTrade duplicates found!')
    return 0
  }

  let totalDeleted = 0
  for (const dup of duplicates) {
    const idsToDelete = dup.ids.slice(1)
    console.log(`  🗑️  Duplicate: ${dup.pair} ${dup.direction} - keeping 1, deleting ${idsToDelete.length}`)
    
    const result = await prisma.backtestTrade.deleteMany({
      where: { id: { in: idsToDelete } }
    })
    totalDeleted += result.count
  }

  return totalDeleted
}

async function cleanupAllDuplicates() {
  console.log('🧹 Starting comprehensive duplicate cleanup...\n')
  
  try {
    const masterAccountsDeleted = await cleanupDuplicateMasterAccounts()
    const phaseAccountsDeleted = await cleanupDuplicatePhaseAccounts()
    const backtestTradesDeleted = await cleanupDuplicateBacktestTrades()

    console.log(`\n✅ Cleanup complete!`)
    console.log(`   - MasterAccounts deleted: ${masterAccountsDeleted}`)
    console.log(`   - PhaseAccounts deleted: ${phaseAccountsDeleted}`)
    console.log(`   - BacktestTrades deleted: ${backtestTradesDeleted}`)
    console.log(`   - Total deleted: ${masterAccountsDeleted + phaseAccountsDeleted + backtestTradesDeleted}`)
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

cleanupAllDuplicates()
  .then(() => {
    console.log('\n🎉 Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error)
    process.exit(1)
  })

