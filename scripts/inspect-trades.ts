
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Inspecting Database Trades for Discrepancy Analysis...')

    // 1. Check Maven #1 Failure Date: Nov 18, 2025
    console.log('\n--- Checking Maven #1 (Nov 18, 2025) ---')
    // CSV Breach: Trade M7679876981902514 lost $255.08 on Nov 18
    const maven1Trades = await prisma.trade.findMany({
        where: {
            accountNumber: { contains: '756009' }, // Maven #1 ID part? Or we verify account ID.
            // Better to search by ID or strict date if possible.
            // Let's search by the CSV Trade ID directly if mapped, or mostly by date/pnl.
            // CSV ID: M7679876981902514
            entryDate: { contains: '2025-11-18' } // Entry or close? CSV has Close Time 18/11. Entry 18/11.
        }
    })

    // Also try finding by the specific Trade ID from CSV if possible
    const specificTradeMaven = await prisma.trade.findFirst({
        where: {
            OR: [
                { id: 'M7679876981902514' },
                { entryId: 'M7679876981902514' }
            ]
        }
    })

    console.log(`Found ${maven1Trades.length} trades by date 2025-11-18 for Maven #1 account #756009ish?`)
    // Actually let's just find the trades by ID to be sure we are looking at the right record
    if (specificTradeMaven) {
        console.log('Found Specific Trade M7679876981902514 in DB:')
        console.log(JSON.stringify(specificTradeMaven, null, 2))
    } else {
        console.log('❌ Trade M7679876981902514 NOT FOUND in DB by ID.')
    }


    // 2. Check Maven #2 Failure Date: July 11, 2025
    console.log('\n--- Checking Maven #2 (July 11, 2025) ---')
    // CSV Breach: Trades on July 11.
    // IDs: W68927104872004056, W68927104872003601, W68967886022004108
    const maven2ids = ['W68927104872004056', 'W68927104872003601', 'W68967886022004108']

    const maven2Trades = await prisma.trade.findMany({
        where: {
            OR: maven2ids.map(id => ({ id: id }))
        }
    })

    if (maven2Trades.length > 0) {
        console.log(`Found ${maven2Trades.length}/${maven2ids.length} trades for Maven #2:`)
        maven2Trades.forEach(t => {
            console.log(`ID: ${t.id}, PnL: ${t.pnl}, Comm: ${t.commission}, Close: ${t.closeDate}`)
        })
    } else {
        console.log('❌ No trades found for Maven #2 IDs.')
    }


    // 3. Check EE 5k Failure Date: Oct 14, 2025
    console.log('\n--- Checking EE 5k (Oct 14, 2025) ---')
    // IDs: W028578945947266, W523554966945343, W028578945957904
    const eeIds = ['W028578945947266', 'W523554966945343', 'W028578945957904']
    const eeTrades = await prisma.trade.findMany({
        where: {
            OR: eeIds.map(id => ({ id: id }))
        }
    })

    if (eeTrades.length > 0) {
        console.log(`Found ${eeTrades.length}/${eeIds.length} trades for EE 5k:`)
        eeTrades.forEach(t => {
            console.log(`ID: ${t.id}, PnL: ${t.pnl}, Comm: ${t.commission}, Close: ${t.closeDate}`)
        })
    } else {
        console.log('❌ No trades found for EE 5k IDs.')
    }

}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
