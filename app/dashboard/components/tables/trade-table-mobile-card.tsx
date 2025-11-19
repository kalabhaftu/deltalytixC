'use client'

import React from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { cn, formatCurrency, parsePositionTime, formatNumber, formatPrice } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Edit, Eye, ChevronDown, ChevronRight, BarChart3 } from 'lucide-react'
import { ExtendedTrade } from './trade-table-review'

interface TradeTableMobileCardProps {
  trade: ExtendedTrade
  timezone: string
  isSelected: boolean
  isExpanded: boolean
  canExpand: boolean
  onToggleSelect: () => void
  onToggleExpand: () => void
  onViewDetails: () => void
  onEdit: () => void
  onViewChart: () => void
}

export function TradeTableMobileCard({
  trade,
  timezone,
  isSelected,
  isExpanded,
  canExpand,
  onToggleSelect,
  onToggleExpand,
  onViewDetails,
  onEdit,
  onViewChart,
}: TradeTableMobileCardProps) {
  const entryDateFormatted = formatInTimeZone(
    new Date(trade.entryDate),
    timezone,
    'MMM d, yyyy HH:mm'
  )

  const closeDateFormatted = trade.closeDate
    ? formatInTimeZone(new Date(trade.closeDate), timezone, 'MMM d, yyyy HH:mm')
    : 'Open'

  const isProfitable = trade.pnl >= 0
  const positionTime = parsePositionTime(trade.timeInPosition)

  return (
    <div
      className={cn(
        "border rounded-lg p-4 space-y-3 transition-all",
        isSelected && "ring-2 ring-primary",
        canExpand && "bg-muted/30",
        isExpanded && "bg-muted/50"
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            className="mt-1"
          />
          {canExpand && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleExpand}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-base">{trade.instrument}</span>
              <Badge variant={trade.side === 'BUY' ? 'default' : 'destructive'} className="text-xs">
                {trade.side}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{trade.accountNumber}</p>
          </div>
        </div>
        <div className="text-right">
          <div className={cn(
            "font-bold text-lg",
            isProfitable ? "text-green-600" : "text-red-600"
          )}>
            {formatCurrency(trade.pnl)}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs">Entry</p>
          <p className="font-medium">{entryDateFormatted}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Exit</p>
          <p className="font-medium">{closeDateFormatted}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Entry Price</p>
          <p className="font-medium">{formatPrice(trade.entryPrice, trade.instrument)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Exit Price</p>
          <p className="font-medium">{formatPrice(trade.closePrice, trade.instrument)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Size</p>
          <p className="font-medium">{trade.quantity ? formatNumber(trade.quantity) : 'N/A'}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Duration</p>
          <p className="font-medium">{positionTime}</p>
        </div>
        {trade.commission !== 0 && (
          <div>
            <p className="text-muted-foreground text-xs">Commission</p>
            <p className="font-medium">{formatCurrency(trade.commission)}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
          className="flex-1"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex-1"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        {(trade as any).imageBase64 && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewChart}
            className="flex-1"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Chart
          </Button>
        )}
      </div>

      {/* Expanded Content - Show child trades */}
      {isExpanded && trade.trades && trade.trades.length > 0 && (
        <div className="pl-6 pt-3 border-t space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Grouped Trades ({trade.trades.length})
          </p>
          {trade.trades.map((childTrade, idx) => (
            <div key={idx} className="text-xs border-l-2 border-muted-foreground/30 pl-3 py-1">
              <div className="flex justify-between">
                <span>{childTrade.instrument}</span>
                <span className={cn(
                  "font-semibold",
                  childTrade.pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(childTrade.pnl)}
                </span>
              </div>
              <p className="text-muted-foreground">
                {formatInTimeZone(new Date(childTrade.entryDate), timezone, 'MMM d, HH:mm')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

