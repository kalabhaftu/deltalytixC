
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const targetPhaseIdMaybe = '795964'
    const targetUserId = '7795bbfe-2326-4a0e-ad0b-0864ac2fd11b'

    console.log(`Investigation Started. Target User UID: ${targetUserId}`)
    console.log(`Target Phase Identifier (Partial/ID): ${targetPhaseIdMaybe}`)

    // Step 1: Find the User first to ensure connection
    const user = await prisma.user.findUnique({ where: { auth_user_id: targetUserId } })

    if (!user) {
        console.error(`User with auth_user_id ${targetUserId} not found!`)
        // Fallback: try to find by ID if it was passed as ID
        const userById = await prisma.user.findUnique({ where: { id: targetUserId } })
        if (!userById) {
            console.error("User lookup failed completely.")
            return
        }
        console.log(`Found user via internal ID: ${userById.email}`)
    } else {
        console.log(`Found user: ${user.email} (ID: ${user.id})`)
    }

    const userIdToUse = user ? user.id : targetUserId

    // Step 2: Find the account
    // Accounts logic: MasterAccount -> PhaseAccount
    // We need to find the PhaseAccount that has '795964' in it, potentially as phaseId or part of ID?
    // Or maybe it's the `accountNumber` in Trade?
    // Let's broaden search.

    let phaseAccount = await prisma.phaseAccount.findFirst({
        where: {
            OR: [
                { id: targetPhaseIdMaybe },
                { phaseId: targetPhaseIdMaybe },
                // Check if it's a number?
            ],
            MasterAccount: {
                userId: userIdToUse
            }
        },
        include: {
            MasterAccount: true,
            Trade: { orderBy: { exitTime: 'asc' } }
        }
    })

    if (!phaseAccount) {
        console.log("Direct PhaseAccount lookup failed. Listing all accounts for user to find match...")
        const allPhases = await prisma.phaseAccount.findMany({
            where: {
                MasterAccount: { userId: userIdToUse }
            },
            include: { MasterAccount: true }
        })

        console.log(`User has ${allPhases.length} phase accounts.`)

        // Try to find one that matches the balance 4599.23 mentioned by user?
        // Or matches the name 'KSt'

        const match = allPhases.find(p => p.MasterAccount.accountName === 'KSt')
        if (match) {
            console.log(`Found account by name "KSt": ID ${match.id}`)
            phaseAccount = await prisma.phaseAccount.findUnique({
                where: { id: match.id },
                include: {
                    MasterAccount: true,
                    Trade: { orderBy: { exitTime: 'asc' } }
                }
            })
        }
    }

    if (!phaseAccount) {
        console.error('Could not locate the specific PhaseAccount.')
        return
    }

    // Double check if account size is 5000 as expected
    console.log('\n--- Account Details ---')
    console.log(`PhaseAccount ID: ${phaseAccount.id}`)
    console.log(`Master Name: ${phaseAccount.MasterAccount.accountName}`)
    console.log(`Account Size: ${phaseAccount.MasterAccount.accountSize}`)
    console.log(`Status: ${phaseAccount.status}`)
    console.log(`Drawdown Limits: Daily ${phaseAccount.dailyDrawdownPercent}%, Max ${phaseAccount.maxDrawdownPercent}%`)

    // Step 3: Replay Trades
    console.log('\n--- Trade Replay (DB Data) ---')

    // NOTE: Schema does NOT have 'swap' on Trade model based on check.
    // Using: pnl and commission.

    let currentBalance = phaseAccount.MasterAccount.accountSize
    let minBalance = currentBalance

    const trades = phaseAccount.Trade

    console.log(`Total Trades Found: ${trades.length}`)

    // Dump trades for comparison if needed
    // console.log("Trades:", JSON.stringify(trades.map(t => ({id: t.id, pnl: t.pnl, comm: t.commission, exit: t.exitTime})), null, 2))

    for (const trade of trades) {
        // Net PnL = pnl + commission. 
        // Verify if commission is negative or positive in DB. 
        // Usually stored negative (-0.4). So we ADD it.
        const netPnl = (trade.pnl || 0) + (trade.commission || 0)

        const prevBal = currentBalance
        currentBalance += netPnl

        if (currentBalance < minBalance) {
            minBalance = currentBalance
        }

        const dateStr = trade.exitTime ? new Date(trade.exitTime).toISOString().split('T')[0] : 'OPEN'

        // Log significant drops or final state
        // console.log(`[${dateStr}] ${trade.instrument} Net: ${netPnl.toFixed(2)} => Bal: ${currentBalance.toFixed(2)}`)
    }

    console.log('\n--- Final Analysis ---')
    console.log(`Starting Balance: ${phaseAccount.MasterAccount.accountSize}`)
    console.log(`Final Calculated Balance: ${currentBalance.toFixed(2)}`)
    console.log(`Lowest Balance Reached: ${minBalance.toFixed(2)}`)

    const maxDDLimit = phaseAccount.MasterAccount.accountSize * (phaseAccount.maxDrawdownPercent / 100)
    const allowedMinBalance = phaseAccount.MasterAccount.accountSize - maxDDLimit
    const maxDDUsed = phaseAccount.MasterAccount.accountSize - minBalance

    console.log(`\nMax Drawdown Limit: ${maxDDLimit.toFixed(2)} (Min Bal: ${allowedMinBalance.toFixed(2)})`)
    console.log(`Max Drawdown Used: ${maxDDUsed.toFixed(2)}`)

    if (minBalance < allowedMinBalance) {
        console.log(`!!! VIOLATION DETECTED !!!`)
        console.log(`Account dipped to ${minBalance.toFixed(2)}, which is below ${allowedMinBalance.toFixed(2)}`)
        console.log(`Overshot by: ${(allowedMinBalance - minBalance).toFixed(2)}`)
    } else {
        console.log(`Status: OK (Margin: ${(minBalance - allowedMinBalance).toFixed(2)})`)
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
