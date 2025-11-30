/**
 * User Data Backup API
 * GET /api/user/data/backup - Download complete user data backup
 * 
 * Returns a JSON file with all user data for archival purposes.
 * This is NOT for reimporting - it's a human-readable backup.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/server/auth-utils'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, get the internal user ID from auth_user_id
    const userLookup = await prisma.user.findUnique({
      where: { auth_user_id: userId },
      select: { id: true }
    })

    if (!userLookup) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const internalUserId = userLookup.id

    // Fetch all user data in parallel
    const [
      user,
      accounts,
      trades,
      groups,
      masterAccounts,
      dailyNotes,
      backtestTrades,
      tags,
      liveAccountTransactions
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: internalUserId },
        select: {
          id: true,
          email: true,
          timezone: true,
          isFirstConnection: true
        }
      }),
      prisma.account.findMany({
        where: { userId: internalUserId },
        include: {
          // Group removed - no longer used
        }
      }),
      prisma.trade.findMany({
        where: { userId: internalUserId }
      }),
      // Groups removed - no longer used
      Promise.resolve([]),
      prisma.masterAccount.findMany({
        where: { userId: internalUserId },
        include: {
          PhaseAccount: {
            include: {
              Trade: true,
              BreachRecord: true,
              Payout: true,
              DailyAnchor: true
            }
          },
          Payout: true
        }
      }),
      prisma.dailyNote.findMany({
        where: { userId: internalUserId }
      }),
      prisma.backtestTrade.findMany({
        where: { userId: internalUserId }
      }),
      prisma.tradeTag.findMany({
        where: { userId: internalUserId }
      }),
      prisma.liveAccountTransaction.findMany({
        where: { userId: internalUserId }
      })
    ])

    // Build comprehensive backup object
    const backupData = {
      metadata: {
        backupVersion: '1.0',
        exportedAt: new Date().toISOString(),
        platform: 'Deltalytix',
        userId: userId,
        userEmail: user?.email || 'unknown',
        note: 'This backup is for archival purposes only. It cannot be reimported.'
      },
      user: user ? {
        email: user.email,
        timezone: user.timezone
      } : null,
      statistics: {
        totalAccounts: accounts.length,
        totalTrades: trades.length,
        totalGroups: groups.length,
        totalPropFirmAccounts: masterAccounts.length,
        totalBacktestTrades: backtestTrades.length,
        totalTags: tags.length,
        totalPnL: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
        totalFees: trades.reduce((sum, t) => sum + (t.commission || 0), 0)
      },
      accounts: accounts.map(acc => ({
        id: acc.id,
        number: acc.number,
        name: acc.name,
        broker: acc.broker,
        startingBalance: acc.startingBalance,
        groupName: null, // Groups removed - no longer used
        createdAt: acc.createdAt,
        isArchived: acc.isArchived
      })),
      propFirmAccounts: masterAccounts.map(master => ({
        id: master.id,
        accountName: master.accountName,
        propFirmName: master.propFirmName,
        accountSize: master.accountSize,
        evaluationType: master.evaluationType,
        status: master.status,
        currentPhase: master.currentPhase,
        createdAt: master.createdAt,
        phases: master.PhaseAccount.map(phase => ({
          phaseNumber: phase.phaseNumber,
          phaseId: phase.phaseId,
          status: phase.status,
          profitTargetPercent: phase.profitTargetPercent,
          dailyDrawdownPercent: phase.dailyDrawdownPercent,
          maxDrawdownPercent: phase.maxDrawdownPercent,
          profitSplitPercent: phase.profitSplitPercent,
          tradeCount: phase.Trade.length,
          breaches: phase.BreachRecord.map(b => ({
            type: b.breachType,
            amount: b.breachAmount,
            date: b.breachTime
          })),
          payouts: phase.Payout.map(p => ({
            amount: p.amount,
            status: p.status,
            requestDate: p.requestDate,
            paidDate: p.paidDate
          }))
        }))
      })),
      trades: trades.map(t => ({
        id: t.id,
        accountNumber: t.accountNumber,
        instrument: t.instrument,
        side: t.side,
        quantity: t.quantity,
        entryDate: t.entryDate,
        closeDate: t.closeDate,
        entryPrice: t.entryPrice,
        closePrice: t.closePrice,
        pnl: t.pnl,
        commission: t.commission,
        timeInPosition: t.timeInPosition,
        comment: t.comment,
        tags: t.tags || []
      })),
      groups: [], // Groups removed - no longer used
      tags: tags.map(t => ({
        id: t.id,
        name: t.name,
        color: t.color,
        createdAt: t.createdAt
      })),
      dailyNotes: dailyNotes.map(n => ({
        date: n.date,
        note: n.note,
        emotion: n.emotion
      })),
      backtestTrades: backtestTrades.map(bt => ({
        id: bt.id,
        pair: bt.pair,
        direction: bt.direction,
        outcome: bt.outcome,
        session: bt.session,
        model: bt.model,
        pnl: bt.pnl,
        riskRewardRatio: bt.riskRewardRatio,
        dateExecuted: bt.dateExecuted,
        notes: bt.notes
      })),
      transactions: liveAccountTransactions.map(t => ({
        accountId: t.accountId,
        type: t.type,
        amount: t.amount,
        date: t.createdAt
      }))
    }

    // Generate filename
    const timestamp = format(new Date(), 'yyyy-MM-dd_HHmmss')
    const filename = `deltalytix-backup-${timestamp}.json`

    // Return as downloadable JSON file
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })

  } catch (error) {
    console.error('Backup generation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate backup' },
      { status: 500 }
    )
  }
}

