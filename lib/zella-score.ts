/**
 * Zella Score Calculation
 * Based on TradeZella's performance scoring system
 * 
 * Combines 6 key trading metrics with specific weights:
 * - Recovery Factor: 10%
 * - Trade Win %: 15%
 * - Average Win/Loss: 20%
 * - Profit Factor: 25%
 * - Max Drawdown: 20%
 * - Consistency Score: 10%
 */

export interface ZellaScoreMetrics {
  avgWinLoss: number
  tradeWinPercentage: number
  maxDrawdown: number
  profitFactor: number
  recoveryFactor: number
  consistencyScore: number
}

export interface ZellaScoreResult {
  overallScore: number
  metrics: {
    avgWinLoss: number
    tradeWinPercentage: number
    maxDrawdown: number
    profitFactor: number
    recoveryFactor: number
    consistencyScore: number
  }
  breakdown: {
    avgWinLossScore: number
    tradeWinPercentageScore: number
    maxDrawdownScore: number
    profitFactorScore: number
    recoveryFactorScore: number
    consistencyScoreValue: number
  }
}

/**
 * Calculate Average Win/Loss Ratio Score
 * Formula from TradeZella documentation
 */
export function calculateAvgWinLossScore(avgWinLoss: number): number {
  if (avgWinLoss >= 2.6) return 100
  if (avgWinLoss >= 2.4) return 90 + ((avgWinLoss - 2.4) / 0.2) * 10
  if (avgWinLoss >= 2.2) return 80 + ((avgWinLoss - 2.2) / 0.2) * 10
  if (avgWinLoss >= 2.0) return 70 + ((avgWinLoss - 2.0) / 0.2) * 10
  if (avgWinLoss >= 1.9) return 60 + ((avgWinLoss - 1.9) / 0.1) * 10
  if (avgWinLoss >= 1.8) return 50 + ((avgWinLoss - 1.8) / 0.1) * 10
  return 20
}

/**
 * Calculate Trade Win Percentage Score
 * Formula: (Trade Win % / Top Threshold) × 100
 * Default Top Threshold: 60
 * Capped at 100
 */
export function calculateTradeWinPercentageScore(
  tradeWinPercentage: number,
  topThreshold: number = 60
): number {
  const score = (tradeWinPercentage / topThreshold) * 100
  return Math.min(score, 100)
}

/**
 * Calculate Maximum Drawdown Score
 * Formula: 100 - ((Max Drawdown / Peak P&L) × 100)
 * Lower drawdown = better score
 */
export function calculateMaxDrawdownScore(maxDrawdownPercent: number): number {
  return Math.max(0, 100 - maxDrawdownPercent)
}

/**
 * Calculate Profit Factor Score
 * Formula from TradeZella documentation
 */
export function calculateProfitFactorScore(profitFactor: number): number {
  if (profitFactor >= 2.6) return 100
  if (profitFactor >= 2.4) return 90 + ((profitFactor - 2.4) / 0.2) * 10
  if (profitFactor >= 2.2) return 80 + ((profitFactor - 2.2) / 0.2) * 10
  if (profitFactor >= 2.0) return 70 + ((profitFactor - 2.0) / 0.2) * 10
  if (profitFactor >= 1.9) return 60 + ((profitFactor - 1.9) / 0.1) * 10
  if (profitFactor >= 1.8) return 50 + ((profitFactor - 1.8) / 0.1) * 10
  return 20
}

/**
 * Calculate Recovery Factor Score
 * Formula from TradeZella documentation
 */
export function calculateRecoveryFactorScore(recoveryFactor: number): number {
  if (recoveryFactor >= 3.5) return 100
  if (recoveryFactor >= 3.0) return 70 + ((recoveryFactor - 3.0) / 0.5) * 19
  if (recoveryFactor >= 2.5) return 60 + ((recoveryFactor - 2.5) / 0.5) * 10
  if (recoveryFactor >= 2.0) return 50 + ((recoveryFactor - 2.0) / 0.5) * 10
  if (recoveryFactor >= 1.5) return 30 + ((recoveryFactor - 1.5) / 0.5) * 20
  if (recoveryFactor >= 1.0) return 1 + ((recoveryFactor - 1.0) / 0.5) * 29
  return 0
}

/**
 * Calculate Consistency Score
 * Formula: If avg profit < 0, then 0
 * Otherwise: 100 - ((Std Dev of Profits / Total Profit) × 100)
 */
