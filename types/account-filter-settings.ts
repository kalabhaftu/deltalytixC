/**
 * Account filtering settings types
 * These settings persist across devices and control what accounts/data are shown
 */

export interface AccountFilterSettings {
  // Global filtering mode
  showMode: 'active-only' | 'all-accounts' | 'custom'

  // Specific account selections (when mode is 'custom')
  selectedAccounts: string[] // Account IDs
  selectedPhaseAccountIds: string[] // Phase account IDs for trade filtering

  // Status filters (when mode is 'custom')
  includeStatuses: AccountStatus[]

  // Account type filters
  showLiveAccounts: boolean
  showPropFirmAccounts: boolean

  // Prop firm specific settings
  showPhase1Accounts: boolean
  showPhase2Accounts: boolean
  showFundedAccounts: boolean

  // Legacy options
  showPassedAccounts: boolean
  showFailedAccounts: boolean

  // Hierarchical grouping preferences
  groupByParentAccount: boolean // Group phase 1 & 2 under parent

  // ✅ NEW: Phase-specific viewing (affects widgets/dashboard, NOT account detail pages)
  viewingSpecificPhase: boolean // If true, user is viewing a specific phase
  selectedMasterAccountId: string | null // Master account ID being viewed
  selectedPhaseId: string | null // Specific phase ID being viewed (null = all phases)
  selectedPhaseNumber: number | null // Phase number for display (1, 2, 3)

  // Last updated timestamp
  updatedAt: string
}

export type AccountStatus = 'active' | 'failed' | 'funded' | 'passed'

export interface AccountHierarchy {
  // Parent account info (for prop firm phase tracking)
  parentAccountNumber?: string
  parentAccountId?: string
  
  // Account relationship
  isParentAccount: boolean
  isChildAccount: boolean
  childAccounts: string[] // IDs of related phase accounts
  
  // Phase information
  phaseNumber?: 1 | 2
  phaseType?: 'phase_1' | 'phase_2' | 'funded'
}

export interface ExtendedAccount {
  id: string
  number: string
  name?: string
  status: AccountStatus
  accountType: 'live' | 'prop-firm'
  propfirm?: string
  broker?: string
  startingBalance: number
  currentBalance?: number
  currentEquity?: number
  hierarchy: AccountHierarchy
  displayName: string
}

export const DEFAULT_FILTER_SETTINGS: AccountFilterSettings = {
  showMode: 'active-only',
  selectedAccounts: [],
  selectedPhaseAccountIds: [],
  includeStatuses: ['active', 'funded'],
  showLiveAccounts: true,
  showPropFirmAccounts: true,
  showPhase1Accounts: true,
  showPhase2Accounts: true,
  showFundedAccounts: true,
  showPassedAccounts: false,
  showFailedAccounts: false,
  groupByParentAccount: true,
  viewingSpecificPhase: false,
  selectedMasterAccountId: null,
  selectedPhaseId: null,
  selectedPhaseNumber: null,
  updatedAt: new Date().toISOString()
}




