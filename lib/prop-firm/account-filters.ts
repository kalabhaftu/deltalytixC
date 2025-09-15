/**
 * Prop Firm Account Filtering Utilities
 * Handles filtering logic to exclude failed accounts from equity calculations
 * and other filtering requirements for the rebuilt system
 */

import { PropFirmAccount, PropFirmPhase, AccountFilter } from '@/types/prop-firm-new'

export class PropFirmAccountFilters {
  
  /**
   * Filter accounts based on status - excludes failed accounts from equity calculations
   * This is a core requirement to prevent failed accounts from affecting total equity
   */
  static filterActiveAccountsForEquity(accounts: PropFirmAccount[]): PropFirmAccount[] {
    return accounts.filter(account => {
      // Only include accounts that are not failed
      return account.status !== 'failed'
    })
  }
  
  /**
   * Filter accounts for display purposes
   * Allows including failed accounts for historical viewing but excludes them by default
   */
  static filterAccountsForDisplay(
    accounts: PropFirmAccount[], 
    includeFailed: boolean = false
  ): PropFirmAccount[] {
    if (includeFailed) {
      return accounts
    }
    
    return accounts.filter(account => account.status !== 'failed')
  }
  
  /**
   * Advanced filtering based on multiple criteria
   */
  static filterAccounts(
    accounts: PropFirmAccount[], 
    filters: AccountFilter
  ): PropFirmAccount[] {
    let filtered = [...accounts]
    
    // Status filtering
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(account => 
        filters.status!.includes(account.status)
      )
    }
    
    // Exclude failed accounts unless explicitly included
    if (!filters.includeFailed) {
      filtered = filtered.filter(account => account.status !== 'failed')
    }
    
    // Firm type filtering
    if (filters.firmType && filters.firmType.length > 0) {
      filtered = filtered.filter(account => 
        filters.firmType!.includes(account.firmType)
      )
    }
    
    // Account size filtering
    if (filters.accountSize) {
      if (filters.accountSize.min !== undefined) {
        filtered = filtered.filter(account => 
          account.accountSize >= filters.accountSize!.min!
        )
      }
      if (filters.accountSize.max !== undefined) {
        filtered = filtered.filter(account => 
          account.accountSize <= filters.accountSize!.max!
        )
      }
    }
    
    // Demo/Live filtering
    if (!filters.includeDemo) {
      filtered = filtered.filter(account => !account.isDemo)
    }
    
    // Date range filtering
    if (filters.createdDate) {
      if (filters.createdDate.from) {
        filtered = filtered.filter(account => 
          account.createdAt >= filters.createdDate!.from!
        )
      }
      if (filters.createdDate.to) {
        filtered = filtered.filter(account => 
          account.createdAt <= filters.createdDate!.to!
        )
      }
    }
    
