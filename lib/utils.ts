import { Trade } from "@prisma/client"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { formatInTimeZone } from 'date-fns-tz'
import { StatisticsProps } from "@/app/dashboard/types/statistics"
import { Account } from "@/context/data-provider"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format numbers without unnecessary trailing zeros
export function formatNumber(value: number, maxDecimals: number = 4): string {
  if (isNaN(value) || !isFinite(value)) return '0'
  
  // Convert to string and remove trailing zeros
  const formatted = value.toFixed(maxDecimals)
  return parseFloat(formatted).toString()
}

// Utility function to format currency without unnecessary trailing zeros
export function formatCurrency(value: number, maxDecimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '$0'
  
  const formatted = value.toFixed(maxDecimals)
  const cleanNumber = parseFloat(formatted)
  return `$${cleanNumber}`
}

// Utility function to format percentage without unnecessary trailing zeros
export function formatPercentage(value: number, maxDecimals: number = 1): string {
  if (isNaN(value) || !isFinite(value)) return '0%'
  
  const formatted = (value * 100).toFixed(maxDecimals)
  const cleanNumber = parseFloat(formatted)
  return `${cleanNumber}%`
}

// Utility function to format percent values that are already in percentage form (e.g., 102.127 -> "102.13%")
export function formatPercent(value: number, maxDecimals: number = 2): string {
  if (isNaN(value) || !isFinite(value)) return '0%'
  
  const formatted = value.toFixed(maxDecimals)
  const cleanNumber = parseFloat(formatted)
  return `${cleanNumber}%`
}

// Utility function to format trade quantity/lots - removes trailing zeros intelligently
export function formatQuantity(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '0'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue) || !isFinite(numValue)) return '0'
  
  // Use up to 4 decimal places but remove trailing zeros
  const formatted = numValue.toFixed(4)
  const cleanNumber = parseFloat(formatted)
  return cleanNumber.toString()
}

// Get decimal precision based on instrument/pair
export function getPricePrecision(instrument: string): number {
  if (!instrument) return 5
  
  const upper = instrument.toUpperCase()
  
  // JPY pairs use 3 decimals (2 pips + 1 pipette)
  if (upper.includes('JPY')) {
    return 3
  }
  
  // All other pairs use 5 decimals (4 pips + 1 pipette)
  return 5
}

// Format price based on instrument type (removes trailing zeros)
export function formatPrice(price: string | number, instrument: string): string {
  if (!price) return '0'
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(numPrice) || !isFinite(numPrice)) return '0'
  
  const precision = getPricePrecision(instrument)
  // Use toFixed for precision but remove trailing zeros
  const fixed = numPrice.toFixed(precision)
  return parseFloat(fixed).toString()
}

// Unified trade data formatter - single source of truth for all trade displays
export function formatTradeData(trade: Trade) {
  const instrument = trade.instrument || ''
  
  return {
    // Core trade info
    instrument: instrument || 'N/A',
    accountNumber: trade.accountNumber || 'N/A',
    side: trade.side?.toUpperCase() || 'N/A',
    
    // Quantities and prices - smart formatting based on instrument type
    quantity: formatQuantity(trade.quantity),
    quantityWithUnit: `${formatQuantity(trade.quantity)} lots`,
    entryPrice: formatPrice(trade.entryPrice, instrument),
    closePrice: trade.closePrice ? formatPrice(trade.closePrice, instrument) : 'Open',
    entryPriceCurrency: `$${formatPrice(trade.entryPrice, instrument)}`,
    closePriceCurrency: trade.closePrice ? `$${formatPrice(trade.closePrice, instrument)}` : 'Open',
    
    // P&L and commission
    pnl: trade.pnl || 0,
    pnlFormatted: formatCurrency(trade.pnl || 0),
    commission: trade.commission || 0,
    commissionFormatted: formatCurrency(trade.commission || 0),
    netPnl: (trade.pnl || 0) - (trade.commission || 0),
    netPnlFormatted: formatCurrency((trade.pnl || 0) - (trade.commission || 0)),
    
    // Dates and times
    entryDate: trade.entryDate ? new Date(trade.entryDate) : null,
    closeDate: trade.closeDate ? new Date(trade.closeDate) : null,
    entryDateFormatted: trade.entryDate ? new Date(trade.entryDate).toLocaleString() : 'N/A',
    closeDateFormatted: trade.closeDate ? new Date(trade.closeDate).toLocaleString() : 'Open',
    entryDateShort: trade.entryDate ? new Date(trade.entryDate).toLocaleDateString() : 'N/A',
    closeDateShort: trade.closeDate ? new Date(trade.closeDate).toLocaleDateString() : 'Open',
    
    // Time in position
    timeInPosition: trade.timeInPosition || 0,
    timeInPositionFormatted: parsePositionTime(trade.timeInPosition || 0),
    
    // Trade status helpers
    isWin: (trade.pnl || 0) - (trade.commission || 0) > 0,
    isLoss: (trade.pnl || 0) - (trade.commission || 0) < 0,
    isBreakEven: (trade.pnl || 0) - (trade.commission || 0) === 0,
    isOpen: !trade.closeDate,
    isClosed: !!trade.closeDate,
    
    // Additional data
    stopLoss: (trade as any).stopLoss || null,
    takeProfit: (trade as any).takeProfit || null,
    closeReason: (trade as any).closeReason || null,
    comment: trade.comment || null,
    
    // IDs
    id: trade.id,
    entryId: trade.entryId || null,
    groupId: trade.groupId || null,
    
    // Raw data for custom formatting
    raw: trade
  }
}

