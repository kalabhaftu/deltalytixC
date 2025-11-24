/**
 * Test Phase Evaluation System
 * 
 * This script tests the phase evaluation for a specific account
 * to verify that evaluation logic is working correctly
 */

import { PrismaClient } from '@prisma/client'
import { PhaseEvaluationEngine } from '../lib/prop-firm/phase-evaluation-engine'

const prisma = new PrismaClient()

async function testEvaluation() {
  console.log('🧪 Testing Phase Evaluation System\n')
  
  try {
    // Get all active master accounts
    const accounts = await prisma.masterAccount.findMany({
      where: {
        isActive: true,
        status: 'active'
      },
      include: {
        PhaseAccount: {
          where: { status: 'active' },
          include: {
            Trade: true
          }
        },
        User: {
          select: {
            email: true
          }
        }
      },
      take: 5
    })

    console.log(`Found ${accounts.length} active accounts to test\n`)

    for (const account of accounts) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`Account: ${account.accountName}`)
      console.log(`Owner: ${account.User.email}`)
      console.log(`Evaluation Type: ${account.evaluationType}`)
      console.log(`Account Size: $${account.accountSize.toLocaleString()}`)
      console.log(`Current Phase: ${account.currentPhase}`)
      console.log(`${'='.repeat(60)}\n`)

      const activePhase = account.PhaseAccount[0]
      if (!activePhase) {
        console.log('  ⚠️  No active phase found\n')
        continue
      }

      console.log(`  Phase ${activePhase.phaseNumber} Details:`)
      console.log(`    - Profit Target: ${activePhase.profitTargetPercent}%`)
      console.log(`    - Daily DD Limit: ${activePhase.dailyDrawdownPercent}%`)
      console.log(`    - Max DD Limit: ${activePhase.maxDrawdownPercent}%`)
      console.log(`    - Trades: ${activePhase.Trade.length}`)

      if (activePhase.Trade.length === 0) {
        console.log('    ⚠️  No trades to evaluate\n')
        continue
      }

      // Calculate current P&L
      const currentPnL = activePhase.Trade.reduce((sum, trade) => {
        return sum + (trade.pnl - (trade.commission || 0))
      }, 0)

      console.log(`    - Current P&L: $${currentPnL.toFixed(2)}`)
      console.log(`\n  🔍 Running evaluation...\n`)

      try {
        const evaluation = await PhaseEvaluationEngine.evaluatePhase(
          account.id,
          activePhase.id
        )

        console.log(`  📊 Evaluation Results:`)
        console.log(`    Status: ${evaluation.isFailed ? '❌ FAILED' : evaluation.isPassed ? '✅ PASSED' : '🔄 IN PROGRESS'}`)
        console.log(`    Can Advance: ${evaluation.canAdvance ? 'Yes' : 'No'}`)
        console.log(`    Next Action: ${evaluation.nextAction}`)
        
        console.log(`\n  💰 Progress:`)
        console.log(`    - Profit Target: ${evaluation.progress.profitTargetPercent.toFixed(2)}%`)
        console.log(`    - Trading Days: ${evaluation.progress.tradingDaysCompleted}/${evaluation.progress.minTradingDaysRequired}`)
        console.log(`    - Can Pass: ${evaluation.progress.canPassPhase ? 'Yes' : 'No'}`)

        console.log(`\n  📉 Drawdown:`)
        console.log(`    - Is Breached: ${evaluation.drawdown.isBreached ? 'YES ⛔' : 'No'}`)
        if (evaluation.drawdown.breachType) {
          console.log(`    - Breach Type: ${evaluation.drawdown.breachType}`)
          console.log(`    - Breach Amount: $${evaluation.drawdown.breachAmount?.toFixed(2)}`)
        }
        console.log(`    - Daily DD Used: ${evaluation.drawdown.dailyDrawdownPercent.toFixed(2)}%`)
        console.log(`    - Max DD Used: ${evaluation.drawdown.maxDrawdownPercent.toFixed(2)}%`)

        // Warnings
        if (evaluation.drawdown.dailyDrawdownPercent > 80) {
          console.log(`\n  ⚠️  WARNING: Daily drawdown is at ${evaluation.drawdown.dailyDrawdownPercent.toFixed(0)}%!`)
        }
        if (evaluation.drawdown.maxDrawdownPercent > 80) {
          console.log(`\n  ⚠️  WARNING: Max drawdown is at ${evaluation.drawdown.maxDrawdownPercent.toFixed(0)}%!`)
        }

        // Success indicators
        if (evaluation.isPassed && evaluation.canAdvance) {
          console.log(`\n  🎉 Account has passed and can advance to next phase!`)
        }

      } catch (evalError) {
        console.error(`  ❌ Evaluation error:`, evalError)
      }

      console.log()
    }

    console.log('\n✅ Evaluation test complete!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEvaluation()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })

