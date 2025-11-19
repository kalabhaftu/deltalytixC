'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Trade } from '@prisma/client'
import { TrendingUp, TrendingDown, Calendar, Clock, Target, DollarSign, MoreHorizontal, Eye, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatQuantity, formatTradeData, formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TradeCardProps {
  trade: Trade
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
}

export function TradeCard({ trade, onClick, onEdit, onDelete, onView }: TradeCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isWin = trade.pnl >= 0
  const hasPreviewImage = (trade as any).cardPreviewImage

  // Get status variant based on PnL (matching account card patterns)
  const getStatusVariant = (pnl: number): "default" | "secondary" | "destructive" | "outline" => {
    if (pnl > 0) return 'default' // WIN
    if (pnl < 0) return 'destructive' // LOSS
    return 'outline' // BREAK EVEN
  }

  // Calculate R:R ratio and detect incomplete data
  const calculateRiskRewardRatio = (trade: Trade): { ratio: number; hasIncompleteData: boolean } => {
    // Parse prices from strings
    const entryPrice = parseFloat(String(trade.entryPrice))
    const closePrice = parseFloat(String(trade.closePrice))
    
    // Get stop loss and take profit from database fields
    const stopLossRaw = (trade as any).stopLoss || null
    const takeProfitRaw = (trade as any).takeProfit || null
    
    // Parse and validate stop loss and take profit (skip if 0.00 or null)
    const stopLoss = stopLossRaw && parseFloat(stopLossRaw.toString()) !== 0 ? parseFloat(stopLossRaw.toString()) : null
    const takeProfit = takeProfitRaw && parseFloat(takeProfitRaw.toString()) !== 0 ? parseFloat(takeProfitRaw.toString()) : null
    
    const side = trade.side?.toUpperCase()
    const isWin = trade.pnl > 0

    // Check for incomplete data
    const hasIncompleteData = !entryPrice || !closePrice || !stopLoss || !side

    // Need all required fields for calculation
    if (hasIncompleteData) {
      // Fallback to TradeAnalytics if available
      const analyticsRR = (trade as any).tradeAnalytics?.riskRewardRatio
      if (analyticsRR && analyticsRR > 0) {
        return { ratio: analyticsRR, hasIncompleteData: false }
      }
      return { ratio: 0.00, hasIncompleteData: true } // 0.00 indicates missing data (1:1 is real data!)
    }

    let potentialRisk: number
    let potentialReward: number

    if (side === 'BUY' || side === 'LONG') {
      // Risk = Entry Price - Stop Loss
      potentialRisk = entryPrice - stopLoss
      
      // Reward calculation depends on win/loss:
      // WINS: Use actual close price (what trader actually captured)
      // LOSSES: Use planned TP (shows setup quality, avoid negative RR)
      if (isWin) {
        potentialReward = closePrice - entryPrice  // ✅ Actual reward captured
      } else {
        // For losses, use planned TP if available, otherwise use close
        potentialReward = takeProfit ? (takeProfit - entryPrice) : Math.abs(closePrice - entryPrice)
      }
    } else if (side === 'SELL' || side === 'SHORT') {
      // Risk = Stop Loss - Entry Price
      potentialRisk = stopLoss - entryPrice
      
      // Reward calculation depends on win/loss:
      // WINS: Use actual close price (what trader actually captured)
      // LOSSES: Use planned TP (shows setup quality, avoid negative RR)
      if (isWin) {
        potentialReward = entryPrice - closePrice  // ✅ Actual reward captured
      } else {
        // For losses, use planned TP if available, otherwise use close
        potentialReward = takeProfit ? (entryPrice - takeProfit) : Math.abs(entryPrice - closePrice)
      }
    } else {
      return { ratio: 0.00, hasIncompleteData: true } // Unknown side
    }

    // Ensure risk and reward are positive (invalid setup returns 0.00)
    if (potentialRisk <= 0 || potentialReward <= 0) {
      return { ratio: 0.00, hasIncompleteData: true } // Invalid calculation
    }

    // R:R = Potential Reward ÷ Potential Risk
    const rrRatio = potentialReward / potentialRisk
    
    // Return calculated R:R, capped at reasonable maximum (99.99)
    return { ratio: Math.min(rrRatio, 99.99), hasIncompleteData: false }
  }

  const rrResult = calculateRiskRewardRatio(trade)
  const rrRatio = rrResult.ratio
  const hasIncompleteRRData = rrResult.hasIncompleteData
  const duration = trade.timeInPosition || 0

  const formatDuration = (timeInPosition: number) => {
    const hours = Math.floor(timeInPosition / 3600)
    const minutes = Math.floor((timeInPosition % 3600) / 60)
    const seconds = Math.floor(timeInPosition % 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    } else {
      return `${seconds}s`
    }
  }

  // Check if this is a grouped trade with partials
  const hasPartials = (trade as any).isGrouped || (trade as any).partialTrades?.length > 1
  const partialCount = (trade as any).partialTrades?.length || 1

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 h-full flex flex-col w-full max-w-full overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-muted-foreground rounded-full flex-shrink-0" />
              <h3 className="font-semibold text-foreground truncate">
                {trade.instrument}
              </h3>
              {hasPartials && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-1 shrink-0">
                  {partialCount}x
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {trade.accountNumber ? `Account: ${trade.accountNumber}` : 'No Account'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={getStatusVariant(trade.pnl)} className="text-xs whitespace-nowrap">
              {isWin ? 'WIN' : 'LOSS'}
            </Badge>
            {(trade as any).tradingModel && (
              <Badge variant="secondary" className="text-xs whitespace-nowrap hidden sm:inline-flex">
                {(trade as any).tradingModel}
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onView}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Trade
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Trade
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Preview Image */}
        <div className="relative aspect-video overflow-hidden bg-muted rounded-lg">
          {hasPreviewImage ? (
            <>
              <Image
                src={(trade as any).cardPreviewImage}
                alt={`Trade ${trade.instrument} ${trade.side}`}
                fill
                className="object-cover"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                unoptimized
              />
              {!imageLoaded && !imageError && (
                <div className="absolute inset-0 animate-pulse bg-muted" />
              )}
              {imageError && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <div className="text-muted-foreground text-sm">Image not available</div>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
              <div className="text-muted-foreground text-sm">No preview image</div>
            </div>
          )}
        </div>

        {/* Trade Information */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">P&L</p>
            <div className="flex items-center gap-1">
              {isWin ? <TrendingUp className="h-3 w-3 text-green-600 flex-shrink-0" /> : <TrendingDown className="h-3 w-3 text-red-600 flex-shrink-0" />}
              <p className={`font-semibold truncate ${isWin ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(trade.pnl)}
              </p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Quantity</p>
            <p className="font-semibold text-foreground truncate">
              {formatTradeData(trade).quantityWithUnit}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
            <p className="font-semibold text-foreground text-sm truncate">
              {formatPrice(trade.entryPrice, trade.instrument)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Exit Price</p>
            <p className="font-semibold text-foreground text-sm truncate">
              {formatPrice(trade.closePrice, trade.instrument)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Side</p>
            <Badge variant="outline" className="text-xs w-fit">
              {trade.side || 'N/A'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Date</p>
            <p className="font-semibold text-foreground text-sm truncate">
              {new Date(trade.entryDate).toLocaleDateString()}
            </p>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-muted-foreground">R:R</p>
              {hasIncompleteRRData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Trade has incomplete SL or TP data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="font-semibold text-foreground text-sm truncate">
              {hasIncompleteRRData ? '-' : rrRatio.toFixed(2)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Duration</p>
            <p className="font-semibold text-foreground text-sm truncate">{formatDuration(duration)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
