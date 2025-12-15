
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_USER_ID = "7795bbfe-2326-4a0e-ad0b-0864ac2fd11b"

async function main() {
    console.log("=== INVESTIGATION: Account Linkage and Trade Data ===\n")

    // 1. Get all MasterAccounts and their PhaseAccounts for the user
    const masterAccounts = await prisma.masterAccount.findMany({
        where: { userId: TARGET_USER_ID },
        include: {
            PhaseAccount: {
                include: {
                    _count: {
                        select: { Trade: true }
                    }
                }
            }
        }
    })

    console.log("--- Master Accounts and Phase Accounts ---")
    for (const ma of masterAccounts) {
        console.log(`\nMaster: ${ma.accountName} (ID: ${ma.id})`)
        for (const pa of ma.PhaseAccount) {
            console.log(`  Phase ${pa.phaseNumber} [${pa.status}]`)
            console.log(`    - PhaseAccount UUID: ${pa.id}`)
            console.log(`    - PhaseId Field: ${pa.phaseId || 'NULL'}`)
            console.log(`    - Trade Count: ${pa._count.Trade}`)
        }
    }

    // 2. Find trades by entryId (from CSV) to see where they are
    console.log("\n\n--- Searching for CSV Trade IDs in Database ---")

    const csvTradeIds = [
        // EE 5k - Oct 14 (should have failed)
        "W028578945957904",  // EE 5k XAUUSD -43.60
        "W523554966945343",  // EE 5k EURUSD -157.50
        // Maven #2 - July 11 (should have failed)
        "W68927104872004056", // Maven #2 GBPUSD -80.84
        "W68967886022004108", // Maven #2 GBPUSD -106.42
        // Maven #1 - Nov 18 (should have failed)
        "M7679876981902514"   // Maven #1 US100 -255.08 (we know this exists)
    ]

    for (const entryId of csvTradeIds) {
        const trade = await prisma.trade.findFirst({
            where: { entryId },
            select: {
                id: true,
                entryId: true,
                accountNumber: true,
                phaseAccountId: true,
                pnl: true,
                commission: true,
                exitTime: true
            }
        })

        if (trade) {
            console.log(`✅ Found: ${entryId}`)
            console.log(`   accountNumber: ${trade.accountNumber}`)
            console.log(`   phaseAccountId: ${trade.phaseAccountId}`)
            console.log(`   PnL: ${trade.pnl}, Commission: ${trade.commission}`)

            // Check which PhaseAccount this is linked to
            if (trade.phaseAccountId) {
                const linkedPhase = await prisma.phaseAccount.findFirst({
                    where: { id: trade.phaseAccountId },
                    include: {
                        MasterAccount: true
                    }
                })
                if (linkedPhase) {
                    console.log(`   -> Linked to: ${linkedPhase.MasterAccount.accountName} Phase ${linkedPhase.phaseNumber}`)
                    console.log(`   -> PhaseId field: ${linkedPhase.phaseId || 'NULL'}`)
                }
            }
        } else {
            console.log(`❌ NOT FOUND: ${entryId}`)
        }
    }

    // 3. Check total trades by accountNumber to understand import patterns
    console.log("\n\n--- Trades by Account Number ---")
    const accountNumbers = await prisma.trade.groupBy({
        by: ['accountNumber'],
        where: { userId: TARGET_USER_ID },
        _count: true
    })

    for (const acc of accountNumbers) {
        console.log(`AccountNumber: ${acc.accountNumber} -> ${acc._count} trades`)
    }

    // 4. Check the phaseId values mentioned by user (from image)
    console.log("\n\n--- Checking phaseId values from user image ---")
    const imagePhaseIds = ["454020", "760314", "756009", "795964"] // From user's image

    for (const pid of imagePhaseIds) {
        const phase = await prisma.phaseAccount.findFirst({
            where: { phaseId: pid },
            include: {
                MasterAccount: true,
                _count: { select: { Trade: true } }
            }
        })

        if (phase) {
            console.log(`✅ PhaseId ${pid}: ${phase.MasterAccount.accountName} Phase ${phase.phaseNumber} (${phase._count.Trade} trades)`)
        } else {
            console.log(`❌ PhaseId ${pid}: NOT FOUND in phaseId field`)

            // Try to find by accountNumber in trades
            const tradeWithAccNum = await prisma.trade.findFirst({
                where: { accountNumber: pid, userId: TARGET_USER_ID }
            })
            if (tradeWithAccNum) {
                console.log(`   BUT found trades with accountNumber=${pid}`)
            }
        }
    }

    // 5. Check if there's a mismatch between phaseId and accountNumber
    console.log("\n\n--- Linkage Analysis ---")
    console.log("Checking if phaseId in PhaseAccount matches accountNumber in Trade...")

    for (const ma of masterAccounts) {
        for (const pa of ma.PhaseAccount) {
            if (pa.phaseId) {
                // Check if any trades have accountNumber = phaseId
                const matchingTrades = await prisma.trade.count({
                    where: {
                        accountNumber: pa.phaseId,
                        userId: TARGET_USER_ID
                    }
                })

                // Check if trades are linked via phaseAccountId
                const linkedTrades = await prisma.trade.count({
                    where: { phaseAccountId: pa.id }
                })

                console.log(`${ma.accountName} Phase ${pa.phaseNumber} (phaseId=${pa.phaseId}):`)
                console.log(`  - Trades with accountNumber=${pa.phaseId}: ${matchingTrades}`)
                console.log(`  - Trades linked by phaseAccountId: ${linkedTrades}`)

                if (matchingTrades > 0 && linkedTrades === 0) {
                    console.log(`  ⚠️  MISMATCH: Trades exist by accountNumber but NOT linked!`)
                }
            }
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
