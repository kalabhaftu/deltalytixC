
import { Trade } from "@prisma/client"
import { BREAK_EVEN_THRESHOLD, classifyTrade } from "@/lib/utils"

export interface DailyStats {
    pnl: number
    tradeCount: number
    winRate: number
    rMultiple: number
    isProfit: boolean
    isLoss: boolean
    isBreakEven: boolean
}

/**
 * Calculates the R-Multiple for a single trade.
 * Formula: (Exit Price - Entry Price) / (Entry Price - Stop Loss)
 * Returns 0 if no Stop Loss is present.
 */
export function calculateRMultiple(trade: Trade): number {
    // Try to find stop loss from extended properties if strictly typed, 
    // currently we cast to any or use extended interface if available.
    // Assuming 'stopLoss' might be on the trade object at runtime or added via extended types.
    const sl = (trade as any).stopLoss

    if (!sl) return 0

    const entry = Number(trade.entryPrice)
    const exit = Number(trade.closePrice || 0) // Handle open trades? Usually R is realized.

    if (!trade.closePrice) return 0 // Open trades don't have realized R? Or projected?
    // Let's assume realized R for calendar.

    const risk = Math.abs(entry - Number(sl))
    if (risk === 0) return 0

    const reward = trade.side?.toLowerCase() === 'short' || trade.side?.toLowerCase() === 'sell'
        ? entry - exit
        : exit - entry

    return reward / risk
}

/**
 * Aggregates stats for a day's worth of trades.
 */
export function calculateDailyStats(trades: Trade[]): DailyStats {
    let pnl = 0
    let tradeCount = 0
    let wins = 0
    let losses = 0
    let rMultiple = 0

    trades.forEach(t => {
        const netPnL = (t.pnl || 0) + (Number(t.commission) || 0)
        pnl += netPnL
        tradeCount++

        const outcome = classifyTrade(netPnL)
        if (outcome === 'win') wins++
        else if (outcome === 'loss') losses++

        rMultiple += calculateRMultiple(t)
    })

    const tradableCount = wins + losses
    const winRate = tradableCount > 0 ? (wins / tradableCount) * 100 : 0
    const avgRMultiple = tradeCount > 0 ? rMultiple / tradeCount : 0

    return {
        pnl,
        tradeCount,
        winRate,
        rMultiple: avgRMultiple,
        isProfit: pnl > BREAK_EVEN_THRESHOLD,
        isLoss: pnl < -BREAK_EVEN_THRESHOLD,
        isBreakEven: Math.abs(pnl) <= BREAK_EVEN_THRESHOLD
    }
}
