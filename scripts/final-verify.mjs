/**
 * Final verification using project's existing database setup
 */

import { PrismaClient } from '@prisma/client'

// Use connection pooler
const DATABASE_URL = 'postgresql://postgres.hnbmdrvnmejytsdtbsoi:WP9CGb9IoV3JIfQS@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'

const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL } },
  log: []
})

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function countWithRetry(model, name, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const count = await model.count()
      return { name, count, success: true }
    } catch (err) {
      if (i < retries - 1) {
        await sleep(1000) // Wait 1 second before retry
        continue
      }
      return { name, count: '?', success: false, error: err.message }
    }
  }
}

async function main() {
  console.log('\n🔍 Final Database Verification (with retries)...\n')
  
  await sleep(2000) // Initial delay

  const results = []
  
  // Check each table with individual retries
  results.push(await countWithRetry(prisma.user, 'User'))
  results.push(await countWithRetry(prisma.account, 'Account'))
  results.push(await countWithRetry(prisma.trade, 'Trade'))
  results.push(await countWithRetry(prisma.masterAccount, 'MasterAccount'))
  results.push(await countWithRetry(prisma.phaseAccount, 'PhaseAccount'))
  results.push(await countWithRetry(prisma.payout, 'Payout'))
  results.push(await countWithRetry(prisma.group, 'Group'))

  let allEmpty = true
  for (const r of results) {
    const icon = r.success ? (r.count === 0 ? '✅' : '⚠️') : '❓'
    console.log(`   ${r.name}: ${icon} ${r.count}`)
    if (r.count !== 0) allEmpty = false
  }

  console.log('')
  if (allEmpty) {
    console.log('✅ Database is clean and ready for fresh testing!')
  } else {
    console.log('ℹ️  Some tables may have data or verification failed')
  }

  await prisma.$disconnect()
}

main().catch(console.error)

