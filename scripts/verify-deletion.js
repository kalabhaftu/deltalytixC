#!/usr/bin/env node

/**
 * Script to verify that all trades have been deleted
 * Run with: node scripts/verify-deletion.js
 */

const { PrismaClient } = require('@prisma/client')

async function verifyDeletion() {
  const prisma = new PrismaClient()

  try {
    console.log('🔄 Connecting to database...')

    // Test database connection
    await prisma.$queryRaw`SELECT 1 as test_connection`
    console.log('✅ Database connection established')

    // Check trade counts
    const totalTrades = await prisma.trade.count()
    const totalAccounts = await prisma.account.count()
    const totalUsers = await prisma.user.count()

    console.log('📊 Database Status:')
    console.log(`- Trades: ${totalTrades}`)
    console.log(`- Accounts: ${totalAccounts}`)
    console.log(`- Users: ${totalUsers}`)

    if (totalTrades === 0) {
      console.log('✅ SUCCESS: All trades have been deleted!')
      console.log('🎉 Journal page should now be empty')
    } else {
      console.log('⚠️  WARNING: Some trades still remain')
      console.log(`📊 Found ${totalTrades} remaining trades`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Full error:', error)
  } finally {
    await prisma.$disconnect()
    console.log('🔌 Database connection closed')
  }
}

// Execute the verification
verifyDeletion().catch(console.error)
