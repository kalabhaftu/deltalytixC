'use server'

import { Trade } from '@prisma/client'

export interface AdvancedMetrics {
  // Risk-Adjusted Returns
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  
  // Drawdown Analysis
  maxDrawdown: number
  maxDrawdownDuration: number
  currentDrawdown: number
  averageDrawdown: number
  
  // Return Metrics
  totalReturn: number
  annualizedReturn: number
  volatility: number
  downSideDeviation: number
  
  // Trade Analysis
  profitFactor: number
  payoffRatio: number
  winRate: number
  expectancy: number
  kelly: number
  
  // Distribution Metrics
  skewness: number
  kurtosis: number
  valueAtRisk95: number
  conditionalVaR95: number
  
  // Consistency Metrics
  winningStreak: number
  losingStreak: number
  consecutiveWins: number
  consecutiveLosses: number
  
  // Time-based Analysis
  avgTimeInWinners: number
  avgTimeInLosers: number
  tradesPerDay: number
  bestMonth: { month: string; pnl: number }
  worstMonth: { month: string; pnl: number }
  
  // Risk Metrics
  maxRisk: number
  averageRisk: number
  riskAdjustedReturn: number
  informationRatio: number
}

export class AdvancedAnalytics {
  private trades: Trade[]
  private returns: number[]
  private cumulativeReturns: number[]
  private drawdowns: number[]

  constructor(trades: Trade[]) {
    this.trades = trades.sort((a, b) => 
      new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    )
    this.returns = this.trades.map(trade => trade.pnl)
    this.cumulativeReturns = this.calculateCumulativeReturns()
    this.drawdowns = this.calculateDrawdowns()
  }

  // Calculate all advanced metrics
  calculateAdvancedMetrics(): AdvancedMetrics {
    return {
      // Risk-Adjusted Returns
      sharpeRatio: this.calculateSharpeRatio(),
      sortinoRatio: this.calculateSortinoRatio(),
      calmarRatio: this.calculateCalmarRatio(),
      
      // Drawdown Analysis
      maxDrawdown: this.calculateMaxDrawdown(),
      maxDrawdownDuration: this.calculateMaxDrawdownDuration(),
      currentDrawdown: this.calculateCurrentDrawdown(),
      averageDrawdown: this.calculateAverageDrawdown(),
      
      // Return Metrics
      totalReturn: this.calculateTotalReturn(),
      annualizedReturn: this.calculateAnnualizedReturn(),
      volatility: this.calculateVolatility(),
      downSideDeviation: this.calculateDownsideDeviation(),
      
      // Trade Analysis
      profitFactor: this.calculateProfitFactor(),
      payoffRatio: this.calculatePayoffRatio(),
      winRate: this.calculateWinRate(),
      expectancy: this.calculateExpectancy(),
      kelly: this.calculateKellyCriterion(),
      
      // Distribution Metrics
      skewness: this.calculateSkewness(),
      kurtosis: this.calculateKurtosis(),
      valueAtRisk95: this.calculateVaR(0.05),
      conditionalVaR95: this.calculateCVaR(0.05),
      
      // Consistency Metrics
      winningStreak: this.calculateWinningStreak(),
      losingStreak: this.calculateLosingStreak(),
      consecutiveWins: this.calculateConsecutiveWins(),
      consecutiveLosses: this.calculateConsecutiveLosses(),
      
      // Time-based Analysis
      avgTimeInWinners: this.calculateAvgTimeInWinners(),
      avgTimeInLosers: this.calculateAvgTimeInLosers(),
      tradesPerDay: this.calculateTradesPerDay(),
      bestMonth: this.calculateBestMonth(),
      worstMonth: this.calculateWorstMonth(),
      
      // Risk Metrics
      maxRisk: this.calculateMaxRisk(),
      averageRisk: this.calculateAverageRisk(),
      riskAdjustedReturn: this.calculateRiskAdjustedReturn(),
      informationRatio: this.calculateInformationRatio(),
    }
  }

  private calculateCumulativeReturns(): number[] {
    const cumulative = [0]
    let sum = 0
    
    for (const pnl of this.returns) {
      sum += pnl
      cumulative.push(sum)
    }
    
    return cumulative
  }