    // Text search filtering
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim()
      filtered = filtered.filter(account => {
        const searchableText = [
          account.name,
          account.firmType,
          account.phase1AccountId,
          account.phase2AccountId,
          account.fundedAccountId,
          account.phase1Login,
          account.phase2Login,
          account.fundedLogin,
        ].filter(Boolean).join(' ').toLowerCase()
        
        return searchableText.includes(searchTerm)
      })
    }
    
    return filtered
  }
  
  /**
   * Filter phases by type and status
   */
  static filterPhases(
    phases: PropFirmPhase[],
    phaseTypes?: ('phase_1' | 'phase_2' | 'funded')[],
    includeInactive: boolean = false
  ): PropFirmPhase[] {
    let filtered = [...phases]
    
    // Filter by phase type
    if (phaseTypes && phaseTypes.length > 0) {
      filtered = filtered.filter(phase => 
        phaseTypes.includes(phase.phaseType)
      )
    }
    
    // Filter by status
    if (!includeInactive) {
      filtered = filtered.filter(phase => 
        phase.status === 'active' || phase.status === 'passed'
      )
    }
    
    return filtered
  }
  
  /**
   * Calculate total equity across filtered accounts
   * This is the main method used to ensure failed accounts don't affect total equity
   */
  static calculateTotalEquity(
    accounts: PropFirmAccount[],
    phases: PropFirmPhase[]
  ): {
    totalEquity: number
    totalAccounts: number
    activeAccounts: number
    failedAccounts: number
    accountBreakdown: {
      active: number
      failed: number
      passed: number
      funded: number
    }
  } {
    // Filter out failed accounts for equity calculation
    const activeAccountsForEquity = this.filterActiveAccountsForEquity(accounts)
    
    let totalEquity = 0
    const accountBreakdown = {
      active: 0,
      failed: 0,
      passed: 0,
      funded: 0
    }
    
    // Count all accounts by status
    accounts.forEach(account => {
      accountBreakdown[account.status]++
    })
    
    // Calculate equity only from non-failed accounts
    activeAccountsForEquity.forEach(account => {
      // Find the active phase for this account
      const activePhase = phases.find(phase => 
        phase.accountId === account.id && phase.status === 'active'
      )
      
      if (activePhase) {
        totalEquity += activePhase.currentEquity
      } else {
        // If no active phase, use account starting balance
        totalEquity += account.accountSize * 1000 // Convert K to actual amount
      }
    })
    
    return {
      totalEquity,
      totalAccounts: accounts.length,
      activeAccounts: activeAccountsForEquity.length,
      failedAccounts: accountBreakdown.failed,
      accountBreakdown
    }
  }
  
  /**
   * Get accounts that need attention (breached, close to limits, etc.)
   */
  static getAccountsNeedingAttention(
    accounts: PropFirmAccount[],
    phases: PropFirmPhase[]
  ): {
    breached: PropFirmAccount[]
    closeToLimits: PropFirmAccount[]
    readyToAdvance: PropFirmAccount[]
    inactive: PropFirmAccount[]
  } {
    const activeAccounts = this.filterActiveAccountsForEquity(accounts)
    
    const breached: PropFirmAccount[] = []
    const closeToLimits: PropFirmAccount[] = []
    const readyToAdvance: PropFirmAccount[] = []
    const inactive: PropFirmAccount[] = []
    
    activeAccounts.forEach(account => {
      const activePhase = phases.find(phase => 
        phase.accountId === account.id && phase.status === 'active'
      )
      
      if (!activePhase) {
        inactive.push(account)
        return
      }
      
      // Check if breached (would be marked as failed, but double-check)
      if (account.status === 'failed') {
        breached.push(account)
        return
      }
      
      // Check if close to drawdown limits (within 20% of limit)
      const dailyDrawdownUsed = Math.max(0, activePhase.startingBalance - activePhase.currentEquity)
      const maxDrawdownUsed = Math.max(0, activePhase.highWaterMark - activePhase.currentEquity)
      
      const dailyDrawdownPercent = (dailyDrawdownUsed / activePhase.dailyDrawdownAmount) * 100
      const maxDrawdownPercent = (maxDrawdownUsed / activePhase.maxDrawdownAmount) * 100
      
      if (dailyDrawdownPercent > 80 || maxDrawdownPercent > 80) {
        closeToLimits.push(account)
        return
      }
      
      // Check if ready to advance
      const currentProfit = activePhase.currentEquity - activePhase.startingBalance
      const profitTargetMet = currentProfit >= activePhase.profitTarget
      const minTradingDaysMet = activePhase.daysTraded >= activePhase.minTradingDays
      
      if (profitTargetMet && minTradingDaysMet && (activePhase.phaseType !== 'funded')) {
        readyToAdvance.push(account)
      }
    })
    
    return {
      breached,
      closeToLimits,
      readyToAdvance,
      inactive
    }
  }
  
  /**
   * Sort accounts by various criteria
   */
  static sortAccounts(
    accounts: PropFirmAccount[],
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): PropFirmAccount[] {
    const sorted = [...accounts].sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '')
          break
        case 'firmType':
          comparison = a.firmType.localeCompare(b.firmType)
          break
        case 'accountSize':
          comparison = a.accountSize - b.accountSize
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'createdAt':
        default:
          comparison = a.createdAt.getTime() - b.createdAt.getTime()
          break
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }
  
  /**
   * Group accounts by various criteria
   */
  static groupAccounts(
    accounts: PropFirmAccount[],
    groupBy: 'firmType' | 'status' | 'accountSize' | 'currency' = 'firmType'
  ): Record<string, PropFirmAccount[]> {
    const groups: Record<string, PropFirmAccount[]> = {}
    
    accounts.forEach(account => {
      let groupKey: string
      
      switch (groupBy) {
        case 'firmType':
          groupKey = account.firmType
          break
        case 'status':
          groupKey = account.status
          break
        case 'accountSize':
          groupKey = `${account.accountSize}K`
          break
        case 'currency':
          groupKey = account.currency
          break
        default:
          groupKey = 'Other'
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(account)
    })
    
    return groups
  }
  
  /**
   * Get summary statistics for filtered accounts
   */
  static getAccountsSummary(accounts: PropFirmAccount[]): {
    total: number
    byStatus: Record<string, number>
    byFirmType: Record<string, number>
    byAccountSize: Record<string, number>
    averageAccountSize: number
    totalAccountValue: number
  } {
    const summary = {
      total: accounts.length,
      byStatus: {} as Record<string, number>,
      byFirmType: {} as Record<string, number>,
      byAccountSize: {} as Record<string, number>,
      averageAccountSize: 0,
      totalAccountValue: 0,
    }
    
    accounts.forEach(account => {
      // Count by status
      summary.byStatus[account.status] = (summary.byStatus[account.status] || 0) + 1
      
      // Count by firm type
      summary.byFirmType[account.firmType] = (summary.byFirmType[account.firmType] || 0) + 1
      
      // Count by account size
      const sizeKey = `${account.accountSize}K`
      summary.byAccountSize[sizeKey] = (summary.byAccountSize[sizeKey] || 0) + 1
      
      // Add to totals
      summary.totalAccountValue += account.accountSize * 1000
    })
    
    summary.averageAccountSize = accounts.length > 0 ? 
      summary.totalAccountValue / (accounts.length * 1000) : 0
    
    return summary
  }
}
