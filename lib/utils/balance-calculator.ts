/**
 * Unified Account Balance Calculation
 * Single source of truth for all account balance calculations
 * 
 * CRITICAL: This is the ONLY place where balance calculations should be implemented.
 * All UI components MUST use these functions to ensure consistency.
 * 
 * Last updated: 2025-01-07
 * Issue fixed: Inconsistent balance calculations across components
 */

import { Trade, Account } from '@prisma/client'

export interface BalanceCalculationOptions {
  excludeFailedAccounts?: boolean
  includePayouts?: boolean
}

/**
 * Comprehensive balance result with all financial metrics
 */
export interface BalanceResult {
  startingBalance: number
  currentBalance: number
  totalPnL: number
  totalFees: number
  totalCommissions: number
  netPnL: number
  changeAmount: number
  changePercent: number
}

/**
 * Daily balance point for charts
 */
export interface DailyBalancePoint {
  date: string
  balance: number
  dailyPnL: number
  change: number
  changePercent: number
  trades: number
  wins: number
  losses: number
}

/**
 * Calculate account balance with unified formula
 * Formula: startingBalance + cumulative PnL (net of commissions and fees)
 * 
 * For prop firms: All phases (Phase 1, 2, Funded) share one balance history
 * The balance is cumulative across the entire journey
 * 
 * @param account - The account to calculate balance for
 * @param trades - All trades for this account
 * @param options - Calculation options
 * @returns Current account balance
 */
export function calculateAccountBalance(
  account: Account | any,
  trades: (Trade | any)[],
  transactions: any[] = [], // Add transactions parameter
  options: BalanceCalculationOptions = {}
): number {
  const {
    excludeFailedAccounts = true,
    includePayouts = true
  } = options

  // Start with account's starting balance
  // Ensure we get a valid number (handle undefined, null, NaN)
  let balance = Number(account.startingBalance) || 0

  // Filter trades based on account type
  // For prop firm accounts: match by phase ID (UUID) since trades use phaseAccountId
  // For regular accounts: match by account number
  let relevantTrades: (Trade | any)[]

  if (account.accountType === 'prop-firm') {
    // Prop firm accounts use phase ID (UUID) for linking trades
    relevantTrades = trades.filter(trade =>
      trade.phaseAccountId === account.id ||
      trade.accountNumber === account.number
    )
  } else {
    // Regular accounts use account number
    relevantTrades = trades.filter(trade => trade.accountNumber === account.number)
  }

  // For failed accounts, we still want to show the actual current balance
  // including trade P&L, so we don't exclude them here
  // The excludeFailedAccounts option is used elsewhere for total calculations

  // Calculate cumulative PnL (net of commissions)
  // Commission is stored as NEGATIVE in DB, so we ADD it
  const cumulativePnL = relevantTrades.reduce((sum, trade) => {
    const netPnL = (trade.pnl || 0) + (trade.commission || 0)
    return sum + netPnL
  }, 0)

  balance += cumulativePnL

  // For live accounts, add deposits and subtract withdrawals
  if (account.accountType === 'live' && transactions.length > 0) {
    const accountTransactions = transactions.filter(tx => tx.accountId === account.id)
    const totalTransactions = accountTransactions.reduce((sum, tx) => sum + tx.amount, 0)
    balance += totalTransactions
  }

  // Add payouts if requested (only for funded accounts)
  if (includePayouts && account.payouts && Array.isArray(account.payouts)) {
    const payoutsSum = account.payouts.reduce((sum: number, payout: any) => {
      return sum + (payout.amount || 0)
    }, 0)
    balance += payoutsSum
  }

  return balance
}

/**
 * Calculate balances for multiple accounts
 * More efficient than calling calculateAccountBalance multiple times
 * 
 * @param accounts - Array of accounts
 * @param allTrades - All trades for all accounts
 * @param options - Calculation options
 * @returns Map of account number to balance
 */
