#!/usr/bin/env node

/**
 * Migration script to fix trade-account linking
 * Updates trades that have accountNumber but no accountId
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixTradeAccountLinking() {
  try {
    console.log('🔍 Finding trades without accountId...')
    
    // Find trades that have accountNumber but no accountId
    const tradesWithoutAccountId = await prisma.trade.findMany({
      where: {
        accountId: null,
        accountNumber: { not: '' }
      },
      select: {
        id: true,
        accountNumber: true,
        userId: true
      }
    })
    
    console.log(`📊 Found ${tradesWithoutAccountId.length} trades without accountId`)
    
    if (tradesWithoutAccountId.length === 0) {
      console.log('✅ All trades already have accountId set')
      return
    }
    
    // Get unique account numbers
    const accountNumbers = [...new Set(tradesWithoutAccountId.map(t => t.accountNumber))]
    console.log(`🔍 Looking up ${accountNumbers.length} unique account numbers...`)
    
    // Find matching accounts
    const accounts = await prisma.account.findMany({
      where: {
        number: { in: accountNumbers }
      },
      select: {
        id: true,
        number: true,
        userId: true
      }
    })
    
    console.log(`📋 Found ${accounts.length} matching accounts`)
    
    // Create a map for quick lookup
    const accountMap = new Map()
    accounts.forEach(account => {
      accountMap.set(account.number, account)
    })
    
    // Update trades with accountId
    let updatedCount = 0
    let skippedCount = 0
    
    for (const trade of tradesWithoutAccountId) {
      const account = accountMap.get(trade.accountNumber)
      
      if (account && account.userId === trade.userId) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: { accountId: account.id }
        })
        updatedCount++
        console.log(`✅ Updated trade ${trade.id} -> account ${account.id}`)
      } else {
        skippedCount++
        console.log(`⚠️  Skipped trade ${trade.id} - no matching account found`)
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Updated: ${updatedCount} trades`)
    console.log(`   ⚠️  Skipped: ${skippedCount} trades`)
    console.log(`   📋 Total processed: ${tradesWithoutAccountId.length} trades`)
    
  } catch (error) {
    console.error('❌ Error fixing trade account linking:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  fixTradeAccountLinking()
    .then(() => {
      console.log('🎉 Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

module.exports = { fixTradeAccountLinking }


