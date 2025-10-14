import { Trade as PrismaTrade } from '@prisma/client'

// Re-export Prisma's Trade type
export type Trade = PrismaTrade

// Extended trade type with calculated fields for client-side display
export interface TradeWithCalculations extends PrismaTrade {
  calculatedPnL?: number
  netPnL?: number
  assetName?: string
}

// Trade filter types
export type TradeFilterType = 'all' | 'wins' | 'losses' | 'buys' | 'sells'

// Trade statistics
export interface TradeStatistics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  totalPnL: number
  totalCommissions: number
  netPnL: number
}