export function calculateAccountBalances(
  accounts: (Account | any)[],
  allTrades: (Trade | any)[],
  allTransactions: any[] = [], // Add transactions parameter
  options: BalanceCalculationOptions = {}
): Map<string, number> {
  const balanceMap = new Map<string, number>()

  // Group trades by account number AND phase ID for efficiency
  const tradesByAccountNumber = new Map<string, any[]>()
  const tradesByPhaseId = new Map<string, any[]>()

  allTrades.forEach(trade => {
    // Group by account number (for regular accounts and backwards compatibility)
    if (trade.accountNumber) {
      if (!tradesByAccountNumber.has(trade.accountNumber)) {
        tradesByAccountNumber.set(trade.accountNumber, [])
      }
      tradesByAccountNumber.get(trade.accountNumber)!.push(trade)
    }

    // Group by phase ID (for prop firm accounts)
    if (trade.phaseAccountId) {
      if (!tradesByPhaseId.has(trade.phaseAccountId)) {
        tradesByPhaseId.set(trade.phaseAccountId, [])
      }
      tradesByPhaseId.get(trade.phaseAccountId)!.push(trade)
    }
  })

  // Group transactions by account ID for efficiency
  const transactionsByAccountId = new Map<string, any[]>()
  allTransactions.forEach(transaction => {
    if (!transactionsByAccountId.has(transaction.accountId)) {
      transactionsByAccountId.set(transaction.accountId, [])
    }
    transactionsByAccountId.get(transaction.accountId)!.push(transaction)
  })

  // Group prop firm accounts by masterAccountId to aggregate failed accounts
  const accountsByMasterId = new Map<string, any[]>()
  accounts.forEach(account => {
    if (account.accountType === 'prop-firm' && account.currentPhaseDetails?.masterAccountId) {
      const masterId = account.currentPhaseDetails.masterAccountId
      if (!accountsByMasterId.has(masterId)) {
        accountsByMasterId.set(masterId, [])
      }
      accountsByMasterId.get(masterId)!.push(account)
    }
  })

  // Calculate balance for each account
  accounts.forEach(account => {
    let accountTrades: any[] = []

    if (account.accountType === 'prop-firm') {
      // For prop firm accounts: always use only the current phase's trades for balance
      // Even for failed accounts, show the balance of the failed phase (what caused the failure)
      // Trade count is aggregated elsewhere, but balance should reflect the failed phase's state
      accountTrades = tradesByPhaseId.get(account.id) || []

      // Fallback to account number for backwards compatibility
      if (accountTrades.length === 0 && account.number) {
        accountTrades = tradesByAccountNumber.get(account.number) || []
      }
    } else {
      // For regular accounts, use account number
      accountTrades = tradesByAccountNumber.get(account.number) || []
    }

    const accountTransactions = transactionsByAccountId.get(account.id) || []
    const balance = calculateAccountBalance(account, accountTrades, accountTransactions, options)
    balanceMap.set(account.number, balance)
  })

  return balanceMap
}

/**
 * Calculate total equity across all accounts
 * 
 * @param accounts - Array of accounts
 * @param allTrades - All trades for all accounts
 * @param options - Calculation options
 * @returns Total equity
 */
export function calculateTotalEquity(
  accounts: (Account | any)[],
  allTrades: (Trade | any)[],
  allTransactions: any[] = [],
  options: BalanceCalculationOptions = {}
): number {
  const balances = calculateAccountBalances(accounts, allTrades, allTransactions, options)
  return Array.from(balances.values()).reduce((sum, balance) => sum + balance, 0)
}

/**
 * ⚠️ CRITICAL FUNCTION: Calculate total starting balance with prop firm phase deduplication
 * 
 * PROBLEM: Prop firms have multiple phases (Phase 1, 2, Funded) but they all represent
 * the SAME capital. If we sum all starting balances, we'd count the same money 2-3 times.
 * 
 * SOLUTION: For prop firms, only count ONE starting balance per master account.
 * For regular accounts, count each one separately.
 * 
 * EXAMPLE:
 * - Master Account "APEX 100K" has:
 *   - Phase 1: $100,000 starting balance (status: passed)
 *   - Phase 2: $100,000 starting balance (status: active)
 *   - Funded: $100,000 starting balance (status: pending)
 * 
 * WRONG: Sum = $300,000 (triple counting!)
 * RIGHT: Sum = $100,000 (only count once, prefer active phase)
 * 
 * @param accounts - Array of accounts (may include multiple phases of same master account)
 * @returns Total starting balance (deduplicated for prop firms)
 */
