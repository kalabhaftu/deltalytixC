
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const targetUserId = '7795bbfe-2326-4a0e-ad0b-0864ac2fd11b'

    console.log('=== Marking Account as Failed ===')

    // Find the user
    const user = await prisma.user.findUnique({ where: { auth_user_id: targetUserId } })

    if (!user) {
        console.error(`User not found!`)
        return
    }

    console.log(`Found user: ${user.email}`)

    // Find the KSt account
    const master = await prisma.masterAccount.findFirst({
        where: {
            userId: user.id,
            accountName: 'KSt'
        },
        include: {
            PhaseAccount: {
                where: { phaseNumber: 1 }
            }
        }
    })

    if (!master || master.PhaseAccount.length === 0) {
        console.error('Account KSt Phase 1 not found!')
        return
    }

    const phaseAccount = master.PhaseAccount[0]

    console.log(`PhaseAccount ID: ${phaseAccount.id}`)
    console.log(`Current Status: ${phaseAccount.status}`)

    // Update the PhaseAccount status to 'failed'
    const updated = await prisma.phaseAccount.update({
        where: { id: phaseAccount.id },
        data: {
            status: 'failed',
            endDate: new Date()
        }
    })

    console.log(`\n✅ PhaseAccount status updated to: ${updated.status}`)

    // Also update the MasterAccount status to 'failed'
    const updatedMaster = await prisma.masterAccount.update({
        where: { id: master.id },
        data: { status: 'failed' }
    })

    console.log(`✅ MasterAccount status updated to: ${updatedMaster.status}`)

    // Create a BreachRecord for audit trail
    const breachRecord = await prisma.breachRecord.create({
        data: {
            id: crypto.randomUUID(),
            phaseAccountId: phaseAccount.id,
            breachType: 'max_drawdown',
            breachAmount: 0.96,
            currentEquity: 4599.04,
            accountSize: 5000,
            notes: 'Historical max drawdown breach detected. Balance dipped to $4,599.04, below the $4,600 limit.'
        }
    })

    console.log(`✅ BreachRecord created: ${breachRecord.id}`)
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
