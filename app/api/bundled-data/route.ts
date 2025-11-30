import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId, getUserIdSafe } from '@/server/auth'
import { CacheHeaders } from '@/lib/api-cache-headers'
import { convertDecimal } from '@/lib/utils/decimal'

/**
 * Bundled Data API - Single endpoint to load all initial data
 * Reduces multiple round trips to a single request
 * 
 * Returns: user, accounts, tags, trades (filtered), calendar notes
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Single auth check for all data
    const userId = await getUserIdSafe()
    
    if (!userId) {
      return NextResponse.json({
        success: true,
        data: {
          user: null,
          accounts: [],
          tags: [],
          trades: [],
          calendarNotes: {},
          isAuthenticated: false
        }
      }, { headers: CacheHeaders.noCache })
    }

    // Get account filter from query params
    const searchParams = request.nextUrl.searchParams
    const selectedAccountsParam = searchParams.get('selectedAccounts')
    const selectedAccounts = selectedAccountsParam ? selectedAccountsParam.split(',').filter(Boolean) : []
    const tradesLimit = parseInt(searchParams.get('tradesLimit') || '5000')
    const forAccountsPage = searchParams.get('forAccountsPage') === 'true'
    const forAccountFilter = searchParams.get('forAccountFilter') === 'true'
    // _t parameter is for cache-busting, ignore it

    // CRITICAL: First look up the internal user ID from auth_user_id
    // getUserIdSafe() returns Supabase auth_user_id, but all data tables use internal user.id
    const userLookup = await prisma.user.findUnique({
      where: { auth_user_id: userId },
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
        backtestInputMode: true
      }
    })

    if (!userLookup) {
      return NextResponse.json({
        success: true,
        data: {
          user: null,
          accounts: [],
          tags: [],
          trades: [],
          calendarNotes: {},
          isAuthenticated: false
        }
      }, { headers: CacheHeaders.noCache })
    }

    // Use internal user.id for all subsequent queries
    const internalUserId = userLookup.id

    // CRITICAL: Fetch ALL data in parallel - single database round trip
    const [
      accounts,
      tags,
      trades,
      calendarNotes,
      propFirmAccounts
    ] = await Promise.all([
      // 1. Regular accounts with trade counts
      prisma.account.findMany({
        where: { userId: internalUserId },
        include: {
          _count: {
            select: { Trade: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),

      // 2. Tags
      prisma.tradeTag.findMany({
        where: { userId: internalUserId },
        orderBy: { name: 'asc' }
      }),

      // 3. Trades - fetch conditionally based on forAccountsPage flag
      // If forAccountsPage is true, we'll fetch trades after processing accounts
      // Otherwise, use selectedAccounts filter for dashboard/widgets
      (async () => {
        // If forAccountsPage, return empty array - we'll fetch trades after processing accounts
        if (forAccountsPage) {
          return []
        }
        
        const whereClause: any = { userId: internalUserId }
        if (selectedAccounts.length > 0) {
          whereClause.accountNumber = { in: selectedAccounts }
        }
        
        const rawTrades = await prisma.trade.findMany({
          where: whereClause,
          orderBy: { entryDate: 'desc' },
          take: tradesLimit
        })
        
        // Convert decimals
        return rawTrades.map(trade => ({
          ...trade,
          entryPrice: convertDecimal(trade.entryPrice),
          closePrice: convertDecimal(trade.closePrice),
          stopLoss: convertDecimal(trade.stopLoss),
          takeProfit: convertDecimal(trade.takeProfit),
        }))
      })(),

      // 5. Calendar notes (last 2 years)
      (async () => {
        const twoYearsAgo = new Date()
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
        
        const notes = await prisma.dailyNote.findMany({
          where: {
            userId: internalUserId,
            date: { gte: twoYearsAgo }
          },
          select: { date: true, note: true }
        })
        
        return notes.reduce((acc, note) => {
          const dateKey = typeof note.date === 'string' 
            ? note.date 
            : note.date.toISOString().split('T')[0]
          acc[dateKey] = note.note
          return acc
        }, {} as Record<string, string>)
      })(),

      // 6. Prop firm accounts with phase data
      prisma.masterAccount.findMany({
        where: { userId: internalUserId },
        include: {
          PhaseAccount: {
            orderBy: { phaseNumber: 'asc' }
          }
        }
      })
    ])

    // Helper function to determine if a phase is the funded phase
    const isFundedPhase = (evaluationType: string, phaseNumber: number): boolean => {
      switch (evaluationType) {
        case 'Two Step': return phaseNumber >= 3
        case 'One Step': return phaseNumber >= 2
        case 'Instant': return phaseNumber >= 1
        default: return phaseNumber >= 3
      }
    }
    
    // Get phase display name - stage only (Phase 1, Phase 2, Funded) - no status
    const getPhaseDisplayName = (evaluationType: string, phaseNumber: number): string => {
      if (isFundedPhase(evaluationType, phaseNumber)) return 'Funded'
      return `Phase ${phaseNumber}`
    }

    // Get trade counts for all account numbers (for both live and prop firm)
    const tradeCounts = await prisma.trade.groupBy({
      by: ['accountNumber'],
      where: { userId: internalUserId },
      _count: { id: true }
    })
    const tradeCountMap = new Map(tradeCounts.map(tc => [tc.accountNumber, tc._count.id]))

    // Process regular (live) accounts
    const processedLiveAccounts = accounts.map(acc => ({
      ...acc,
      propfirm: '',
      tradeCount: tradeCountMap.get(acc.number) || 0,
      accountType: 'live' as const,
      displayName: acc.name || acc.number,
      status: 'active' as const,
      currentPhase: null,
      currentPhaseDetails: null,
      isArchived: acc.isArchived || false
    }))

    // Process prop firm accounts - create one entry per ACTIVE phase (not pending or pending_approval)
    const processedPropFirmAccounts: any[] = []
    propFirmAccounts.forEach((masterAccount: any) => {
      if (masterAccount.PhaseAccount && masterAccount.PhaseAccount.length > 0) {
        masterAccount.PhaseAccount.forEach((phase: any) => {
          // Skip pending and pending_approval phases - they haven't been activated or are waiting for firm approval
          if (phase.status === 'pending' || phase.status === 'pending_approval') return
          // Skip phases without phaseId - they haven't been activated
          if (!phase.phaseId || phase.phaseId.trim() === '') return
          
          const phaseName = getPhaseDisplayName(masterAccount.evaluationType, phase.phaseNumber)
          
          // Always use individual phase trade count
          // Aggregation for failed phases will be calculated on the client side (accounts page)
          const phaseTradeCount = tradeCountMap.get(phase.phaseId) || 0
          
          processedPropFirmAccounts.push({
            id: phase.id,
            number: phase.phaseId, // This is the account number used in trades
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
              evaluationType: masterAccount.evaluationType
            }
          })
        })
      }
    })

    // Combine both account types
    const processedAccounts = [...processedLiveAccounts, ...processedPropFirmAccounts]

    // If forAccountsPage is true, fetch trades for all visible accounts
    let finalTrades = trades
    if (forAccountsPage && processedAccounts.length > 0) {
      // Extract account numbers and phase IDs from processed accounts
      const accountNumbers = processedAccounts
        .map(acc => acc.number)
        .filter((num): num is string => Boolean(num) && num.trim() !== '')
      
      const phaseIds = processedAccounts
        .filter(acc => acc.accountType === 'prop-firm')
        .map(acc => acc.id)
        .filter((id): id is string => Boolean(id) && id.trim() !== '')
      
      // Build OR condition for trades query
      const orConditions: any[] = []
      if (accountNumbers.length > 0) {
        orConditions.push({ accountNumber: { in: accountNumbers } })
      }
      if (phaseIds.length > 0) {
        orConditions.push({ phaseAccountId: { in: phaseIds } })
      }
      
      // Fetch trades matching any of the account numbers or phase IDs
      if (orConditions.length > 0) {
        const whereClause: any = {
          userId: internalUserId,
          OR: orConditions
        }
        
        const rawTrades = await prisma.trade.findMany({
          where: whereClause,
          orderBy: { entryDate: 'desc' },
          take: tradesLimit
        })
        
        // Convert decimals
        finalTrades = rawTrades.map(trade => ({
          ...trade,
          entryPrice: convertDecimal(trade.entryPrice),
          closePrice: convertDecimal(trade.closePrice),
          stopLoss: convertDecimal(trade.stopLoss),
          takeProfit: convertDecimal(trade.takeProfit),
        }))
      }
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        user: userLookup,
        accounts: processedAccounts, // Includes both live and flattened prop firm accounts
        tags,
        trades: finalTrades,
        calendarNotes,
        isAuthenticated: true,
        loadTime: duration
      }
    }, {
      headers: CacheHeaders.short
    })

  } catch (error) {
    console.error('Bundled data fetch error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch data'
    }, { status: 500 })
  }
}

