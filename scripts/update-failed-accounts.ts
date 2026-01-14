
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const targetUserId = '7795bbfe-2326-4a0e-ad0b-0864ac2fd11b'

    console.log('=== Updating Existing Failed Accounts with BreachRecords ===')

    // Find the user
    const user = await prisma.user.findUnique({ where: { auth_user_id: targetUserId } })

    if (!user) {
        console.error(`User not found!`)
        return
    }

    console.log(`Found user: ${user.email}`)

    // Find all failed phase accounts for this user that don't have BreachRecords
    const failedPhases = await prisma.phaseAccount.findMany({
        where: {
            status: 'failed',
            MasterAccount: {
                userId: user.id
            }
        },
        include: {
            MasterAccount: true,
            Trade: { orderBy: { exitTime: 'asc' } },
            BreachRecord: true
        }
    })

    console.log(`Found ${failedPhases.length} failed phase accounts`)

    for (const phase of failedPhases) {
        // Skip if already has a BreachRecord
        if (phase.BreachRecord.length > 0) {
            console.log(`  ${phase.MasterAccount.accountName} Phase ${phase.phaseNumber}: Already has BreachRecord, skipping`)
            continue
        }

        // Calculate breach details
        const accountSize = phase.MasterAccount.accountSize
        const trades = phase.Trade

        let runningBalance = accountSize
        let lowestBalance = accountSize

        for (const trade of trades) {
            const netPnl = (trade.pnl || 0) + (trade.commission || 0)
            runningBalance += netPnl
            if (runningBalance < lowestBalance) {
                lowestBalance = runningBalance
            }
        }

        const maxDDLimit = accountSize * (phase.maxDrawdownPercent / 100)
        const minAllowed = accountSize - maxDDLimit
        const maxDDUsed = accountSize - lowestBalance

        let breachType: 'max_drawdown' | 'daily_drawdown' = 'max_drawdown'
        let notes = ''

        if (lowestBalance < minAllowed) {
            const breachAmount = minAllowed - lowestBalance
            notes = `Historical max drawdown breach detected. Balance dipped to $${lowestBalance.toFixed(2)}, below the $${minAllowed.toFixed(2)} limit by $${breachAmount.toFixed(2)}.`
        } else {
            // Might be daily drawdown - for simplicity, just mark as max if we can't tell
            notes = `Account was marked as failed. Final balance: $${runningBalance.toFixed(2)}.`
        }

        // Create BreachRecord
        const record = await prisma.breachRecord.create({
            data: {
                id: crypto.randomUUID(),
                phaseAccountId: phase.id,
                breachType,
                breachAmount: Math.max(0, minAllowed - lowestBalance),
                currentEquity: lowestBalance,
                accountSize,
                notes
            }
        })

        console.log(`  ${phase.MasterAccount.accountName} Phase ${phase.phaseNumber}: Created BreachRecord`)
        console.log(`    Notes: ${notes}`)
    }

    console.log('\n✅ Done updating failed accounts')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
