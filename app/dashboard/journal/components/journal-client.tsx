'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TradeCard } from './trade-card'
import { Trade } from '@/types/trade-types'
import { Search, Filter, AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface JournalClientProps {
  initialTrades: Trade[]
}

export function JournalClient({ initialTrades }: JournalClientProps) {
  const router = useRouter()
  const [trades, setTrades] = useState<Trade[]>(initialTrades)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses' | 'buys' | 'sells'>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      const matchesSearch = searchTerm === '' ||
        trade.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trade.instrument?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'wins' && trade.pnl > 0) ||
        (filterBy === 'losses' && trade.pnl < 0) ||
        (filterBy === 'buys' && trade.side?.toUpperCase() === 'BUY') ||
        (filterBy === 'sells' && trade.side?.toUpperCase() === 'SELL')

      return matchesSearch && matchesFilter
    })
  }, [trades, searchTerm, filterBy])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      router.refresh() // Revalidates Server Component data
      toast.success('Refreshed trades')
    } catch (error) {
      toast.error('Failed to refresh')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
          <p className="text-muted-foreground mt-1">
            Review and analyze your trade history
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol, notes, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              {filterBy === 'all' ? 'All' : filterBy === 'wins' ? 'Wins' : filterBy === 'losses' ? 'Losses' : filterBy === 'buys' ? 'Buys' : 'Sells'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilterBy('all')}>
              All Trades
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy('wins')}>
              Wins Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy('losses')}>
              Losses Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy('buys')}>
              Buys Only
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilterBy('sells')}>
              Sells Only
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {filteredTrades.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No trades found</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm || filterBy !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Import trades to get started'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredTrades.map((trade) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <TradeCard trade={trade} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

