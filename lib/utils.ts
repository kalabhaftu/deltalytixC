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

  // Create a map of accounts for quick lookup
  const accountMap = new Map(accounts.map(account => [account.number, account]));

  // Filter trades based on reset dates for each account
  const filteredTrades = trades.filter(trade => {
    const account = accountMap.get(trade.accountNumber);
    if (!account || !account.resetDate) {
      return true; // Include trade if no account found or no reset date
    }
    
    // Only include trades that occurred after the reset date
    return new Date(trade.entryDate) >= new Date(account.resetDate);
  });

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
    const pnl = trade.pnl;
    
    acc.nbTrades++;
    acc.cumulativePnl += pnl;
    acc.cumulativeFees += trade.commission;
    acc.totalPositionTime += trade.timeInPosition;

    // Track biggest win and loss
    if (pnl > acc.biggestWin) {
      acc.biggestWin = pnl;
    }
    if (pnl < acc.biggestLoss) {
      acc.biggestLoss = pnl;
    }

    // Categorize trades and handle winning streak correctly
    if (pnl === 0) {
      acc.nbBe++;
      currentWinningStreak = 0; // Break-even breaks winning streak
    } else if (pnl > 0) {
      acc.nbWin++;
      acc.grossWin += pnl;
      currentWinningStreak++;
      if (currentWinningStreak > maxWinningStreak) {
        maxWinningStreak = currentWinningStreak;
      }
    } else {
      acc.nbLoss++;
      acc.grossLosses += Math.abs(pnl);
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
        // Only include payouts that occurred after the reset date
        if (!account.resetDate || new Date(payout.date) >= new Date(account.resetDate)) {
          statistics.totalPayouts += payout.amount;
          statistics.nbPayouts++;
        }
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
  // Create a map of accounts for quick lookup
  const accountMap = new Map(accounts.map(account => [account.number, account]));

  // Filter trades based on reset dates for each account
  const filteredTrades = trades.filter(trade => {
    const account = accountMap.get(trade.accountNumber);
    if (!account || !account.resetDate) {
      return true; // Include trade if no account found or no reset date
    }
    
    // Only include trades that occurred after the reset date
    return new Date(trade.entryDate) >= new Date(account.resetDate);
  });

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
  const hashString = `${trade.userId || ''}-${trade.accountNumber || ''}-${trade.instrument || ''}-${trade.entryDate || ''}-${trade.closeDate || ''}-${trade.quantity || 0}-${trade.entryId || ''}-${trade.closeId || ''}-${trade.timeInPosition || 0}`
  return hashString
}