  private calculateDrawdowns(): number[] {
    const drawdowns: number[] = []
    let peak = 0
    
    for (const cumReturn of this.cumulativeReturns) {
      peak = Math.max(peak, cumReturn)
      const drawdown = (cumReturn - peak) / Math.max(peak, 1) * 100
      drawdowns.push(drawdown)
    }
    
    return drawdowns
  }

  // Risk-Adjusted Return Metrics
  private calculateSharpeRatio(riskFreeRate: number = 0.02): number {
    const avgReturn = this.mean(this.returns)
    const stdDev = this.standardDeviation(this.returns)
    
    if (stdDev === 0) return 0
    
    // Annualize the metrics
    const annualizedReturn = avgReturn * 252 // Assuming 252 trading days
    const annualizedVol = stdDev * Math.sqrt(252)
    
    return (annualizedReturn - riskFreeRate) / annualizedVol
  }

  private calculateSortinoRatio(riskFreeRate: number = 0.02): number {
    const avgReturn = this.mean(this.returns)
    const downsideDeviation = this.calculateDownsideDeviation()
    
    if (downsideDeviation === 0) return 0
    
    const annualizedReturn = avgReturn * 252
    const annualizedDownside = downsideDeviation * Math.sqrt(252)
    
    return (annualizedReturn - riskFreeRate) / annualizedDownside
  }

  private calculateCalmarRatio(): number {
    const annualizedReturn = this.calculateAnnualizedReturn()
    const maxDD = Math.abs(this.calculateMaxDrawdown())
    
    if (maxDD === 0) return 0
    
    return annualizedReturn / maxDD
  }

  // Drawdown Metrics
  private calculateMaxDrawdown(): number {
    return Math.min(...this.drawdowns)
  }

  private calculateMaxDrawdownDuration(): number {
    let maxDuration = 0
    let currentDuration = 0
    
    for (const dd of this.drawdowns) {
      if (dd < 0) {
        currentDuration++
        maxDuration = Math.max(maxDuration, currentDuration)
      } else {
        currentDuration = 0
      }
    }
    
    return maxDuration
  }

  private calculateCurrentDrawdown(): number {
    return this.drawdowns[this.drawdowns.length - 1] || 0
  }

  private calculateAverageDrawdown(): number {
    const negativeDrawdowns = this.drawdowns.filter(dd => dd < 0)
    return negativeDrawdowns.length > 0 ? this.mean(negativeDrawdowns) : 0
  }

  // Return Metrics
  private calculateTotalReturn(): number {
    return this.returns.reduce((sum, ret) => sum + ret, 0)
  }

  private calculateAnnualizedReturn(): number {
    if (this.trades.length < 2) return 0
    
    const firstTrade = new Date(this.trades[0].entryDate)
    const lastTrade = new Date(this.trades[this.trades.length - 1].entryDate)
    const daysTrading = (lastTrade.getTime() - firstTrade.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysTrading === 0) return 0
    
    const totalReturn = this.calculateTotalReturn()
    return (totalReturn / daysTrading) * 365
  }

  private calculateVolatility(): number {
    return this.standardDeviation(this.returns) * Math.sqrt(252)
  }

  private calculateDownsideDeviation(): number {
    const negativeReturns = this.returns.filter(ret => ret < 0)
    return negativeReturns.length > 0 ? this.standardDeviation(negativeReturns) : 0
  }

  // Trade Analysis
  private calculateProfitFactor(): number {
    const grossProfit = this.returns.filter(ret => ret > 0).reduce((sum, ret) => sum + ret, 0)
    const grossLoss = Math.abs(this.returns.filter(ret => ret < 0).reduce((sum, ret) => sum + ret, 0))
    
    return grossLoss === 0 ? (grossProfit > 0 ? Infinity : 0) : grossProfit / grossLoss
  }

  private calculatePayoffRatio(): number {
    const wins = this.returns.filter(ret => ret > 0)
    const losses = this.returns.filter(ret => ret < 0)
    
    const avgWin = wins.length > 0 ? this.mean(wins) : 0
    const avgLoss = losses.length > 0 ? Math.abs(this.mean(losses)) : 0
    
    return avgLoss === 0 ? (avgWin > 0 ? Infinity : 0) : avgWin / avgLoss
  }