export function parsePositionTime(timeInSeconds: number): string {
  const hours = Math.floor(timeInSeconds / 3600);
  const minutesLeft = Math.floor((timeInSeconds - (hours * 3600)) / 60);
  const secondsLeft = Math.floor(timeInSeconds - (hours * 3600) - (minutesLeft * 60));
  
  if (isNaN(hours) || isNaN(minutesLeft) || isNaN(secondsLeft)) {
    return '0';
  }
  
  const formattedTime = [
    hours > 0 ? `${hours}h` : '',
    `${minutesLeft}m`,
    `${secondsLeft}s`
  ].filter(Boolean).join(' ');
  
  return formattedTime;
}

/**
 * Groups trades by execution (handles partial closes)
 * Groups by entryId first, falls back to instrument+entryDate+side
 * Returns array of grouped trades where partials are combined
 */
export interface GroupedTrade extends Trade {
  partialTrades?: Trade[]  // Array of all partial closes
  isGrouped?: boolean      // Flag to indicate this is a grouped trade
}

export function groupTradesByExecution(trades: Trade[]): GroupedTrade[] {
  const groups = new Map<string, GroupedTrade>()

  trades.forEach(trade => {
    // Create grouping key - prefer entryId, fallback to instrument+time+side
    let key: string
    if (trade.entryId && trade.entryId.trim() !== '') {
      key = `entryId:${trade.entryId}`
    } else {
      // Fallback: group by instrument, entry date (to nearest minute), and side
      const entryDate = new Date(trade.entryDate)
      const roundedTime = new Date(entryDate)
      roundedTime.setSeconds(0, 0) // Round to nearest minute
      key = `fallback:${trade.instrument}:${roundedTime.toISOString()}:${trade.side}`
    }

    if (!groups.has(key)) {
      // First trade in group - create grouped trade
      groups.set(key, {
        ...trade,
        partialTrades: [trade],
        isGrouped: false, // Will be set to true if more trades added
      })
    } else {
      // Additional trade in group (partial close) - merge data
      const group = groups.get(key)!
      
      // Add to partial trades array
      group.partialTrades!.push(trade)
      group.isGrouped = true
      
      // Sum P&L and commission
      group.pnl += trade.pnl || 0
      group.commission += trade.commission || 0
      
      // Sum quantities
      group.quantity += trade.quantity || 0
      
      // Use the longest timeInPosition (last close)
      if ((trade.timeInPosition || 0) > (group.timeInPosition || 0)) {
        group.timeInPosition = trade.timeInPosition
        group.closeDate = trade.closeDate // Update close date to match longest time
        group.closePrice = trade.closePrice // Update close price to last execution
        if (trade.exitTime) group.exitTime = trade.exitTime
      }
    }
  })

  return Array.from(groups.values())
}

