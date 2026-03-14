/**
 * Initial App Load API (v1)
 * 
 * GET /api/v1/init
 * 
 * Lightweight initial load endpoint replacing /api/bundled-data.
 * Returns only what's needed at app startup: user profile, accounts, calendar notes.
 * Trades are fetched separately via /api/v1/trades with proper filtering.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserIdSafe } from '@/server/auth'
import { convertDecimal } from '@/lib/utils/decimal'

export async function GET(request: NextRequest) {
  try {
    const authUserId = await getUserIdSafe()
    
    if (!authUserId) {
      return NextResponse.json({
        isAuthenticated: false,
        user: null,
        accounts: [],
        calendarNotes: {},
      })
    }
    
    // Map auth user ID to internal user ID
    const userLookup = await prisma.user.findUnique({
      where: { auth_user_id: authUserId },
      select: {
        id: true,
        email: true,
        auth_user_id: true,
        isFirstConnection: true,
        thorToken: true,
        timezone: true,
        theme: true,
        firstName: true,
        lastName: true,
        accountFilterSettings: true,
        backtestInputMode: true,
      }
    })
    
    if (!userLookup) {
      return NextResponse.json({
        isAuthenticated: false,
        user: null,
        accounts: [],
        calendarNotes: {},
      })
    }
    
    const internalUserId = userLookup.id
    
    // Fetch accounts + calendar notes + prop firm accounts in parallel
    const [accounts, calendarNotes, propFirmAccounts, tradeCounts] = await Promise.all([
      prisma.account.findMany({
        where: { userId: internalUserId },
        include: { _count: { select: { Trade: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      
      (async () => {
        const twoYearsAgo = new Date()
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
        const notes = await prisma.dailyNote.findMany({
          where: { userId: internalUserId, date: { gte: twoYearsAgo } },
          select: { date: true, note: true }
        })
        return notes.reduce<Record<string, string>>((acc, note) => {
          const dateKey = typeof note.date === 'string'
            ? note.date
            : note.date.toISOString().split('T')[0]
          acc[dateKey] = note.note
          return acc
        }, {})
      })(),
      
      prisma.masterAccount.findMany({
        where: { userId: internalUserId },
        include: { PhaseAccount: { orderBy: { phaseNumber: 'asc' } } }
      }),
      
      prisma.trade.groupBy({
        by: ['accountNumber'],
        where: { userId: internalUserId },
        _count: { id: true }
      })
    ])
    
    const tradeCountMap = new Map(
      tradeCounts.map((tc: { accountNumber: string | null; _count: { id: number } }) => [
        tc.accountNumber,
        tc._count.id,
      ])
    )
    
    // Helper functions
    const isFundedPhase = (evaluationType: string, phaseNumber: number): boolean => {
      switch (evaluationType) {
        case 'Two Step': return phaseNumber >= 3
        case 'One Step': return phaseNumber >= 2
        case 'Instant': return phaseNumber >= 1
        default: return phaseNumber >= 3
      }
    }
    
    const getPhaseDisplayName = (evaluationType: string, phaseNumber: number): string => {
      if (isFundedPhase(evaluationType, phaseNumber)) return 'Funded'
      return `Phase ${phaseNumber}`
    }
    
    // Process live accounts
    const processedLiveAccounts = accounts.map((acc: typeof accounts[number]) => ({
      ...acc,
      propfirm: '',
      tradeCount: tradeCountMap.get(acc.number) || 0,
      accountType: 'live' as const,
      displayName: acc.name || acc.number,
      status: 'active' as const,
      currentPhase: null,
      currentPhaseDetails: null,
      isArchived: acc.isArchived || false,
    }))
    
    // Process prop firm accounts
    const processedPropFirmAccounts: any[] = []
    propFirmAccounts.forEach((masterAccount: any) => {
      if (masterAccount.PhaseAccount?.length > 0) {
        masterAccount.PhaseAccount.forEach((phase: any) => {
          if (phase.status === 'pending' || phase.status === 'pending_approval') return
          if (!phase.phaseId || phase.phaseId.trim() === '') return
          
          const phaseName = getPhaseDisplayName(masterAccount.evaluationType, phase.phaseNumber)
          const phaseTradeCount = tradeCountMap.get(phase.phaseId) || 0
          
          processedPropFirmAccounts.push({
            id: phase.id,
            number: phase.phaseId,
            name: masterAccount.accountName,
            propfirm: masterAccount.propFirmName,
            broker: undefined,
            startingBalance: phase.accountSize || masterAccount.accountSize,
            accountType: 'prop-firm' as const,
            displayName: `${masterAccount.accountName} (${phaseName})`,
            tradeCount: phaseTradeCount,
            status: phase.status,
            currentPhase: phase.phaseNumber,
            createdAt: phase.createdAt || masterAccount.createdAt,
            userId: masterAccount.userId,
            isArchived: masterAccount.isArchived || false,
            currentPhaseDetails: {
              phaseNumber: phase.phaseNumber,
              status: phase.status,
              phaseId: phase.phaseId,
              masterAccountId: masterAccount.id,
              masterAccountName: masterAccount.accountName,
              evaluationType: masterAccount.evaluationType,
            }
          })
        })
      }
    })
    
    const processedAccounts = [...processedLiveAccounts, ...processedPropFirmAccounts]
    
    const response = NextResponse.json({
      isAuthenticated: true,
      user: userLookup,
      accounts: processedAccounts,
      calendarNotes,
    })
    
    // Cache: private (user-specific), revalidate every 60s
    response.headers.set('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=120')
    return response
    
  } catch (error: any) {
    if (error.message?.includes('not authenticated') || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[API] /api/v1/init error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
