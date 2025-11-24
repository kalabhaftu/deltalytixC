import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function investigate() {
  console.log('\n🔍 INVESTIGATING ACCOUNT 122123\n')
  console.log('=' .repeat(80))

  // Find the account
  const phaseAccount = await prisma.phaseAccount.findUnique({
    where: { id: '122123' },
    include: {
      MasterAccount: {
        select: {
          id: true,
          accountName: true,
          propFirmName: true,
          userId: true,
        }
      },
      Trade: {
        select: {
          id: true,
          accountNumber: true,
          instrument: true,
          side: true,
          entryPrice: true,
          entryTime: true,
          entryId: true,
          pnl: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      },
      _count: {
        select: {
          Trade: true
        }
      }
    }
  })

  if (!phaseAccount) {
    console.log('❌ Phase Account 122123 NOT FOUND')
    
    // Check if it's a regular account
    const account = await prisma.account.findUnique({
      where: { id: '122123' },
      include: {
        Trade: {
          take: 10
        },
        _count: {
          select: {
            Trade: true
          }
        }
      }
    })
    
    if (account) {
      console.log('✅ Found as REGULAR ACCOUNT')
      console.log(`   Name: ${account.name}`)
      console.log(`   Number: ${account.number}`)
      console.log(`   User ID: ${account.userId}`)
      console.log(`   Total Trades: ${account._count.Trade}`)
    } else {
      console.log('❌ Account 122123 does not exist at all!')
    }
    return
  }

  console.log('✅ FOUND PHASE ACCOUNT:')
  console.log(`   Phase Account ID: ${phaseAccount.id}`)
  console.log(`   Master Account: ${phaseAccount.MasterAccount.accountName}`)
  console.log(`   Phase Number: ${phaseAccount.phaseNumber}`)
  console.log(`   Status: ${phaseAccount.status}`)
  console.log(`   User ID: ${phaseAccount.MasterAccount.userId}`)
  console.log(`   Total Trades: ${phaseAccount._count.Trade}`)

  console.log('\n\n📊 TRADES IN THIS ACCOUNT:')
  console.log('-'.repeat(80))

  if (phaseAccount.Trade.length === 0) {
    console.log('   No trades found')
  } else {
    console.log(`   Showing ${Math.min(10, phaseAccount.Trade.length)} of ${phaseAccount._count.Trade} trades:\n`)
    
    // Group by accountNumber
    const tradesByAccountNumber = phaseAccount.Trade.reduce((acc, trade) => {
      const key = trade.accountNumber || 'null'
      if (!acc[key]) acc[key] = []
      acc[key].push(trade)
      return acc
    }, {} as Record<string, typeof phaseAccount.Trade>)

    Object.entries(tradesByAccountNumber).forEach(([accountNumber, trades]) => {
      console.log(`   📋 Account Number: ${accountNumber}`)
      console.log(`      Count: ${trades.length}`)
      trades.forEach((trade, idx) => {
        console.log(`\n      ${idx + 1}. Trade ID: ${trade.id}`)
        console.log(`         Entry ID: ${trade.entryId || '(none)'}`)
        console.log(`         Instrument: ${trade.instrument}`)
        console.log(`         Side: ${trade.side}`)
        console.log(`         Entry: ${trade.entryPrice} at ${trade.entryTime?.toISOString() || 'N/A'}`)
        console.log(`         P&L: ${trade.pnl}`)
        console.log(`         Created: ${trade.createdAt.toISOString()}`)
      })
      console.log()
    })
  }

  // Check for trades with accountNumber "753251" for this user
  console.log('\n\n🔍 CHECKING FOR TRADES WITH ACCOUNT NUMBER "753251":')
  console.log('-'.repeat(80))

  const tradesWithAccountNumber = await prisma.trade.findMany({
    where: {
      userId: phaseAccount.MasterAccount.userId,
      accountNumber: '753251'
    },
    select: {
      id: true,
      accountId: true,
      phaseAccountId: true,
      accountNumber: true,
      instrument: true,
      side: true,
      entryPrice: true,
      entryTime: true,
      entryId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 10
  })

  if (tradesWithAccountNumber.length === 0) {
    console.log('   ✅ No trades found with accountNumber "753251"')
    console.log('   This means the CSV should be importable!')
  } else {
    console.log(`   ⚠️  FOUND ${tradesWithAccountNumber.length} trades with accountNumber "753251":\n`)
    
    // Group by where they're linked
    const linkedToPhase122123 = tradesWithAccountNumber.filter(t => t.phaseAccountId === '122123')
    const linkedToOtherPhases = tradesWithAccountNumber.filter(t => t.phaseAccountId && t.phaseAccountId !== '122123')
    const linkedToLiveAccounts = tradesWithAccountNumber.filter(t => t.accountId && !t.phaseAccountId)
    const orphaned = tradesWithAccountNumber.filter(t => !t.accountId && !t.phaseAccountId)

    if (linkedToPhase122123.length > 0) {
      console.log(`   📌 ${linkedToPhase122123.length} trades already linked to THIS account (122123)`)
      console.log(`      This explains why import says "all trades already exist"`)
      console.log(`      Sample:`)
      linkedToPhase122123.slice(0, 3).forEach(t => {
        console.log(`        - ${t.instrument} ${t.side} ${t.entryPrice} @ ${t.entryTime?.toISOString()}`)
      })
    }

    if (linkedToOtherPhases.length > 0) {
      console.log(`\n   📌 ${linkedToOtherPhases.length} trades linked to OTHER phase accounts:`)
      const phaseGroups = linkedToOtherPhases.reduce((acc, t) => {
        const key = t.phaseAccountId || 'unknown'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      Object.entries(phaseGroups).forEach(([phaseId, count]) => {
        console.log(`        Phase ${phaseId}: ${count} trades`)
      })
    }

    if (linkedToLiveAccounts.length > 0) {
      console.log(`\n   📌 ${linkedToLiveAccounts.length} trades linked to LIVE accounts`)
    }

    if (orphaned.length > 0) {
      console.log(`\n   👻 ${orphaned.length} ORPHANED trades (not linked to any account)`)
      console.log(`      Sample:`)
      orphaned.slice(0, 3).forEach(t => {
        console.log(`        - ${t.instrument} ${t.side} ${t.entryPrice} @ ${t.entryTime?.toISOString()}`)
        console.log(`          Created: ${t.createdAt.toISOString()}`)
      })
    }
  }

  // Sample CSV data from the file
  console.log('\n\n📄 SAMPLE CSV DATA (from CLOSED_POSITIONS_753251_1763986691248.csv):')
  console.log('-'.repeat(80))
  console.log('   Trade 1: US100 SELL 21835.73 @ 2025-06-18 15:51:09')
  console.log('   Trade 2: US100 BUY 21779.08 @ 2025-06-18 13:58:34')
  console.log('   Trade 3: US100 SELL 21765.75 @ 2025-06-18 10:40:05')

  console.log('\n\n' + '='.repeat(80))
  console.log('📝 CONCLUSION:')
  console.log('='.repeat(80))
  
  if (linkedToPhase122123 && linkedToPhase122123.length > 0) {
    console.log('\n❌ EXPECTED BEHAVIOR - NOT A BUG:')
    console.log(`   ${linkedToPhase122123.length} trades from the CSV are ALREADY in account 122123`)
    console.log('   The application correctly prevents re-importing the same trades')
    console.log('   to the SAME account.')
    console.log('\n💡 TO TEST THE FIX:')
    console.log('   1. Create a NEW prop firm account (different from 122123)')
    console.log('   2. Try importing the SAME CSV to that NEW account')
    console.log('   3. It should now work (before the fix, it would be blocked)')
  } else {
    console.log('\n✅ NO TRADES FROM CSV IN THIS ACCOUNT YET')
    console.log('   The import should work. If it\'s blocked, there might be another issue.')
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

investigate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

