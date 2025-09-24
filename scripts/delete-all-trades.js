#!/usr/bin/env node

/**
 * Script to delete all trades from the database
 * Run with: node scripts/delete-all-trades.js
 */

const { PrismaClient } = require('@prisma/client')

async function deleteAllTrades() {
  const prisma = new PrismaClient()

  try {
    console.log('🔄 Connecting to database...')

    // Test database connection
    await prisma.$queryRaw`SELECT 1 as test_connection`
    console.log('✅ Database connection established')

    // Get total count before deletion
    const totalTrades = await prisma.trade.count()
    console.log(`📊 Found ${totalTrades} trades in database`)

    if (totalTrades === 0) {
      console.log('ℹ️  No trades to delete')
      return
    }

    // Confirm deletion
    console.log('⚠️  WARNING: This will delete ALL trades permanently!')
    console.log('⚠️  This action cannot be undone!')

    // Uncomment the lines below if you want to proceed with deletion
    // const deletedCount = await prisma.trade.deleteMany({})
    // console.log(`🗑️  Successfully deleted ${deletedCount.count} trades`)

    console.log('❌ Deletion cancelled - uncomment lines in script to proceed')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  }
}

// Uncomment the line below to actually execute the deletion
// deleteAllTrades()

console.log('📝 Script loaded. To execute deletion:')
console.log('1. Uncomment the last line in this file')
console.log('2. Run: node scripts/delete-all-trades.js')
console.log('3. Or run the script directly with: node scripts/delete-all-trades.js')
