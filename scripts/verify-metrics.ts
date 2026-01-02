
import { PrismaClient } from '@prisma/client'
import { startOfWeek, format, parseISO, isValid } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const prisma = new PrismaClient()

const TARGET_USER_ID = '7795bbfe-2326-4a0e-ad0b-0864ac2fd11b'
const NY_TIMEZONE = 'America/New_York'

async function verifyMetrics() {
    console.log(`\n🔍 Verifying Metrics for User ID: ${TARGET_USER_ID}`)

    // 1. Fetch User and Trades
    const user = await prisma.user.findUnique({
        where: { auth_user_id: TARGET_USER_ID },
        include: { Account: true }
    })

    if (!user) {
        console.error('❌ User not found!')
        return
    }

    console.log(`✅ User Found: ${user.email} (DB ID: ${user.id})`)

    const trades = await prisma.trade.findMany({
        where: { userId: user.id }, // Use internal ID
        orderBy: { entryDate: 'asc' }
    })

    console.log(`✅ Total Trades Fetched: ${trades.length}`)

    // 2. Metrics Calculation
    let totalTrades = 0
    let wins = 0
    let losses = 0
    let breakeven = 0
    let totalNetPnL = 0
    let totalGrossWin = 0
    let totalGrossLoss = 0

    let maxWinStreak = 0
    let maxLoseStreak = 0
    let currentStreak = 0
    let lastWasWin: boolean | null = null

    let peakEquity = 0
    let maxDrawdown = 0
    let cumulativePnL = 0

    let tradesByYearWeek: Record<string, number> = {}

    for (const trade of trades) {
        // Ensure PnL and Commission are treated as numbers
        const pnl = trade.pnl || 0
        const commission = trade.commission || 0
        const netPnL = pnl + commission // Assuming commission is negative, if it's positive expense, subtract it. Convention varies.
        // In ReportsPage: `((t.pnl || 0) + (t.commission || 0))` implies commission is negative when it's a cost.

        // Filter valid trades (e.g. non-zero quantity or closed status? App seems to filter just by existence)
        totalTrades++
        totalNetPnL += netPnL

        // Win/Loss
        if (netPnL > 0) {
            wins++
            totalGrossWin += netPnL

            if (lastWasWin === true) currentStreak++
            else {
                if (lastWasWin === false) maxLoseStreak = Math.max(maxLoseStreak, currentStreak)
                currentStreak = 1
                lastWasWin = true
            }
        } else if (netPnL < 0) {
            losses++
            totalGrossLoss += Math.abs(netPnL)

            if (lastWasWin === false) currentStreak++
            else {
                if (lastWasWin === true) maxWinStreak = Math.max(maxWinStreak, currentStreak)
                currentStreak = 1
                lastWasWin = false
            }
        } else {
            breakeven++
        }

        // Drawdown
        cumulativePnL += netPnL
        if (cumulativePnL > peakEquity) peakEquity = cumulativePnL
        const dd = peakEquity - cumulativePnL
        if (dd > maxDrawdown) maxDrawdown = dd

        // Calendar Year Check
        if (trade.entryDate) {
            // App uses parseISO(trade.entryDate)
            // We need to check what "Week" and "Year" this falls into
            // The bug report: "shows them as 2024 not 2025"

            // Simulating the Weekly View Logic
            // Usually weekly view groups by `startOfWeek`
            try {
                const date = parseISO(trade.entryDate)
                if (isValid(date)) {
                    // Formatting using Date Fns defaults (Local time if not specified, system dependent)
                    // If running on server, might be UTC.
                    // Let's force NY Timezone check

                    const nyDateStr = formatInTimeZone(date, NY_TIMEZONE, 'yyyy-MM-dd')
                    const nyYear = formatInTimeZone(date, NY_TIMEZONE, 'yyyy')

                    // Group key
                    const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday start?
                    const weekKey = format(weekStart, 'yyyy-MM-dd')
                    const weekYear = format(weekStart, 'yyyy')

                    if (nyYear === '2025') {
                        const key = `Trade: ${trade.symbol} (${trade.entryDate}) -> WeekStart: ${weekKey} (Year: ${weekYear})`
                        // console.log(key)
                    }
                }
            } catch (e) { }
        }
    }

    // Final streak update
    if (lastWasWin === true) maxWinStreak = Math.max(maxWinStreak, currentStreak)
    else if (lastWasWin === false) maxLoseStreak = Math.max(maxLoseStreak, currentStreak)

    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
    const avgWin = wins > 0 ? totalGrossWin / wins : 0
    const avgLoss = losses > 0 ? totalGrossLoss / losses : 0
    const profitFactor = totalGrossLoss > 0 ? totalGrossWin / totalGrossLoss : 99
    const expectancy = (winRate / 100 * avgWin) - ((losses / totalTrades) * avgLoss)

    console.log(`\n📊 Calculated Metrics (Unfiltered):`)
    console.log(`-----------------------------------`)
    console.log(`Total Trades:   ${totalTrades}`)
    console.log(`Total Net PnL:  $${totalNetPnL.toFixed(2)}`)
    console.log(`Win Rate:       ${winRate.toFixed(1)}%`)
    console.log(`Wins:           ${wins}`)
    console.log(`Losses:         ${losses}`)
    console.log(`Breakeven:      ${breakeven}`)
    console.log(`Avg Win:        $${avgWin.toFixed(2)}`)
    console.log(`Avg Loss:       $${avgLoss.toFixed(2)}`)
    console.log(`Profit Factor:  ${profitFactor.toFixed(2)}`)
    console.log(`Expectancy:     $${expectancy.toFixed(2)}`)
    console.log(`Max Drawdown:   $${maxDrawdown.toFixed(2)}`)
    console.log(`Peak Equity:    $${peakEquity.toFixed(2)}`)
    console.log(`Max Win Strk:   ${maxWinStreak}`)
    console.log(`Max Lose Strk:  ${maxLoseStreak}`)
    console.log(`-----------------------------------`)

    // Year check specific
    console.log(`\n🗓️ Calendar Year Check (2025 Trades):`)
    const trades2025 = trades.filter(t => t.entryDate.startsWith('2025'))
    console.log(`Count of trades with string '2025' in entryDate: ${trades2025.length}`)

    if (trades2025.length > 0) {
        console.log(`Sample 2025 trade: ${trades2025[0].entryDate}`)
        const d = parseISO(trades2025[0].entryDate)
        const weekStart = startOfWeek(d, { weekStartsOn: 1 })
        console.log(`Date-fns startOfWeek (Mon): ${format(weekStart, 'yyyy-MM-dd')}`)

        // Check if startOfWeek pulls it back to 2024
        // e.g. Jan 1 2025 might be in a week starting Dec 30 2024
        if (format(weekStart, 'yyyy') === '2024') {
            console.log(`⚠️ CRITICAL: Trades in early 2025 are being grouped into a 2024 week!`)
            console.log(`Week Start: ${format(weekStart, 'yyyy-MM-dd')}`)
        }
    }
}

verifyMetrics()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