  private calculateWinRate(): number {
    const wins = this.returns.filter(ret => ret > 0).length
    return this.returns.length > 0 ? (wins / this.returns.length) * 100 : 0
  }

  private calculateExpectancy(): number {
    const winRate = this.calculateWinRate() / 100
    const payoffRatio = this.calculatePayoffRatio()
    
    return (winRate * payoffRatio) - ((1 - winRate) * 1)
  }

  private calculateKellyCriterion(): number {
    const winRate = this.calculateWinRate() / 100
    const lossRate = 1 - winRate
    const payoffRatio = this.calculatePayoffRatio()
    
    if (payoffRatio === 0) return 0
    
    return winRate - (lossRate / payoffRatio)
  }

  // Distribution Metrics
  private calculateSkewness(): number {
    const mean = this.mean(this.returns)
    const stdDev = this.standardDeviation(this.returns)
    
    if (stdDev === 0) return 0
    
    const n = this.returns.length
    const skewness = this.returns.reduce((sum, ret) => {
      return sum + Math.pow((ret - mean) / stdDev, 3)
    }, 0) / n
    
    return skewness
  }

  private calculateKurtosis(): number {
    const mean = this.mean(this.returns)
    const stdDev = this.standardDeviation(this.returns)
    
    if (stdDev === 0) return 0
    
    const n = this.returns.length
    const kurtosis = this.returns.reduce((sum, ret) => {
      return sum + Math.pow((ret - mean) / stdDev, 4)
    }, 0) / n - 3 // Excess kurtosis
    
    return kurtosis
  }

  private calculateVaR(confidence: number): number {
    const sortedReturns = [...this.returns].sort((a, b) => a - b)
    const index = Math.floor(sortedReturns.length * confidence)
    return sortedReturns[index] || 0
  }

  private calculateCVaR(confidence: number): number {
    const sortedReturns = [...this.returns].sort((a, b) => a - b)
    const cutoffIndex = Math.floor(sortedReturns.length * confidence)
    const tailReturns = sortedReturns.slice(0, cutoffIndex + 1)
    
    return tailReturns.length > 0 ? this.mean(tailReturns) : 0
  }

  // Consistency Metrics
  private calculateWinningStreak(): number {
    let maxStreak = 0
    let currentStreak = 0
    
    for (const ret of this.returns) {
      if (ret > 0) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }
    
    return maxStreak
  }

