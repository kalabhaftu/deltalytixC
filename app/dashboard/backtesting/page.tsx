'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BacktestCard } from './components/backtest-card'
import { AddBacktestDialog } from './components/add-backtest-dialog'
import { EditBacktestDialog } from './components/edit-backtest-dialog'
import { ViewBacktestDialog } from './components/view-backtest-dialog'
import { AnalyticsTab } from './components/analytics-tab'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge'

export default function BacktestingPage() {
  const [backtests, setBacktests] = useState<BacktestTrade[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBy, setFilterBy] = useState<'all' | 'wins' | 'losses' | 'longs' | 'shorts'>('all')
  const [editingBacktest, setEditingBacktest] = useState<BacktestTrade | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [viewingBacktest, setViewingBacktest] = useState<BacktestTrade | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch backtests on mount
  useEffect(() => {
    fetchBacktests()
  }, [])

  const fetchBacktests = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/backtesting')
      
      if (!response.ok) {
        throw new Error('Failed to fetch backtests')
      }

      const data = await response.json()
      
      // Transform DB data to match BacktestTrade interface
      const transformedBacktests: BacktestTrade[] = data.backtests.map((bt: any) => ({
        id: bt.id,
        pair: bt.pair,
        direction: bt.direction,
        outcome: bt.outcome,
        session: bt.session,
        model: bt.model,
        customModel: bt.customModel,
        riskRewardRatio: bt.riskRewardRatio,
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
      console.error('Error fetching backtests:', err)
      setError(err instanceof Error ? err.message : 'Failed to load backtests')
      toast.error('Failed to load backtests')
    } finally {
      setLoading(false)
    }
  }

  // Calculate statistics
  const stats: BacktestStats = useMemo(() => {
    const totalBacktests = backtests.length
    const wins = backtests.filter(b => b.outcome === 'WIN')
    const losses = backtests.filter(b => b.outcome === 'LOSS')
    const breakevens = backtests.filter(b => b.outcome === 'BREAKEVEN')
    
    const winRate = totalBacktests > 0 ? (wins.length / totalBacktests) * 100 : 0
    const averageRR = backtests.reduce((sum, b) => sum + b.riskRewardRatio, 0) / totalBacktests || 0
    const totalPnL = backtests.reduce((sum, b) => sum + b.pnl, 0)
    const bestTrade = Math.max(...backtests.map(b => b.pnl), 0)
    const worstTrade = Math.min(...backtests.map(b => b.pnl), 0)

    return {
      totalBacktests,
      winRate,
      averageRR,
      totalPnL,
      bestTrade,
      worstTrade,
      winCount: wins.length,
      lossCount: losses.length,
      breakevenCount: breakevens.length,
    }
  }, [backtests])

  // Filter backtests
  const filteredBacktests = useMemo(() => {
    let filtered = backtests

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(backtest => {
        const pairMatch = backtest.pair?.toLowerCase().includes(lowerSearchTerm)
        const directionMatch = backtest.direction?.toLowerCase().includes(lowerSearchTerm)
        const modelMatch = backtest.model?.toLowerCase().includes(lowerSearchTerm)
        const sessionMatch = backtest.session?.toLowerCase().includes(lowerSearchTerm)
        const tagsMatch = backtest.tags?.some(tag => tag.toLowerCase().includes(lowerSearchTerm))

        return pairMatch || directionMatch || modelMatch || sessionMatch || tagsMatch
      })
    }

    switch (filterBy) {
      case 'wins':
        filtered = filtered.filter(b => b.outcome === 'WIN')
        break
      case 'losses':
        filtered = filtered.filter(b => b.outcome === 'LOSS')
        break
      case 'longs':
        filtered = filtered.filter(b => b.direction === 'BUY')
        break
      case 'shorts':
        filtered = filtered.filter(b => b.direction === 'SELL')
        break
    }

    return filtered.sort((a, b) => 
      new Date(b.dateExecuted).getTime() - new Date(a.dateExecuted).getTime()
    )
  }, [backtests, searchTerm, filterBy])

  // Handle backtest actions
  const handleDeleteBacktest = async (backtestId: string) => {
    try {
      const response = await fetch(`/api/backtesting?id=${backtestId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete backtest')
      }

      setBacktests(prev => prev.filter(b => b.id !== backtestId))
      toast.success('Backtest deleted successfully')
    } catch (error) {
      console.error('Error deleting backtest:', error)
      toast.error('Failed to delete backtest')
    }
  }

  const handleEditBacktest = (backtest: BacktestTrade) => {
    setEditingBacktest(backtest)
    setIsEditDialogOpen(true)
  }

  const handleSaveBacktest = async (updatedBacktest: Partial<BacktestTrade>) => {
    if (!editingBacktest) return
    
    try {
      const response = await fetch('/api/backtesting', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingBacktest.id,
          ...updatedBacktest
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update backtest')
      }

      const { backtest } = await response.json()
      
      // Transform and update local state
      const transformedBacktest: BacktestTrade = {
        ...editingBacktest,
        ...updatedBacktest,
        id: backtest.id,
        updatedAt: new Date(backtest.updatedAt),
      }

      setBacktests(prev => prev.map(b => 
        b.id === editingBacktest.id ? transformedBacktest : b
      ))
      
      setIsEditDialogOpen(false)
      setEditingBacktest(null)
    } catch (error) {
      console.error('Error updating backtest:', error)
      toast.error('Failed to update backtest')
    }
  }

  const handleViewBacktest = (backtest: BacktestTrade) => {
    setViewingBacktest(backtest)
    setIsViewDialogOpen(true)
  }

  const handleAddBacktest = async (backtestData: any) => {
    try {
      const response = await fetch('/api/backtesting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backtestData)
      })

      if (!response.ok) {
        throw new Error('Failed to create backtest')
      }

      const { backtest } = await response.json()
      
      // Transform DB data to BacktestTrade
      const transformedBacktest: BacktestTrade = {
        id: backtest.id,
        pair: backtest.pair,
        direction: backtest.direction,
        outcome: backtest.outcome,
        session: backtest.session,
        model: backtest.model,
        customModel: backtest.customModel,
        riskRewardRatio: backtest.riskRewardRatio,
        entryPrice: backtest.entryPrice,
        stopLoss: backtest.stopLoss,
        takeProfit: backtest.takeProfit,
        exitPrice: backtest.exitPrice,
        pnl: backtest.pnl,
        images: [
          backtest.imageOne,
          backtest.imageTwo,
          backtest.imageThree,
          backtest.imageFour,
          backtest.imageFive,
          backtest.imageSix,
        ].filter(Boolean),
        cardPreviewImage: backtest.cardPreviewImage,
        notes: backtest.notes,
        tags: backtest.tags,
        dateExecuted: new Date(backtest.dateExecuted),
        backtestDate: backtest.backtestDate ? new Date(backtest.backtestDate) : undefined,
        createdAt: new Date(backtest.createdAt),
        updatedAt: new Date(backtest.updatedAt),
      }

      setBacktests(prev => [transformedBacktest, ...prev])
      toast.success('Backtest added successfully!')
      setIsAddDialogOpen(false) // Close dialog on success
    } catch (error) {
      console.error('Error adding backtest:', error)
      toast.error('Failed to add backtest')
      throw error // Re-throw so the form knows it failed
    }
  }

  return (
    <motion.div
      className="w-full p-6 space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backtesting Lab</h1>
          <p className="text-muted-foreground mt-1">
            Test and validate your trading strategies with historical data
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Backtest
        </Button>
      </div>

      {/* Stats Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Backtests</p>
                <p className="text-2xl font-bold">{stats.totalBacktests}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">{stats.winRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{stats.winCount}W / {stats.lossCount}L</p>
              </div>
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg R:R</p>
                <p className="text-2xl font-bold">1:{stats.averageRR.toFixed(2)}</p>
              </div>
              <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                <span className="text-muted-foreground font-bold">R</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total P&L</p>
                <p className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  ${stats.totalPnL.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Best: ${stats.bestTrade.toFixed(0)} / Worst: ${stats.worstTrade.toFixed(0)}
                </p>
              </div>
              <div className="w-8 h-8 text-muted-foreground">
                $
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="view" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="view">View Backtests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* View Backtests Tab */}
        <TabsContent value="view" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search pairs, models, sessions, tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter: {filterBy === 'all' ? 'All' : filterBy === 'wins' ? 'Wins' : filterBy === 'losses' ? 'Losses' : filterBy === 'longs' ? 'Longs' : 'Shorts'}
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

            <div className="text-sm text-muted-foreground">
              {filteredBacktests.length} backtest{filteredBacktests.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Backtests Grid */}
          <div className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <Skeleton className="aspect-video w-full" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBacktests.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchTerm ? 'No backtests found' : 'No backtests yet'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? 'Try adjusting your search terms or filters'
                    : 'Start adding backtests to validate your trading strategies'
                  }
                </p>
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                layout
              >
                <AnimatePresence>
                  {filteredBacktests.map((backtest) => (
                    <BacktestCard
                      key={backtest.id}
                      backtest={backtest}
                      onView={() => handleViewBacktest(backtest)}
                      onEdit={() => handleEditBacktest(backtest)}
                      onDelete={() => handleDeleteBacktest(backtest.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
    </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <AnalyticsTab backtests={backtests} />
        </TabsContent>
      </Tabs>

      {/* View Backtest Dialog */}
      <ViewBacktestDialog
        isOpen={isViewDialogOpen}
        onClose={() => setIsViewDialogOpen(false)}
        backtest={viewingBacktest}
      />

      {/* Edit Backtest Dialog */}
      <EditBacktestDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false)
          setEditingBacktest(null)
        }}
        backtest={editingBacktest}
        onSave={handleSaveBacktest}
      />

      {/* Add Backtest Dialog */}
      <AddBacktestDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddBacktest}
      />
    </motion.div>
  )
}