export function calculateStatistics(trades: Trade[], accounts: Account[] = []): StatisticsProps {
  if (!trades.length) {
    return {
      cumulativeFees: 0,
      cumulativePnl: 0,
      winningStreak: 0,
      winRate: 0,
      nbTrades: 0,
      nbBe: 0,
      nbWin: 0,
      nbLoss: 0,
      totalPositionTime: 0,
      averagePositionTime: '0s',
      profitFactor: 0,
      grossLosses: 0,
      grossWin: 0,
      // New metrics for enhanced statistics
      biggestWin: 0,
      biggestLoss: 0,
      // Payout statistics
      totalPayouts: 0,
      nbPayouts: 0,
    }
  }

  // CRITICAL: Group trades by execution to handle partial closes correctly
  const groupedTrades = groupTradesByExecution(trades)

  // Create a map of accounts for quick lookup
  const accountMap = new Map(accounts.map(account => [account.number, account]));

  // Use grouped trades for accurate statistics
  const filteredTrades = groupedTrades;

  if (!filteredTrades.length) {
    return {
      cumulativeFees: 0,
      cumulativePnl: 0,
      winningStreak: 0,
      winRate: 0,
      nbTrades: 0,
      nbBe: 0,
      nbWin: 0,
      nbLoss: 0,
      totalPositionTime: 0,
      averagePositionTime: '0s',
      profitFactor: 0,
      grossLosses: 0,
      grossWin: 0,
      // New metrics for enhanced statistics
      biggestWin: 0,
      biggestLoss: 0,
      // Payout statistics
      totalPayouts: 0,
      nbPayouts: 0,
    }
  }

  const initialStatistics: StatisticsProps = {
    cumulativeFees: 0,
    cumulativePnl: 0,
    winningStreak: 0,
    winRate: 0,
    nbTrades: 0,
    nbBe: 0,
    nbWin: 0,
    nbLoss: 0,
    totalPositionTime: 0,
    averagePositionTime: '0s',
    profitFactor: 1,
    grossLosses: 0,
    grossWin: 0,
    // New metrics for enhanced statistics
    biggestWin: 0,
    biggestLoss: 0,
    // Payout statistics
    totalPayouts: 0,
    nbPayouts: 0,
  };

  // Track consecutive winning streak
  let currentWinningStreak = 0;
  let maxWinningStreak = 0;

  const statistics = filteredTrades.reduce((acc: StatisticsProps, trade: Trade) => {
    const netPnl = trade.pnl - (trade.commission || 0);

    acc.nbTrades++;
    acc.cumulativePnl += trade.pnl;
    acc.cumulativeFees += trade.commission || 0;
    acc.totalPositionTime += trade.timeInPosition;

    // Track biggest win and loss (using net P&L)
    if (netPnl > acc.biggestWin) {
      acc.biggestWin = netPnl;
    }
    if (netPnl < acc.biggestLoss) {
      acc.biggestLoss = netPnl;
    }

    // Categorize trades using net P&L and handle winning streak correctly
    if (netPnl === 0) {
      acc.nbBe++;
      currentWinningStreak = 0; // Break-even breaks winning streak
    } else if (netPnl > 0) {
      acc.nbWin++;
      acc.grossWin += netPnl;
      currentWinningStreak++;
      if (currentWinningStreak > maxWinningStreak) {
        maxWinningStreak = currentWinningStreak;
      }
    } else {
      acc.nbLoss++;
      acc.grossLosses += Math.abs(netPnl);
      currentWinningStreak = 0; // Loss breaks winning streak
    }

    // Calculate win rate excluding break-even trades (standard trading metric)
    const tradableTradesCount = acc.nbWin + acc.nbLoss;
    acc.winRate = tradableTradesCount > 0 ? (acc.nbWin / tradableTradesCount) * 100 : 0;

    return acc;
  }, initialStatistics);

  // Set the maximum winning streak achieved
  statistics.winningStreak = maxWinningStreak;

  // Get unique account numbers from the filtered trades
  const tradeAccountNumbers = new Set(filteredTrades.map(trade => trade.accountNumber));

  // Calculate total payouts only from accounts that have trades in the current dataset
  // and only include payouts that occurred after the reset date
  accounts.forEach(account => {
    if (tradeAccountNumbers.has(account.number)) {
      const payouts = account.payouts || [];
      payouts.forEach(payout => {
        // Include all payouts (resetDate feature removed)
        statistics.totalPayouts += payout.amount;
        statistics.nbPayouts++;
      });
    }
  });

  // Calculate average position time (handle division by zero)
  const averageTimeInSeconds = filteredTrades.length > 0 ?
    Math.round(statistics.totalPositionTime / filteredTrades.length) : 0;
  statistics.averagePositionTime = parsePositionTime(averageTimeInSeconds);

  // Calculate proper profit factor (industry standard formula)
  // Profit Factor = Gross Profits / Gross Losses
  if (statistics.grossLosses > 0) {
    statistics.profitFactor = statistics.grossWin / statistics.grossLosses;
  } else if (statistics.grossWin > 0) {
    // If no losses but have profits, profit factor is theoretically infinite
    statistics.profitFactor = Number.POSITIVE_INFINITY;
  } else {
    // No profits and no losses
    statistics.profitFactor = 0;
  }

  // Round profit factor to reasonable precision
  if (statistics.profitFactor !== Number.POSITIVE_INFINITY) {
    statistics.profitFactor = Math.round(statistics.profitFactor * 100) / 100;
  }

  return statistics;
}

