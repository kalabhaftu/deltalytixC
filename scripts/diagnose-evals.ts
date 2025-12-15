
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const TARGET_USER_ID = "7795bbfe-2326-4a0e-ad0b-0864ac2fd11b"

async function main() {
    console.log(`Diagnosing accounts for user: ${TARGET_USER_ID}`)

    // 1. Find the user
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { id: TARGET_USER_ID },
                { auth_user_id: TARGET_USER_ID }
            ]
        }
    })

    if (!user) {
        console.error("User not found!")
        return
    }
    console.log(`Found user: ${user.email} (${user.id})`)
    console.log(`User Configured Timezone: ${user.timezone} (IGNORING for Eval)`)
    console.log(`Eval Timezone enforced: UTC`)

    const timezone = 'UTC' // STRICTLY UTC per user request

    // Helper to get date string in timezone
    const getDateInTimezone = (date: Date | string, tz: string): string => {
        try {
            const d = new Date(date)
            const options: Intl.DateTimeFormatOptions = {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }
            // en-CA gives YYYY-MM-DD
            return new Intl.DateTimeFormat('en-CA', options).format(d)
        } catch (e) {
            console.error(`Error formatting date ${date} in tz ${tz}:`, e)
            return new Date(date).toISOString().split('T')[0]
        }
    }

    // 2. Fetch MasterAccounts and their PhaseAccounts
    const masterAccounts = await prisma.masterAccount.findMany({
        where: {
            userId: user.id,
            // Filter for the names mentioned by the user
            accountName: {
                in: ['EE 5k #3', 'Maven 5k #2', 'Maven 5k #1', 'KSt'] // Note: User typed "KST" but image shows "KSt" or similar. Checking permissive match later if needed.
            }
        },
        include: {
            PhaseAccount: {
                include: {
                    Trade: {
                        orderBy: {
                            exitTime: 'asc' // Engine sorts by exitTime!
                        }
                    }
                }
            }
        }
    })

    console.log(`Found ${masterAccounts.length} matching MasterAccounts.`)

    for (const master of masterAccounts) {
        console.log(`\n--------------------------------------------------`)
        console.log(`Evaluating: ${master.accountName} (Size: $${master.accountSize})`)

        // Sort phases by number
        const phases = master.PhaseAccount.sort((a, b) => a.phaseNumber - b.phaseNumber)

        for (const phase of phases) {
            console.log(`  Phase ${phase.phaseNumber} [${phase.status}]`)
            // console.log(`  Rules: DailyDD=${phase.dailyDrawdownPercent}%, MaxDD=${phase.maxDrawdownPercent}% (${phase.maxDrawdownType})`)

            const startingBalance = master.accountSize
            const maxDrawdownAmount = startingBalance * (phase.maxDrawdownPercent / 100)
            const dailyDrawdownAmount = startingBalance * (phase.dailyDrawdownPercent / 100)

            console.log(`  Limits: Daily Loss < $${dailyDrawdownAmount.toFixed(2)}, Max Loss < $${maxDrawdownAmount.toFixed(2)}`)

            const trades = phase.Trade
            if (!trades.length) {
                console.log(`  No trades found.`)
                continue
            }

            console.log(`  Analyzing ${trades.length} trades...`)

            // Group trades by day (UTC)
            const tradesByDay = new Map<string, typeof trades>()
            for (const trade of trades) {
                // Engine uses exitTime or createdAt
                const exitDate = trade.exitTime || trade.createdAt
                const dateStr = getDateInTimezone(exitDate, timezone)

                if (!tradesByDay.has(dateStr)) {
                    tradesByDay.set(dateStr, [])
                }
                tradesByDay.get(dateStr)!.push(trade)
            }

            const sortedDays = Array.from(tradesByDay.keys()).sort()
            let runningBalance = startingBalance
            let highWaterMark = startingBalance // For trailing MaxDD

            let failed = false
            let worstDayPnl = 0
            let worstDayDate = ""

            for (const dayStr of sortedDays) {
                const dayTrades = tradesByDay.get(dayStr)!
                const dayStartBalance = runningBalance

                let dayPnL = 0

                for (const trade of dayTrades) {
                    // Commission is NEGATIVE in DB, so ADD it to pnl
                    const netPnl = (trade.pnl || 0) + (trade.commission || 0)
                    dayPnL += netPnl

                    const currentBalance = dayStartBalance + dayPnL

                    if (currentBalance > highWaterMark) highWaterMark = currentBalance

                    // Check MaxDD
                    let maxDrawdownLimit = 0
                    if (phase.maxDrawdownType === 'trailing') {
                        maxDrawdownLimit = highWaterMark - maxDrawdownAmount
                    } else {
                        maxDrawdownLimit = startingBalance - maxDrawdownAmount
                    }

                    if (currentBalance < maxDrawdownLimit) {
                        console.log(`    ❌ Max Breach on ${dayStr}: Balance $${currentBalance.toFixed(2)} < Limit $${maxDrawdownLimit.toFixed(2)}`)
                        failed = true
                    }
                }

                const dayEndBalance = dayStartBalance + dayPnL
                const dailyPass = dayPnL >= -dailyDrawdownAmount

                if (dayPnL < worstDayPnl) {
                    worstDayPnl = dayPnL
                    worstDayDate = dayStr
                }

                if (!dailyPass) {
                    console.log(`    ❌ Daily Breach on ${dayStr}: Loss $${Math.abs(dayPnL).toFixed(2)} > Limit $${dailyDrawdownAmount.toFixed(2)}`)
                    failed = true
                }

                runningBalance = dayEndBalance
            }

            console.log(`  Worst Day: ${worstDayDate} ($${worstDayPnl.toFixed(2)})`)
            console.log(`  Result: ${failed ? 'FAILED' : 'PASSED'}`)
            console.log(`  End Balance: $${runningBalance.toFixed(2)}`)
        }
    }
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
