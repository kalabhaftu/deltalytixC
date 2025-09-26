import { BacktestingData } from "@/types/backtesting"

// Sample data that matches the images you provided
export const sampleBacktestingData: BacktestingData = {
  stats: {
    netPnl: 191266,
    tradeWinRate: 54.27,
    profitFactor: 2.75,
    dayWinRate: 60.48,
    avgWinTrade: 1036.45,
    avgLossTrade: -1092.56,
    totalTrades: 293,
    winningTrades: 159,
    losingTrades: 134,
    winningDays: 127,
    totalDays: 210,
    maxDrawdown: 15000,
    recoveryFactor: 12.75,
    consistency: 85.3,
    zellaScore: 90.93
  },
  calendarData: {
    // September 2025 data matching the calendar image
    '2025-09-01': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-02': { pnl: 382, trades: 2, winRate: 100, isWinningDay: true },
    '2025-09-03': { pnl: 295, trades: 4, winRate: 50, isWinningDay: true },
    '2025-09-04': { pnl: 993, trades: 1, winRate: 100, isWinningDay: true },
    '2025-09-05': { pnl: 2730, trades: 2, winRate: 100, isWinningDay: true },
    '2025-09-06': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-07': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-08': { pnl: 548, trades: 2, winRate: 50, isWinningDay: true },
    '2025-09-09': { pnl: 1790, trades: 4, winRate: 75, isWinningDay: true },
    '2025-09-10': { pnl: 2470, trades: 1, winRate: 100, isWinningDay: true },
    '2025-09-11': { pnl: -1030, trades: 2, winRate: 0, isWinningDay: false },
    '2025-09-12': { pnl: 2680, trades: 2, winRate: 100, isWinningDay: true },
    '2025-09-13': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-14': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-15': { pnl: 1020, trades: 2, winRate: 50, isWinningDay: true },
    '2025-09-16': { pnl: 338, trades: 2, winRate: 50, isWinningDay: true },
    '2025-09-17': { pnl: -257, trades: 5, winRate: 60, isWinningDay: false },
    '2025-09-18': { pnl: 1230, trades: 3, winRate: 66.67, isWinningDay: true },
    '2025-09-19': { pnl: -265, trades: 3, winRate: 66.67, isWinningDay: false },
    '2025-09-20': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-21': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-22': { pnl: 1090, trades: 2, winRate: 50, isWinningDay: true },
    '2025-09-23': { pnl: 2220, trades: 1, winRate: 100, isWinningDay: true },
    '2025-09-24': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-25': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-26': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-27': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-28': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-29': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false },
    '2025-09-30': { pnl: 0, trades: 0, winRate: 0, isWinningDay: false }
  },
  zellaMetrics: {
    winRate: 54.27,
    profitFactor: 2.75,
    avgWinLoss: 0.95, // avgWinTrade / abs(avgLossTrade)
    recoveryFactor: 12.75,
    maxDrawdown: 15000,
    consistency: 85.3
  }
}
