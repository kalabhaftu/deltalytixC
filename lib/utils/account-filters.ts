/**
 * Utility functions for filtering accounts across the application
 * This ensures consistent exclusion of failed accounts from all operations
 */

export type AccountStatus = 'active' | 'failed' | 'funded' | 'passed' | null

export interface AccountWithStatus {
  status?: AccountStatus | null
  [key: string]: any
}

/**
 * Check if an account should be included in calculations and operations
 * By default, only active and funded accounts are included
 * Passed and failed accounts are excluded from business operations
 */
export function isAccountActive(account: AccountWithStatus): boolean {
  // Exclude accounts that are explicitly marked as failed or passed
  if (account.status === 'failed' || account.status === 'passed') {
    return false
  }
  
  // Include active, funded, and legacy accounts (null/undefined status)
  return true
}

/**
 * Get list of statuses that should be included in active account filtering
 */
export function getActiveAccountStatuses(): AccountStatus[] {
  return ['active', 'funded'] // Exclude 'failed' and 'passed'
}

/**
 * Get list of statuses that should be excluded from active account filtering
 */
export function getInactiveAccountStatuses(): AccountStatus[] {
  return ['failed', 'passed']
}

/**
 * Filter out failed accounts from an array of accounts
 */
export function filterActiveAccounts<T extends AccountWithStatus>(accounts: T[]): T[] {
  return accounts.filter(isAccountActive)
}

/**
 * Get Prisma where clause to exclude inactive accounts (failed and passed)
 * Use this in database queries to automatically exclude inactive accounts
 */
export function getActiveAccountsWhereClause(additionalWhere: any = {}) {
  return {
    ...additionalWhere,
    status: {
      in: ['active', 'funded']
    }
  }
}

/**
 * Check if trades should be included based on account status
 * Only include trades from active accounts
 */
export function shouldIncludeTradeByAccount(accountNumber: string, accounts: AccountWithStatus[]): boolean {
  const account = accounts.find(acc => acc.number === accountNumber)
  return account ? isAccountActive(account) : true // Include if account not found (legacy trades)
}

/**
 * Filter trades to only include those from active accounts
 */
export function filterTradesFromActiveAccounts<T extends { accountNumber: string }>(
  trades: T[], 
  accounts: AccountWithStatus[]
): T[] {
  return trades.filter(trade => shouldIncludeTradeByAccount(trade.accountNumber, accounts))
}
