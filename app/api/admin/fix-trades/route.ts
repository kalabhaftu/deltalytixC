/**
 * Fix Trades API - Links unlinked trades to prop firm accounts
 * POST /api/admin/fix-trades - Link unlinked trades to their respective prop firm accounts
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserId } from '@/server/auth-utils'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Starting trade linking process for user:', userId)

    // Get all master accounts for this user
    const masterAccounts = await prisma.masterAccount.findMany({
      where: { userId },
      include: {
        phases: {
          where: { status: 'active' },
          orderBy: { phaseNumber: 'asc' }
        }
      }
    })

    console.log(`📋 Found ${masterAccounts.length} master accounts for user`)

    let totalLinkedTrades = 0
    const results = []

    for (const masterAccount of masterAccounts) {
      const currentPhase = masterAccount.phases[0]

      if (!currentPhase) {
        console.log(`⚠️ No active phase found for account: ${masterAccount.accountName}`)
        continue
      }

      console.log(`🔍 Processing account: ${masterAccount.accountName} (Phase: ${currentPhase.phaseNumber})`)

      // Find unlinked trades that should belong to this account
      const unlinkedTrades = await prisma.trade.findMany({
        where: {
          userId,
          accountNumber: currentPhase.phaseId || masterAccount.accountName,
          phaseAccountId: null
        },
        orderBy: { entryDate: 'asc' }
      })

      console.log(`📊 Found ${unlinkedTrades.length} unlinked trades for account`)

      if (unlinkedTrades.length === 0) {
        results.push({
          accountName: masterAccount.accountName,
          linkedCount: 0,
          message: 'No trades to link'
        })
        continue
      }

      // Link trades to current phase
      let linkedCount = 0
      for (const trade of unlinkedTrades) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: {
            phaseAccountId: currentPhase.id,
            symbol: trade.instrument,
            realizedPnl: trade.pnl,
            fees: trade.commission || 0,
            entryTime: trade.entryDate ? new Date(trade.entryDate) : null,
            exitTime: trade.closeDate ? new Date(trade.closeDate) : null
          }
        })
        linkedCount++
      }

      totalLinkedTrades += linkedCount

      results.push({
        accountName: masterAccount.accountName,
        linkedCount,
        message: `Linked ${linkedCount} trades to Phase ${currentPhase.phaseNumber}`
      })

      console.log(`✅ Linked ${linkedCount} trades to ${masterAccount.accountName}`)

      // Calculate and check account status
      const totalPnL = unlinkedTrades.reduce((sum, trade) => sum + trade.pnl, 0)
      const currentEquity = masterAccount.accountSize + totalPnL
      const currentProfit = currentEquity - masterAccount.accountSize

      const profitTargetAmount = (currentPhase.profitTargetPercent / 100) * masterAccount.accountSize
      const maxDDLimit = (currentPhase.maxDrawdownPercent / 100) * masterAccount.accountSize
      const currentDrawdown = masterAccount.accountSize - currentEquity

      if (currentDrawdown > maxDDLimit) {
        console.log(`🚨 MAX DRAWDOWN BREACH for ${masterAccount.accountName}!`)

        // Mark account and phase as failed
        await prisma.masterAccount.update({
          where: { id: masterAccount.id },
          data: { isActive: false }
        })

        await prisma.phaseAccount.update({
          where: { id: currentPhase.id },
          data: {
            status: 'failed',
            endDate: new Date()
          }
        })

        results.push({
          accountName: masterAccount.accountName,
          status: 'FAILED',
          message: `Account failed due to max drawdown breach: $${currentDrawdown.toFixed(2)} > $${maxDDLimit.toFixed(2)}`
        })
      } else if (currentProfit >= profitTargetAmount && profitTargetAmount > 0) {
        console.log(`🎯 PROFIT TARGET MET for ${masterAccount.accountName}!`)

        results.push({
          accountName: masterAccount.accountName,
          status: 'TARGET_MET',
          message: `Profit target reached: $${currentProfit.toFixed(2)} >= $${profitTargetAmount.toFixed(2)}`
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${masterAccounts.length} accounts and linked ${totalLinkedTrades} trades`,
      data: {
        totalAccounts: masterAccounts.length,
        totalLinkedTrades,
        results
      }
    })

  } catch (error) {
    console.error('Error fixing trades:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fix trades',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

