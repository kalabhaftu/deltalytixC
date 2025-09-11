/**
 * Simplified Account Type System
 * This file defines the new simplified account structure
 */

export enum AccountType {
  LIVE = 'live',
  PROP_FIRM = 'prop_firm', 
  DEMO = 'demo'
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  FAILED = 'failed',
  PASSED = 'passed',
  FUNDED = 'funded'
}

// Core account interface (shared by all types)
export interface BaseAccount {
  id: string
  number: string
  name?: string
  type: AccountType
  status: AccountStatus
  startingBalance: number
  userId: string
  groupId?: string
  createdAt: Date
  updatedAt: Date
}

// Type-specific configurations

export interface LiveAccountConfig {
  broker: string
  accountCurrency?: string
  leverage?: number
  isMarginAccount?: boolean
}

export interface PropFirmAccountConfig {
  propFirm: string
  evaluationType: 'one_step' | 'two_step'
  dailyDrawdown: {
    amount: number
    type: 'absolute' | 'percent'
  }
  maxDrawdown: {
    amount: number
    type: 'absolute' | 'percent'
    mode: 'static' | 'trailing'
  }
  profitTarget: number
  payoutRules: {
    profitSplit: number
    cycleDays: number
    minDays: number
    minAmount?: number
  }
  businessRules: {
    includeOpenPnl: boolean
    allowManualOverride: boolean
    tradingNewsAllowed: boolean
  }
  timezone: string
  dailyResetTime: string
}

export interface DemoAccountConfig {
  virtualBalance: number
  resetInterval?: 'daily' | 'weekly' | 'monthly' | 'never'
  practiceMode: boolean
  allowedInstruments?: string[]
}

// Full account interfaces

export interface LiveAccount extends BaseAccount {
  type: AccountType.LIVE
  config: LiveAccountConfig
}

export interface PropFirmAccount extends BaseAccount {
  type: AccountType.PROP_FIRM
  config: PropFirmAccountConfig
}

export interface DemoAccount extends BaseAccount {
  type: AccountType.DEMO
  config: DemoAccountConfig
}

export type SimplifiedAccount = LiveAccount | PropFirmAccount | DemoAccount

// Helper functions

export function isLiveAccount(account: SimplifiedAccount): account is LiveAccount {
  return account.type === AccountType.LIVE
}

export function isPropFirmAccount(account: SimplifiedAccount): account is PropFirmAccount {
  return account.type === AccountType.PROP_FIRM
}

export function isDemoAccount(account: SimplifiedAccount): account is DemoAccount {
  return account.type === AccountType.DEMO
}

export function getAccountDisplayName(account: SimplifiedAccount): string {
  return account.name || account.number
}

export function getAccountTypeLabel(type: AccountType): string {
  switch (type) {
    case AccountType.LIVE:
      return 'Live Account'
    case AccountType.PROP_FIRM:
      return 'Prop Firm Account'
    case AccountType.DEMO:
      return 'Demo Account'
    default:
      return 'Unknown Account'
  }
}

// Account creation helpers

export function createLiveAccountData(
  number: string,
  name: string,
  startingBalance: number,
  config: LiveAccountConfig
): Omit<LiveAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    number,
    name,
    type: AccountType.LIVE,
    status: AccountStatus.ACTIVE,
    startingBalance,
    config
  }
}

export function createPropFirmAccountData(
  number: string,
  name: string,
  startingBalance: number,
  config: PropFirmAccountConfig
): Omit<PropFirmAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    number,
    name,
    type: AccountType.PROP_FIRM,
    status: AccountStatus.ACTIVE,
    startingBalance,
    config
  }
}

export function createDemoAccountData(
  number: string,
  name: string,
  startingBalance: number,
  config: DemoAccountConfig
): Omit<DemoAccount, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  return {
    number,
    name,
    type: AccountType.DEMO,
    status: AccountStatus.ACTIVE,
    startingBalance,
    config
  }
}