export function calculateConsistencyScore(
  avgProfit: number,
  stdDevProfits: number,
  totalProfit: number
): number {
  if (avgProfit < 0) return 0
  if (totalProfit === 0) return 0
  
  const score = 100 - ((stdDevProfits / totalProfit) * 100)
  return Math.max(0, Math.min(100, score))
}

/**
 * Calculate Complete Zella Score
 * Weighted combination of all metrics
 */
export function calculateZellaScore(metrics: ZellaScoreMetrics): ZellaScoreResult {
  const avgWinLossScore = calculateAvgWinLossScore(metrics.avgWinLoss)
  const tradeWinPercentageScore = calculateTradeWinPercentageScore(metrics.tradeWinPercentage)
  const maxDrawdownScore = calculateMaxDrawdownScore(metrics.maxDrawdown)
  const profitFactorScore = calculateProfitFactorScore(metrics.profitFactor)
  const recoveryFactorScore = calculateRecoveryFactorScore(metrics.recoveryFactor)
  const consistencyScoreValue = metrics.consistencyScore // Already calculated

  // Weighted scores
  const weights = {
    recoveryFactor: 0.10,      // 10%
    tradeWinPercentage: 0.15,  // 15%
    avgWinLoss: 0.20,          // 20%
    profitFactor: 0.25,        // 25%
    maxDrawdown: 0.20,         // 20%
    consistencyScore: 0.10     // 10%
  }

  const overallScore = Math.round(
    recoveryFactorScore * weights.recoveryFactor +
    tradeWinPercentageScore * weights.tradeWinPercentage +
    avgWinLossScore * weights.avgWinLoss +
    profitFactorScore * weights.profitFactor +
    maxDrawdownScore * weights.maxDrawdown +
    consistencyScoreValue * weights.consistencyScore
  )

  return {
    overallScore,
    metrics,
    breakdown: {
      avgWinLossScore,
      tradeWinPercentageScore,
      maxDrawdownScore,
      profitFactorScore,
      recoveryFactorScore,
      consistencyScoreValue
    }
  }
}

/**
 * Calculate metrics from trade data
 */
export interface Trade {
  pnl: number
  commission?: number
  entryDate: string
}

export function calculateMetricsFromTrades(trades: Trade[]): ZellaScoreMetrics {
  if (trades.length === 0) {
    return {
      avgWinLoss: 0,
      tradeWinPercentage: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      recoveryFactor: 0,
      consistencyScore: 0
    }
  }

  // Calculate wins and losses
  const wins = trades.filter(t => {
    const netPnL = t.pnl - (t.commission || 0)
    return netPnL > 0
  })
  
  const losses = trades.filter(t => {
    const netPnL = t.pnl - (t.commission || 0)
    return netPnL < 0
  })

  // Gross win/loss amounts
  const grossWin = wins.reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0)
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0))

  // Average Win/Loss Ratio
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0
  const avgWinLoss = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 5 : 0

  // Trade Win Percentage
  const tradeWinPercentage = trades.length > 0 ? (wins.length / trades.length) * 100 : 0

  // Profit Factor
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 5 : 0

  // Calculate Max Drawdown
  let peak = 0
  let maxDrawdown = 0
  let runningPnL = 0
  
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
  )
  
  sortedTrades.forEach(trade => {
    runningPnL += (trade.pnl - (trade.commission || 0))
    if (runningPnL > peak) peak = runningPnL
    const drawdown = peak - runningPnL
    if (drawdown > maxDrawdown) maxDrawdown = drawdown
  })
  
  const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0

  // Net Profit
  const netProfit = trades.reduce((sum, t) => sum + (t.pnl - (t.commission || 0)), 0)

  // Recovery Factor
  const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : netProfit > 0 ? 5 : 0

  // Consistency Score
  const dailyPnL: Record<string, number> = {}
  trades.forEach(trade => {
    const date = trade.entryDate.split('T')[0]
    if (!dailyPnL[date]) dailyPnL[date] = 0
    dailyPnL[date] += (trade.pnl - (trade.commission || 0))
  })
  
  const dailyReturns = Object.values(dailyPnL)
  const avgDaily = dailyReturns.reduce((sum, val) => sum + val, 0) / dailyReturns.length
  const variance = dailyReturns.reduce((sum, val) => sum + Math.pow(val - avgDaily, 2), 0) / dailyReturns.length
  const stdDev = Math.sqrt(variance)
  
  const consistencyScore = calculateConsistencyScore(avgDaily, stdDev, netProfit)

  return {
    avgWinLoss,
    tradeWinPercentage,
    maxDrawdown: maxDrawdownPercent,
    profitFactor,
    recoveryFactor,
    consistencyScore
  }
}


