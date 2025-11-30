/**
 * Verify Database is Clean
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.hnbmdrvnmejytsdtbsoi:WP9CGb9IoV3JIfQS@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    }
  }
})

async function verify() {
  console.log('\n📊 Verification of Database Cleanup:\n')
  
  try {
    const [users, accounts, trades, masters, phases, payouts] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.trade.count(),
      prisma.masterAccount.count(),
      prisma.phaseAccount.count(),
      prisma.payout.count()
    ])

    console.log('   Users:', users)
    console.log('   Accounts:', accounts)
    console.log('   Trades:', trades)
    console.log('   MasterAccounts:', masters)
    console.log('   PhaseAccounts:', phases)
    console.log('   Payouts:', payouts)
    
    const allZero = users === 0 && accounts === 0 && trades === 0 && 
                    masters === 0 && phases === 0 && payouts === 0
    console.log('\n' + (allZero ? '✅ All tables are empty!' : '⚠️ Some tables still have data'))
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await prisma.$disconnect()
  }
}

verify()

