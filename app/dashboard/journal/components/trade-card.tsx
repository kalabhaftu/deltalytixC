'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Trade } from '@prisma/client'
import { TrendingUp, TrendingDown, Calendar, Clock, Target, DollarSign, MoreHorizontal, Eye, Edit, Trash2, AlertTriangle } from 'lucide-react'
import { formatCurrency, formatQuantity, formatTradeData } from '@/lib/utils'
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
    // Parse entry price from string
    const entryPrice = parseFloat(trade.entryPrice)
    
    // Get stop loss and take profit from database fields
    const stopLossRaw = (trade as any).stopLoss || null
    const takeProfitRaw = (trade as any).takeProfit || null
    
    // Parse and validate stop loss and take profit (skip if 0.00 or null)
    const stopLoss = stopLossRaw && parseFloat(stopLossRaw.toString()) !== 0 ? parseFloat(stopLossRaw.toString()) : null
    const takeProfit = takeProfitRaw && parseFloat(takeProfitRaw.toString()) !== 0 ? parseFloat(takeProfitRaw.toString()) : null
    
    const side = trade.side?.toUpperCase()

    // Check for incomplete data
    const hasIncompleteData = !entryPrice || !stopLoss || !takeProfit || !side

    // Need all required fields for calculation (entry, stop, take profit, and side)
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
      // For long positions:
      // Risk = Entry Price - Stop Loss
      // Reward = Take Profit - Entry Price
      potentialRisk = entryPrice - stopLoss
      potentialReward = takeProfit - entryPrice
    } else if (side === 'SELL' || side === 'SHORT') {
      // For short positions:
      // Risk = Stop Loss - Entry Price  
      // Reward = Entry Price - Take Profit
      potentialRisk = stopLoss - entryPrice
      potentialReward = entryPrice - takeProfit
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

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 bg-muted-foreground rounded-full flex-shrink-0" />
              <h3 className="font-semibold text-foreground truncate">
                {trade.instrument}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {trade.accountNumber ? `Account: ${trade.accountNumber}` : 'No Account'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(trade.pnl)} className="text-xs">
              {isWin ? 'WIN' : 'LOSS'}
            </Badge>
            {(trade as any).tradingModel && (
              <Badge variant="secondary" className="text-xs">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">P&L</p>
            <div className="flex items-center gap-1">
              {isWin ? <TrendingUp className="h-3 w-3 text-green-600" /> : <TrendingDown className="h-3 w-3 text-red-600" />}
              <p className={`font-semibold ${isWin ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(trade.pnl)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Quantity</p>
            <p className="font-semibold text-foreground">
              {formatTradeData(trade).quantityWithUnit}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Entry Price</p>
            <p className="font-semibold text-foreground">
              {trade.entryPrice}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Exit Price</p>
            <p className="font-semibold text-foreground">
              {trade.closePrice}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Side</p>
            <Badge variant="outline" className="text-xs">
              {trade.side || 'N/A'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Date</p>
            <p className="font-semibold text-foreground">
              {new Date(trade.entryDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <p className="text-xs text-muted-foreground">R:R</p>
              {hasIncompleteRRData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Trade has incomplete SL or TP data</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="font-semibold text-foreground">
              {hasIncompleteRRData ? '-' : rrRatio.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Duration</p>
            <p className="font-semibold text-foreground">{formatDuration(duration)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