  private calculateLosingStreak(): number {
    let maxStreak = 0
    let currentStreak = 0
    
    for (const ret of this.returns) {
      if (ret < 0) {
        currentStreak++
        maxStreak = Math.max(maxStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    }
    
    return maxStreak
  }

  private calculateConsecutiveWins(): number {
    let currentWins = 0
    
    for (let i = this.returns.length - 1; i >= 0; i--) {
      if (this.returns[i] > 0) {
        currentWins++
      } else {
        break
      }
    }
    
    return currentWins
  }

  private calculateConsecutiveLosses(): number {
    let currentLosses = 0
    
    for (let i = this.returns.length - 1; i >= 0; i--) {
      if (this.returns[i] < 0) {
        currentLosses++
      } else {
        break
      }
    }
    
    return currentLosses
  }

  // Time-based Analysis
  private calculateAvgTimeInWinners(): number {
    const winningTrades = this.trades.filter(trade => trade.pnl > 0)
    const times = winningTrades
      .map(trade => trade.timeInPosition)
      .filter(time => time !== null) as number[]
    
    return times.length > 0 ? this.mean(times) : 0
  }

  private calculateAvgTimeInLosers(): number {
    const losingTrades = this.trades.filter(trade => trade.pnl < 0)
    const times = losingTrades
      .map(trade => trade.timeInPosition)
      .filter(time => time !== null) as number[]
    
    return times.length > 0 ? this.mean(times) : 0
  }

  private calculateTradesPerDay(): number {
    if (this.trades.length < 2) return 0
    
    const firstTrade = new Date(this.trades[0].entryDate)
    const lastTrade = new Date(this.trades[this.trades.length - 1].entryDate)
    const daysTrading = (lastTrade.getTime() - firstTrade.getTime()) / (1000 * 60 * 60 * 24)
    
    return daysTrading > 0 ? this.trades.length / daysTrading : 0
  }

  private calculateBestMonth(): { month: string; pnl: number } {
    const monthlyPnL = this.getMonthlyPnL()
    const bestMonth = Object.entries(monthlyPnL).reduce((best, [month, pnl]) => 
      pnl > best.pnl ? { month, pnl } : best
    , { month: '', pnl: -Infinity })
    
    return bestMonth
  }

  private calculateWorstMonth(): { month: string; pnl: number } {
    const monthlyPnL = this.getMonthlyPnL()
    const worstMonth = Object.entries(monthlyPnL).reduce((worst, [month, pnl]) => 
      pnl < worst.pnl ? { month, pnl } : worst
    , { month: '', pnl: Infinity })
    
    return worstMonth
  }

  private getMonthlyPnL(): Record<string, number> {
    const monthlyPnL: Record<string, number> = {}
    
    for (const trade of this.trades) {
      const date = new Date(trade.entryDate)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      monthlyPnL[monthKey] = (monthlyPnL[monthKey] || 0) + trade.pnl
    }
    
    return monthlyPnL
  }

  // Risk Metrics
  private calculateMaxRisk(): number {
    return Math.max(...this.returns.map(ret => Math.abs(ret)))
  }

  private calculateAverageRisk(): number {
    return this.mean(this.returns.map(ret => Math.abs(ret)))
  }

  private calculateRiskAdjustedReturn(): number {
    const totalReturn = this.calculateTotalReturn()
    const avgRisk = this.calculateAverageRisk()
    
    return avgRisk > 0 ? totalReturn / avgRisk : 0
  }

  private calculateInformationRatio(): number {
    // Assuming benchmark return is 0 (market neutral)
    const excessReturn = this.mean(this.returns)
    const trackingError = this.standardDeviation(this.returns)
    
    return trackingError > 0 ? excessReturn / trackingError : 0
  }

  // Utility functions
  private mean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
  }

  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = this.mean(values)
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    
    return Math.sqrt(variance)
  }
}

// Monte Carlo Simulation for risk analysis
export class MonteCarloSimulation {
  private trades: Trade[]
  private simulations: number

  constructor(trades: Trade[], simulations: number = 10000) {
    this.trades = trades
    this.simulations = simulations
  }

  // Run Monte Carlo simulation
  runSimulation(): {
    meanReturn: number
    stdDeviation: number
    percentiles: Record<number, number>
    probabilityOfLoss: number
    expectedShortfall: number
  } {
    const returns = this.trades.map(trade => trade.pnl)
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length
    const stdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length
    )

    const simulatedReturns: number[] = []

    // Run simulations
    for (let i = 0; i < this.simulations; i++) {
      // Generate random normal distribution
      const randomReturn = this.boxMullerTransform() * stdDev + mean
      simulatedReturns.push(randomReturn)
    }

    simulatedReturns.sort((a, b) => a - b)

    const percentiles = {
      5: simulatedReturns[Math.floor(this.simulations * 0.05)],
      10: simulatedReturns[Math.floor(this.simulations * 0.10)],
      25: simulatedReturns[Math.floor(this.simulations * 0.25)],
      50: simulatedReturns[Math.floor(this.simulations * 0.50)],
      75: simulatedReturns[Math.floor(this.simulations * 0.75)],
      90: simulatedReturns[Math.floor(this.simulations * 0.90)],
      95: simulatedReturns[Math.floor(this.simulations * 0.95)],
    }

    const probabilityOfLoss = simulatedReturns.filter(ret => ret < 0).length / this.simulations

    // Expected Shortfall (average of worst 5% outcomes)
    const worstOutcomes = simulatedReturns.slice(0, Math.floor(this.simulations * 0.05))
    const expectedShortfall = worstOutcomes.reduce((sum, ret) => sum + ret, 0) / worstOutcomes.length

    return {
      meanReturn: mean,
      stdDeviation: stdDev,
      percentiles,
      probabilityOfLoss,
      expectedShortfall,
    }
  }

  // Box-Muller transformation for normal distribution
  private boxMullerTransform(): number {
    let u = 0, v = 0
    while (u === 0) u = Math.random() // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random()
    
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  }
}
