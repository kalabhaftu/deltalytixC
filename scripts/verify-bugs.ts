
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log("=== BUG VERIFICATION SCRIPT ===\n")

    // 1. Verify commission sign - how is it stored?
    console.log("--- Bug #1: Commission Sign Verification ---")
    const tradesWithCommission = await prisma.trade.findMany({
        where: {
            commission: { not: 0 }
        },
        take: 10,
        select: {
            id: true,
            entryId: true,
            pnl: true,
            commission: true,
            instrument: true
        }
    })

    console.log("Sample trades with commission:")
    tradesWithCommission.forEach(t => {
        const sign = t.commission > 0 ? "POSITIVE" : "NEGATIVE"
        console.log(`  ${t.entryId}: pnl=${t.pnl}, commission=${t.commission} (${sign})`)
    })

    const positiveCommissions = tradesWithCommission.filter(t => t.commission > 0).length
    const negativeCommissions = tradesWithCommission.filter(t => t.commission < 0).length
    console.log(`\nCommission sign distribution:`)
    console.log(`  Positive: ${positiveCommissions}`)
    console.log(`  Negative: ${negativeCommissions}`)

    if (negativeCommissions > positiveCommissions) {
        console.log("  ⚠️  CONFIRMED: Commission is stored as NEGATIVE")
        console.log("  ⚠️  All 'pnl - commission' calculations should be 'pnl + commission'")
    } else if (positiveCommissions > negativeCommissions) {
        console.log("  ✅ Commission is stored as POSITIVE - 'pnl - commission' is correct")
    } else {
        console.log("  ❓ Mixed signs - need more investigation")
    }

    // 2. Check for any UI/data inconsistencies
    console.log("\n--- Bug #2: Data Integrity Checks ---")

    // Check for trades without exitTime
    const tradesNoExitTime = await prisma.trade.count({
        where: { exitTime: null }
    })
    console.log(`Trades without exitTime: ${tradesNoExitTime}`)
    if (tradesNoExitTime > 0) {
        console.log("  ⚠️  Some trades have no exitTime - may cause sorting issues")
    }

    // Check for orphaned trades (no phaseAccountId and no accountNumber)
    const orphanedTrades = await prisma.trade.count({
        where: {
            phaseAccountId: null,
            accountId: null
        }
    })
    console.log(`Orphaned trades (no account link): ${orphanedTrades}`)
    if (orphanedTrades > 0) {
        console.log("  ⚠️  Orphaned trades found - won't appear in any account")
    }

    // Check for accounts with status mismatch
    console.log("\n--- Bug #3: Account Status Integrity ---")
    const activeAccountsWithNoTrades = await prisma.phaseAccount.findMany({
        where: {
            status: 'active',
            Trade: { none: {} }
        },
        include: {
            MasterAccount: true
        }
    })
    console.log(`Active accounts with 0 trades: ${activeAccountsWithNoTrades.length}`)
    activeAccountsWithNoTrades.slice(0, 5).forEach(pa => {
        console.log(`  - ${pa.MasterAccount.accountName} Phase ${pa.phaseNumber}`)
    })

    // Check for passed accounts that should be failed
    console.log("\n--- Bug #4: Checking 'passed' accounts for actual completion ---")
    const passedAccounts = await prisma.phaseAccount.findMany({
        where: { status: 'passed' },
        include: {
            MasterAccount: true,
            Trade: true
        }
    })

    for (const pa of passedAccounts) {
        const totalPnL = pa.Trade.reduce((sum, t) => sum + (t.pnl || 0) + (t.commission || 0), 0)
        const profitTarget = pa.MasterAccount.accountSize * (pa.profitTargetPercent / 100)

        console.log(`${pa.MasterAccount.accountName} Phase ${pa.phaseNumber}:`)
        console.log(`  Total Net PnL: $${totalPnL.toFixed(2)}`)
        console.log(`  Profit Target: $${profitTarget.toFixed(2)} (${pa.profitTargetPercent}%)`)

        if (totalPnL < profitTarget) {
            console.log(`  ⚠️  STATUS MISMATCH: Marked 'passed' but PnL < target!`)
        } else {
            console.log(`  ✅ Correctly passed`)
        }
    }

    // 3. Check for duplicate entryIds
    console.log("\n--- Bug #5: Duplicate Trade Detection ---")
    const duplicates = await prisma.$queryRaw`
        SELECT "entryId", COUNT(*) as count 
        FROM "Trade" 
        WHERE "entryId" IS NOT NULL 
        GROUP BY "entryId" 
        HAVING COUNT(*) > 1 
        LIMIT 10
    ` as any[]

    console.log(`Duplicate entryIds found: ${duplicates.length}`)
    duplicates.forEach(d => {
        console.log(`  ${d.entryId}: ${d.count} occurrences`)
    })
    if (duplicates.length > 0) {
        console.log("  ⚠️  Duplicate trades may cause double-counting!")
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
