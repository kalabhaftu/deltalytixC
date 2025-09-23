'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Trade } from '@prisma/client'
import { TrendingUp, TrendingDown, Calendar, Clock, Target, DollarSign, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
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

  // Calculate R:R ratio from trade analytics if available
  const rrRatio = (trade as any).tradeAnalytics?.riskRewardRatio || 1
  const duration = trade.timeInPosition || 0

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `${hours}h ${remainingMinutes}m`
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
              {trade.quantity} lots
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
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">R:R</span>
            <span className="font-medium">{rrRatio.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Duration</span>
            <span className="font-medium">{formatDuration(duration)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
