'use client'

import dynamic from 'next/dynamic'
import { useSearchParams, useRouter } from 'next/navigation'
import { useData } from '@/context/data-provider'
import TradeReplay from '../components/trades/trade-replay'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Suspense } from 'react'
import { cn, classifyTrade } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

// Lazy load the trade table component
const TradeTableReview = dynamic(
  () => import('../components/tables/trade-table-review').then(mod => ({ default: mod.TradeTableReview })),
  { ssr: false }
)

function TableView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { formattedTrades = [] } = useData()

  const view = searchParams.get('view')
  const tradeId = searchParams.get('tradeId')

  if (view === 'replay' && tradeId) {
    const trade = formattedTrades.find((t: any) => t.id === tradeId)

    if (trade) {
      const isLong = trade.side?.toLowerCase() === 'long' || trade.side?.toLowerCase() === 'buy'
      const outcome = classifyTrade(trade.pnl)
      const isProfit = outcome === 'win'
      const isLoss = outcome === 'loss'

      return (
        <div className="flex flex-col h-[calc(100vh-120px)] bg-background border border-border/40 rounded-xl overflow-hidden shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 border-b shrink-0 bg-muted/30 backdrop-blur gap-2">
            {/* Left: Back + Symbol */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard/table')}
                className="h-8 px-2 text-xs hover:bg-accent/50"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              <div className="h-4 w-px bg-border/60 hidden sm:block" />
              <h1 className="text-xs font-bold tracking-tight uppercase text-muted-foreground mr-2">
                {trade.instrument}
              </h1>
              <Badge variant={isLong ? 'default' : 'destructive'} className="text-[10px] px-1.5 py-0 h-4 uppercase font-bold">
                {isLong ? 'Buy' : 'Sell'}
              </Badge>
            </div>

            {/* Right: Trade Info - Responsive grid on mobile */}
            <div className="flex items-center gap-3 sm:gap-6 text-[10px] sm:text-xs overflow-x-auto">
              <div className="flex flex-col items-start sm:items-end shrink-0">
                <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-0.5">Entry/Exit</span>
                <span className="font-mono font-medium leading-none">
                  ${Number(trade.entryPrice).toFixed(2)} → ${trade.closePrice ? Number(trade.closePrice).toFixed(2) : 'OPEN'}
                </span>
              </div>
              <div className="flex flex-col items-start sm:items-end shrink-0 hidden xs:flex">
                <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-0.5">Size</span>
                <span className="font-mono font-medium leading-none">{trade.quantity}</span>
              </div>
              <div className="flex flex-col items-start sm:items-end shrink-0">
                <span className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-0.5">P&L</span>
                <span className={cn(
                  "font-mono font-bold leading-none",
                  isProfit ? "text-green-500" : "text-red-500"
                )}>
                  {isProfit ? '+' : ''}${trade.pnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative bg-white">
            <TradeReplay trade={trade} />
          </div>
        </div>
      )
    }
  }

  return <TradeTableReview />
}

function TableLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted/40 rounded" />
        <div className="h-8 w-64 bg-muted/40 rounded" />
      </div>
      <div className="border border-border/40 rounded-3xl overflow-hidden bg-background">
        <div className="h-12 border-b border-border/40 bg-muted/20" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 border-b border-border/30 px-4 py-3 flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-muted/30 rounded" />
              <div className="h-3 w-20 bg-muted/20 rounded" />
            </div>
            <div className="h-8 w-24 bg-muted/30 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TablePage() {
  const searchParams = useSearchParams()
  const isReplay = searchParams.get('view') === 'replay'

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 py-4">
      <Suspense fallback={<TableLoadingSkeleton />}>
        <TableView />
      </Suspense>
    </div>
  )
}