export function formatCalendarData(trades: Trade[], accounts: Account[] = []) {
  // CRITICAL: Group trades by execution to handle partial closes correctly
  const groupedTrades = groupTradesByExecution(trades)
  
  // Create a map of accounts for quick lookup
  const accountMap = new Map(accounts.map(account => [account.number, account]));

  // Use grouped trades for accurate calendar data
  const filteredTrades = groupedTrades;

  return filteredTrades.reduce((acc: any, trade: Trade) => {
    // Parse the date and format it in UTC to ensure consistency across timezones
    const date = formatInTimeZone(new Date(trade.entryDate), 'UTC', 'yyyy-MM-dd')
    
    if (!acc[date]) {
      acc[date] = { pnl: 0, tradeNumber: 0, longNumber: 0, shortNumber: 0, trades: [] }
    }
    acc[date].tradeNumber++
    acc[date].pnl += trade.pnl-trade.commission;

    const isLong = trade.side 
      ? (trade.side.toLowerCase() === 'long' || trade.side.toLowerCase() === 'buy' || trade.side.toLowerCase() === 'b') 
      : (new Date(trade.entryDate).getTime() < new Date(trade.closeDate).getTime())
    
    acc[date].longNumber += isLong ? 1 : 0
    acc[date].shortNumber += isLong ? 0 : 1
    acc[date].trades.push(trade)
    return acc
  }, {})
}

export function groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key] as string] = result[currentValue[key] as string] || []).push(
      currentValue
    );
    return result;
  }, {} as { [key: string]: T[] });
}

export function generateTradeHash(trade: Partial<Trade>): string {
  // Handle undefined values by converting them to empty strings or default values
  const hashString = `${trade.userId || ''}-${trade.accountNumber || ''}-${trade.instrument || ''}-${trade.entryDate || ''}-${trade.closeDate || ''}-${trade.quantity || 0}-${trade.entryId || ''}-${trade.timeInPosition || 0}`
  return hashString
}

/**
 * Calculate average win and loss amounts for risk/reward analysis
 * CRITICAL: This function now groups trades by execution to handle partial closes correctly
 * @param trades - Array of trades to analyze
 * @returns Object containing average win, average loss, and risk/reward ratio
 */
export function calculateAverageWinLoss(trades: Trade[]): {
  avgWin: number;
  avgLoss: number;
  riskRewardRatio: number;
  winningTrades: Trade[];
  losingTrades: Trade[];
} {
  // CRITICAL FIX: Group trades first to get accurate averages
  const groupedTrades = groupTradesByExecution(trades)

  const winningTrades = groupedTrades.filter(trade => {
    const netPnl = trade.pnl - (trade.commission || 0);
    return netPnl > 0;
  });

  const losingTrades = groupedTrades.filter(trade => {
    const netPnl = trade.pnl - (trade.commission || 0);
    return netPnl < 0;
  });

  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, trade) => {
        const netPnl = trade.pnl - (trade.commission || 0);
        return sum + netPnl;
      }, 0) / winningTrades.length
    : 0;

  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, trade) => {
        const netPnl = trade.pnl - (trade.commission || 0);
        return sum + netPnl;
      }, 0) / losingTrades.length)
    : 0;

  const riskRewardRatio = avgLoss > 0 ? Math.round((avgWin / avgLoss) * 100) / 100 : 0;

  return {
    avgWin,
    avgLoss,
    riskRewardRatio,
    winningTrades,
    losingTrades
  };
}