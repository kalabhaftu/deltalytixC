/**
 * Script to update existing phases with account numbers
 * This script should be run after the schema changes
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updatePhaseAccountNumbers() {
  try {
    console.log('Starting phase account number update...')

    // Get all accounts with their phases
    const accounts = await prisma.account.findMany({
      where: {
        phases: {
          some: {}
        }
      },
      include: {
        phases: true
      }
    })

    console.log(`Found ${accounts.length} accounts with phases`)

    for (const account of accounts) {
      console.log(`Processing account ${account.id} (${account.name})`)

      for (const phase of account.phases) {
        // Get the correct account number for this phase
        let accountNumber = 'Not Set'

        switch (phase.phaseType) {
          case 'phase_1':
            accountNumber = account.phase1AccountId || 'Not Set'
            break
          case 'phase_2':
            accountNumber = account.phase2AccountId || 'Not Set'
            break
          case 'funded':
            accountNumber = account.fundedAccountId || 'Not Set'
            break
        }

        // Update the phase with the account number
        await prisma.accountPhase.update({
          where: { id: phase.id },
          data: { accountNumber }
        })

        console.log(`  Updated ${phase.phaseType} phase with account number: ${accountNumber}`)
      }
    }

    console.log('Phase account number update completed successfully!')
  } catch (error) {
    console.error('Error updating phase account numbers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
updatePhaseAccountNumbers()
