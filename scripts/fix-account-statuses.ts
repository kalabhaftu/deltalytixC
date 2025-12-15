
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_USER_ID = "7795bbfe-2326-4a0e-ad0b-0864ac2fd11b"

async function main() {
    console.log("=== Fixing Account Statuses Based on Breach Detection ===\n")

    // Get all PhaseAccounts with their trades
    const phaseAccounts = await prisma.phaseAccount.findMany({
        where: {
            MasterAccount: {
                userId: TARGET_USER_ID
            },
            status: 'active' // Only check active ones
        },
        include: {
            MasterAccount: true,
            Trade: {
                orderBy: { exitTime: 'asc' }
            }
        }
    })

    console.log(`Found ${phaseAccounts.length} active PhaseAccounts to check.\n`)

    const accountsToFail: { id: string; name: string; reason: string }[] = []

    for (const phase of phaseAccounts) {
        const accountName = `${phase.MasterAccount.accountName} Phase ${phase.phaseNumber}`
        console.log(`Checking: ${accountName}`)

        const accountSize = phase.MasterAccount.accountSize
        const dailyLimit = accountSize * (phase.dailyDrawdownPercent / 100)
        const maxLimit = accountSize * (phase.maxDrawdownPercent / 100)

        // Group trades by day (UTC)
        const tradesByDay = new Map<string, typeof phase.Trade>()
        for (const trade of phase.Trade) {
            const exitDate = trade.exitTime || trade.createdAt
            const dateStr = new Date(exitDate).toISOString().split('T')[0]
            if (!tradesByDay.has(dateStr)) {
                tradesByDay.set(dateStr, [])
            }
            tradesByDay.get(dateStr)!.push(trade)
        }

        const sortedDays = Array.from(tradesByDay.keys()).sort()
        let runningBalance = accountSize
        let highWaterMark = accountSize
        let breached = false
        let breachReason = ""

        for (const day of sortedDays) {
            const dayTrades = tradesByDay.get(day)!
            const dayStartBalance = runningBalance
            let dayPnL = 0

            for (const trade of dayTrades) {
                // FIXED: Commission is negative, so ADD it
                const netPnl = (trade.pnl || 0) + (trade.commission || 0)
                dayPnL += netPnl

                const currentBalance = dayStartBalance + dayPnL
                if (currentBalance > highWaterMark) highWaterMark = currentBalance

                // Max DD Check
                const maxDDThreshold = phase.maxDrawdownType === 'trailing'
                    ? highWaterMark - maxLimit
                    : accountSize - maxLimit

                if (currentBalance < maxDDThreshold && !breached) {
                    breached = true
                    breachReason = `Max Drawdown on ${day}: Balance $${currentBalance.toFixed(2)} < Limit $${maxDDThreshold.toFixed(2)}`
                }
            }

            // Daily DD Check
            if (-dayPnL > dailyLimit && !breached) {
                breached = true
                breachReason = `Daily Drawdown on ${day}: Loss $${Math.abs(dayPnL).toFixed(2)} > Limit $${dailyLimit.toFixed(2)}`
            }

            runningBalance += dayPnL
        }

        if (breached) {
            console.log(`  ❌ BREACHED: ${breachReason}`)
            accountsToFail.push({ id: phase.id, name: accountName, reason: breachReason })
        } else {
            console.log(`  ✅ OK (End Balance: $${runningBalance.toFixed(2)})`)
        }
    }

    console.log("\n=== Summary ===")
    console.log(`Accounts to mark as FAILED: ${accountsToFail.length}`)

    if (accountsToFail.length > 0) {
        console.log("\nUpdating database...")

        for (const acc of accountsToFail) {
            console.log(`  Updating ${acc.name} to 'failed'...`)

            await prisma.phaseAccount.update({
                where: { id: acc.id },
                data: { status: 'failed' }
            })

            // Create a breach record for documentation
            await prisma.breachRecord.create({
                data: {
                    id: crypto.randomUUID(),
                    phaseAccountId: acc.id,
                    breachType: acc.reason.includes('Daily') ? 'daily_drawdown' : 'max_drawdown',
                    breachAmount: 0, // We'd need to parse this from the reason
                    currentEquity: 0,
                    accountSize: 5000,
                    notes: acc.reason
                }
            })
        }

        console.log("\n✅ Database updated successfully!")
    } else {
        console.log("No accounts need to be updated.")
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
