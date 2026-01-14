
import { PrismaClient } from '@prisma/client'
import { PhaseEvaluationEngine } from '../lib/prop-firm/phase-evaluation-engine'

const prisma = new PrismaClient()

async function main() {
    const targetUserId = '7795bbfe-2326-4a0e-ad0b-0864ac2fd11b'

    console.log('=== Phase Evaluation Engine Verification ===')
    console.log(`Target User UID: ${targetUserId}`)

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

    const phaseAccountId = master.PhaseAccount[0].id

    console.log(`MasterAccount ID: ${master.id}`)
    console.log(`PhaseAccount ID: ${phaseAccountId}`)
    console.log('\n--- Running PhaseEvaluationEngine.evaluatePhase() ---\n')

    try {
        const result = await PhaseEvaluationEngine.evaluatePhase(master.id, phaseAccountId)

        console.log('\n=== EVALUATION RESULT ===')
        console.log(`isFailed: ${result.isFailed}`)
        console.log(`isPassed: ${result.isPassed}`)
        console.log(`nextAction: ${result.nextAction}`)
        console.log(`\nDrawdown Details:`)
        console.log(`  isBreached: ${result.drawdown.isBreached}`)
        console.log(`  breachType: ${result.drawdown.breachType || 'N/A'}`)
        console.log(`  breachAmount: ${result.drawdown.breachAmount?.toFixed(2) || 'N/A'}`)
        console.log(`  currentEquity: ${result.drawdown.currentEquity.toFixed(2)}`)
        console.log(`  maxDrawdownUsed: ${result.drawdown.maxDrawdownUsed.toFixed(2)}`)
        console.log(`  maxDrawdownLimit: ${result.drawdown.maxDrawdownLimit.toFixed(2)}`)

        if (result.isFailed && result.drawdown.breachType === 'max_drawdown') {
            console.log('\n✅ SUCCESS: The engine now correctly detects the historical max drawdown breach!')
        } else if (result.isFailed) {
            console.log('\n⚠️ Account failed, but for a different reason.')
        } else {
            console.log('\n❌ FIX NOT WORKING: Engine did not detect the breach.')
        }

    } catch (error) {
        console.error('Evaluation failed:', error)
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