export function calculateTotalStartingBalance(
  accounts: (Account | any)[]
): number {
  // Group accounts by master account ID to prevent double-counting
  const masterAccountBalances = new Map<string, { balance: number, isActive: boolean, isFunded: boolean, status: string }>()


  accounts.forEach(account => {
    // For prop firms, use master account ID as the key
    // For regular accounts, use the account ID itself
    const phaseDetails = account.currentPhaseDetails || account.phaseDetails
    const masterKey = phaseDetails?.masterAccountId || account.id
    const accountName = phaseDetails?.masterAccountName || account.name || account.number

    const isActive = account.status === 'active'
    const isFunded = account.status === 'funded'
    const status = account.status || 'active'
    // Ensure we get a valid number (handle undefined, null, NaN)
    const balance = Number(account.startingBalance) || 0


    const existing = masterAccountBalances.get(masterKey)

    // If this master account already exists in our map
    if (existing) {
      // For prop firms with multiple phases: Priority order is funded > active > passed
      // 1. If this phase is funded, always use it
      // 2. If this phase is active and existing wasn't funded, use it
      // 3. Otherwise, keep the existing one (don't double-count)
      if (isFunded) {
        masterAccountBalances.set(masterKey, { balance, isActive, isFunded, status })
      } else if (isActive && !existing.isFunded) {
        masterAccountBalances.set(masterKey, { balance, isActive, isFunded, status })
      } else {
      }
      // Otherwise, keep the existing one (don't double-count)
    } else {
      // New master account - add it
      masterAccountBalances.set(masterKey, { balance, isActive, isFunded, status })
    }
  })

  const total = Array.from(masterAccountBalances.values()).reduce((sum, { balance }) => sum + balance, 0)

  // Sum up balances from unique master accounts only
  return total
}

/**
 * Calculate comprehensive balance information with all financial metrics
 * 
 * This is the PRIMARY function that UI components should use for displaying
 * account balance information. It provides all necessary data in one call.
 * 
 * @param accounts - Array of accounts (filtered to what user wants to see)
 * @param trades - Array of trades (filtered to match accounts)
 * @param options - Calculation options
 * @returns Complete balance information
 */
export function calculateBalanceInfo(
  accounts: (Account | any)[],
  trades: (Trade | any)[],
  options: BalanceCalculationOptions = {}
): BalanceResult {
  // Use the deduplicated starting balance calculation
  const startingBalance = calculateTotalStartingBalance(accounts)

  // Calculate totals from trades
  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0)
  const totalCommissions = trades.reduce((sum, t) => sum + (t.commission || 0), 0)
  const netPnL = totalPnL + totalCommissions  // Commission is negative

  const currentBalance = startingBalance + netPnL
  const changeAmount = currentBalance - startingBalance
  const changePercent = startingBalance > 0 ? (changeAmount / startingBalance) * 100 : 0

  return {
    startingBalance,
    currentBalance,
    totalPnL,
    totalFees: totalCommissions, // Fees are same as commissions
    totalCommissions,
    netPnL,
    changeAmount,
    changePercent
  }
}

/**
 * Calculate balance history for charts (day-by-day progression)
 * 
 * This function creates a time-series of balance values for rendering charts.
 * It properly handles:
 * - Running balance calculation
 * - Daily P&L aggregation
 * - Win/loss counting
 * - Percentage changes
 * 
 * @param accounts - Array of accounts
 * @param trades - Array of trades (should be sorted by date)
 * @param calendarData - Pre-aggregated daily data
 * @returns Array of daily balance points for charting
 */
export function calculateBalanceHistory(
  accounts: (Account | any)[],
  trades: (Trade | any)[],
  calendarData: Record<string, { pnl: number, trades?: any[] }>
): DailyBalancePoint[] {
  const startingBalance = calculateTotalStartingBalance(accounts)

  // Get sorted dates from calendar data
  const sortedDates = Object.keys(calendarData).sort()

  let runningBalance = startingBalance
  let previousBalance = startingBalance

  return sortedDates.map(date => {
    const dayData = calendarData[date]
    const dailyPnL = dayData.pnl || 0

    runningBalance += dailyPnL
    const change = runningBalance - previousBalance
    const changePercent = previousBalance !== 0 ? (change / Math.abs(previousBalance)) * 100 : 0

    // Count wins/losses from day's trades
    const dayTrades = dayData.trades || []
    const wins = dayTrades.filter(t => {
      const netPnL = (t.pnl || 0) + (t.commission || 0)  // Commission is negative
      return netPnL > 0
    }).length
    const losses = dayTrades.filter(t => {
      const netPnL = (t.pnl || 0) + (t.commission || 0)  // Commission is negative
      return netPnL < 0
    }).length

    const point: DailyBalancePoint = {
      date,
      balance: runningBalance,
      dailyPnL,
      change,
      changePercent,
      trades: dayTrades.length,
      wins,
      losses
    }

    previousBalance = runningBalance
    return point
  })
}

