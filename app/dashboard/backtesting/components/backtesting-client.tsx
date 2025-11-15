'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BacktestCard } from './backtest-card'
import { AddBacktestDialog } from './add-backtest-dialog'
import { EditBacktestDialog } from './edit-backtest-dialog'
import { ViewBacktestDialog } from './view-backtest-dialog'
import { AnalyticsTab } from './analytics-tab'
import { BacktestTrade, BacktestStats } from '@/types/backtesting-types'
import { Search, Filter, TrendingUp, BarChart3, Plus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge'

interface BacktestingClientProps {
  initialBacktests: BacktestTrade[]
}

export function BacktestingClient({ initialBacktests }: BacktestingClientProps) {
  const [backtests, setBacktests] = useState<BacktestTrade[]>(initialBacktests)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses' | 'longs' | 'shorts'>('all')
  const [editingBacktest, setEditingBacktest] = useState<BacktestTrade | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingBacktest, setViewingBacktest] = useState<BacktestTrade | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const refreshBacktests = async () => {
    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch('/api/backtesting', {
        signal: controller.signal,
        cache: 'no-cache'
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) throw new Error('Failed to fetch backtests')
      const data = await response.json()
      
      const transformedBacktests: BacktestTrade[] = data.backtests.map((bt: any) => ({
        id: bt.id,
        pair: bt.pair,
        direction: bt.direction,
        outcome: bt.outcome,
        session: bt.session,
        model: bt.model,
        customModel: bt.customModel,
        riskRewardRatio: bt.riskRewardRatio,
        riskPoints: bt.riskPoints,
        rewardPoints: bt.rewardPoints,
        entryPrice: bt.entryPrice,
        stopLoss: bt.stopLoss,
        takeProfit: bt.takeProfit,
        exitPrice: bt.exitPrice,
        pnl: bt.pnl,
        images: [
          bt.imageOne,
          bt.imageTwo,
          bt.imageThree,
          bt.imageFour,
          bt.imageFive,
          bt.imageSix,
        ].filter(Boolean),
        cardPreviewImage: bt.cardPreviewImage,
        notes: bt.notes,
        tags: bt.tags,
        dateExecuted: new Date(bt.dateExecuted),
        backtestDate: bt.backtestDate ? new Date(bt.backtestDate) : undefined,
        createdAt: new Date(bt.createdAt),
        updatedAt: new Date(bt.updatedAt),
      }))

      setBacktests(transformedBacktests)
    } catch (err) {
      // Only show error toast if it's not an abort error
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error('Failed to load backtests')
      }
    }
  }

  const stats: BacktestStats = useMemo(() => {
    const totalBacktests = backtests.length
    const wins = backtests.filter(b => b.outcome === 'WIN')
    const losses = backtests.filter(b => b.outcome === 'LOSS')
    const breakeven = backtests.filter(b => b.outcome === 'BREAKEVEN')
    const winRate = totalBacktests > 0 ? (wins.length / totalBacktests) * 100 : 0
    const totalPnL = backtests.reduce((sum, b) => sum + (b.pnl || 0), 0)
    const averageRR = backtests.filter(b => b.riskRewardRatio).length > 0
      ? backtests.filter(b => b.riskRewardRatio).reduce((sum, b) => sum + (b.riskRewardRatio || 0), 0) / backtests.filter(b => b.riskRewardRatio).length
      : 0
    
    const pnls = backtests.map(b => b.pnl || 0)
    const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0
    const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0

    return {
      totalBacktests,
      winRate: Math.round(winRate * 10) / 10,
      averageRR: Math.round(averageRR * 10) / 10,
      totalPnL: Math.round(totalPnL * 100) / 100,
      bestTrade: Math.round(bestTrade * 100) / 100,
      worstTrade: Math.round(worstTrade * 100) / 100,
      winCount: wins.length,
      lossCount: losses.length,
      breakevenCount: breakeven.length,
    }
  }, [backtests])

  const filteredBacktests = useMemo(() => {
    return backtests.filter(backtest => {
      const matchesSearch = searchTerm === '' ||
        backtest.pair?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        backtest.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        backtest.customModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        backtest.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesFilter = 
        filterBy === 'all' ||
        (filterBy === 'wins' && backtest.outcome === 'WIN') ||
        (filterBy === 'losses' && backtest.outcome === 'LOSS') ||
        (filterBy === 'longs' && backtest.direction === 'BUY') ||
        (filterBy === 'shorts' && backtest.direction === 'SELL')

      return matchesSearch && matchesFilter
    })
  }, [backtests, searchTerm, filterBy])

  const handleView = (backtest: BacktestTrade) => {
    setViewingBacktest(backtest)
    setIsViewDialogOpen(true)
  }

  const handleEdit = (backtest: BacktestTrade) => {
    setEditingBacktest(backtest)
    setIsEditDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/backtesting?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete backtest')

      toast.success('Backtest deleted successfully')
      await refreshBacktests()
    } catch (error) {
      toast.error('Failed to delete backtest')
    }
  }

  return (
    <div className="w-full max-w-full py-6 px-4 sm:px-6 space-y-6">
      <Tabs defaultValue="backtests" className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Backtesting</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base truncate">
              Track and analyze your paper trades
            </p>
          </div>
          <TabsList className="grid w-full sm:w-fit grid-cols-2 flex-shrink-0">
            <TabsTrigger value="backtests" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Backtests</span>
              <span className="sm:hidden">Tests</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="backtests" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by pair, model, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    {filterBy === 'all' ? 'All' : filterBy === 'wins' ? 'Wins' : filterBy === 'losses' ? 'Losses' : filterBy === 'longs' ? 'Longs' : 'Shorts'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setFilterBy('all')}>
                    All Backtests
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy('wins')}>
                    Wins Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy('losses')}>
                    Losses Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy('longs')}>
                    Longs Only
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterBy('shorts')}>
                    Shorts Only
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Backtest
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.totalBacktests}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{stats.winRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Total Points/Pips</p>
                <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Avg R:R</p>
                <p className="text-2xl font-bold">1:{stats.averageRR.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          {filteredBacktests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No backtests found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || filterBy !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Get started by adding your first backtest'}
                </p>
                {!searchTerm && filterBy === 'all' && (
                  <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Backtest
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {filteredBacktests.map((backtest) => (
                  <motion.div
                    key={backtest.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <BacktestCard
                      backtest={backtest}
                      onView={() => handleView(backtest)}
                      onEdit={() => handleEdit(backtest)}
                      onDelete={() => handleDelete(backtest.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsTab backtests={backtests} />
        </TabsContent>
      </Tabs>

      <AddBacktestDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={async (backtestData) => {
          try {
            const response = await fetch('/api/backtesting', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(backtestData),
            })

            if (!response.ok) throw new Error('Failed to create backtest')

            // Close dialog immediately after successful POST
            setIsAddDialogOpen(false)
            
            // Show success toast
            toast.success('Backtest added successfully')
            
            // Refresh in background with small delay to ensure UI is smooth
            setTimeout(async () => {
              await refreshBacktests()
            }, 100)
          } catch (error) {
            toast.error('Failed to create backtest')
            throw error // Re-throw to prevent dialog close on error
          }
        }}
      />

      {editingBacktest && (
        <EditBacktestDialog
          backtest={editingBacktest}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false)
            setEditingBacktest(null)
          }}
          onSave={async () => {
            await refreshBacktests()
            setIsEditDialogOpen(false)
            setEditingBacktest(null)
          }}
        />
      )}

      {viewingBacktest && (
        <ViewBacktestDialog
          backtest={viewingBacktest}
          isOpen={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false)
            setViewingBacktest(null)
          }}
        />
      )}
    </div>
  )
}

