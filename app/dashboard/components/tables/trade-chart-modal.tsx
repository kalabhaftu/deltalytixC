'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { TradingViewWidget } from '@/components/tradingview/tradingview-widget'
import { ExtendedTrade } from './trade-table-review'

interface TradeChartModalProps {
  isOpen: boolean
  onClose: () => void
  trade: ExtendedTrade | null
}

export function TradeChartModal({ isOpen, onClose, trade }: TradeChartModalProps) {
  // Validate required trade data
  if (!trade || !trade.entryDate || !trade.closeDate || !trade.entryPrice || !trade.closePrice) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Invalid trade data. Please ensure the trade has valid entry and exit dates, and prices.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  // Extract and validate trade information for the chart
  const symbol = trade.symbol || trade.instrument || 'UNKNOWN'
  const entryTime = new Date(trade.entryDate)
  const exitTime = new Date(trade.closeDate)

  // Validate dates
  if (isNaN(entryTime.getTime()) || isNaN(exitTime.getTime())) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Invalid trade dates. Please check the entry and exit dates.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const entryPrice = parseFloat(trade.entryPrice)
  const exitPrice = parseFloat(trade.closePrice)

  // Validate prices
  if (isNaN(entryPrice) || isNaN(exitPrice)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Invalid trade prices. Please check the entry and exit prices.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const side = trade.side?.toUpperCase() || 'LONG'

  // Calculate appropriate timeframe for the chart
  const timeDiff = exitTime.getTime() - entryTime.getTime()

  // Handle edge case where entry is after exit
  if (timeDiff <= 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
            <DialogDescription>
              Entry time must be before exit time.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    )
  }

  const hours = timeDiff / (1000 * 60 * 60)

  let interval = '5' // Default 5 minutes
  if (hours < 1) {
    interval = '1' // 1 minute for very short trades (< 1 hour)
  } else if (hours < 4) {
    interval = '5' // 5 minutes for short trades (< 4 hours)
  } else if (hours < 24) {
    interval = '15' // 15 minutes for medium trades (< 24 hours)
  } else if (hours < 72) {
    interval = '60' // 1 hour for longer trades (< 72 hours)
  } else {
    interval = 'D' // Daily for very long trades (72+ hours)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            Trade Chart: {symbol} ({side})
          </DialogTitle>
          <DialogDescription>
            Entry: {entryTime.toLocaleString()} | Exit: {exitTime.toLocaleString()} |
            Entry Price: {entryPrice.toFixed(5)} | Exit Price: {exitPrice.toFixed(5)} |
            P&L: {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <TradingViewWidget
            symbol={symbol}
            height={600}
            onSymbolChange={() => {}}
            showControls={false}
            tradeData={{
              entryTime,
              exitTime,
              entryPrice,
              exitPrice,
              side,
              pnl: trade.pnl
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default TradeChartModal
