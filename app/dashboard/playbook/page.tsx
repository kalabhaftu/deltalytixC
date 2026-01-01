'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MoreVertical, Eye, Pencil, Trash2, FileText } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AddEditModelModal } from './components/add-edit-model-modal'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils' // Assuming cn utility is imported from here

interface TradingModel {
  id: string
  name: string
  rules: any[]
  notes?: string | null
  createdAt: string
  updatedAt: string
  stats?: {
    tradeCount: number
    totalPnL: number
    winRate: number
    winCount: number
    lossCount: number
    breakEvenCount: number
    avgAdherence: number
    ruleAdherence: Record<string, { followed: number; total: number }>
  }
}

// Dense Strategy Block
function StrategyBlock({
  model,
  onView,
  onEdit,
  onDelete
}: {
  model: TradingModel
  onView: (m: TradingModel) => void
  onEdit: (m: TradingModel) => void
  onDelete: (id: string) => void
}) {
  const winRate = model.stats?.winRate || 0
  const pnl = model.stats?.totalPnL || 0
  const isProfit = pnl >= 0

  return (
    <div className="flex flex-col p-5 bg-muted/20 border border-border/50 rounded-xl hover:bg-muted/30 transition-all group relative">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold tracking-tight truncate">{model.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px] font-black uppercase tracking-tighter border-primary/20 bg-primary/5 text-primary">
              {model.rules.length} Rules Defined
            </Badge>
            <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-widest">
              {model.stats?.tradeCount || 0} Trades logged
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 opacity-40 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-xl border-border/40">
            <DropdownMenuItem onClick={() => onView(model)} className="text-xs font-bold uppercase">
              <Eye className="mr-2 h-3.5 w-3.5" /> View Strategy
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(model)} className="text-xs font-bold uppercase">
              <Pencil className="mr-2 h-3.5 w-3.5" /> Modify Rules
            </DropdownMenuItem>
            <DropdownMenuSeparator className="opacity-40" />
            <DropdownMenuItem onClick={() => onDelete(model.id)} className="text-xs font-bold uppercase text-short focus:text-short">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove Model
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-border/40">
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 block mb-1">Win Rate</span>
          <div className="flex items-baseline gap-1.5">
            <span className={cn(
              "text-xl font-bold tracking-tight",
              winRate >= 50 ? "text-long" : winRate > 0 ? "text-amber-500" : "text-muted-foreground"
            )}>
              {winRate.toFixed(1)}%
            </span>
          </div>
        </div>
        <div>
          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 block mb-1">Total P/L</span>
          <span className={cn(
            "text-xl font-bold tracking-tight",
            isProfit && pnl > 0 ? "text-long" : !isProfit ? "text-short" : "text-muted-foreground"
          )}>
            {isProfit && pnl > 0 ? '+' : ''}${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="col-span-2 md:col-span-1 border-t md:border-t-0 pt-4 md:pt-0">
          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 block mb-1">Adherence</span>
          <span className={cn(
            "text-lg font-bold tracking-tight",
            (model.stats?.avgAdherence || 0) >= 80 ? "text-primary" : (model.stats?.avgAdherence || 0) >= 50 ? "text-amber-500" : "text-short"
          )}>
            {model.stats?.avgAdherence?.toFixed(0) || '0'}%
          </span>
        </div>
      </div>

      {model.notes && (
        <p className="text-[11px] text-muted-foreground/70 mt-4 leading-relaxed line-clamp-2 italic font-medium">
          "{model.notes}"
        </p>
      )}
    </div>
  )
}

export default function PlaybookPage() {
  const [models, setModels] = useState<TradingModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedModel, setSelectedModel] = useState<TradingModel | null>(null)
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)
  const [viewModel, setViewModel] = useState<TradingModel | null>(null)

  const fetchModels = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user/trading-models')
      if (!response.ok) throw new Error('Failed to fetch models')
      const data = await response.json()
      setModels(data.models || [])
    } catch (error) {
      toast.error('Failed to load trading models')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchModels()
  }, [])

  const handleAddModel = () => {
    setModalMode('add')
    setSelectedModel(null)
    setIsModalOpen(true)
  }

  const handleEditModel = (model: TradingModel) => {
    setModalMode('edit')
    setSelectedModel(model)
    setIsModalOpen(true)
  }

  const handleSaveModel = async (data: { name: string; rules: any[]; notes?: string }) => {
    const url = modalMode === 'add'
      ? '/api/user/trading-models'
      : `/api/user/trading-models/${selectedModel?.id}`

    const response = await fetch(url, {
      method: modalMode === 'add' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save model')
    }

    await fetchModels()
  }

  const handleDeleteModel = async () => {
    if (!deleteModelId) return
    try {
      const response = await fetch(`/api/user/trading-models/${deleteModelId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete model')
      }
      toast.success('Model removed from playbook')
      await fetchModels()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete model')
    } finally {
      setDeleteModelId(null)
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 pb-20 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-12 pb-8 border-b border-border/50">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter">STRATEGY PLAYBOOK</h1>
            <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.3em] mt-1 opacity-60">
              Systematic Trading Models • {models.length} Entries
            </p>
          </div>
          <Button onClick={handleAddModel} className="gap-2 font-black uppercase tracking-tighter text-xs h-10 px-6">
            <Plus className="h-4 w-4" />
            Develop New Strategy
          </Button>
        </div>

        {/* Models Grid */}
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl bg-muted/20" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border/40 rounded-3xl bg-muted/5">
            <FileText className="h-12 w-12 text-muted-foreground/20 mb-6" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/50 mb-6">No strategies defined</h3>
            <Button onClick={handleAddModel} variant="outline" className="gap-2 font-black uppercase tracking-tighter text-xs h-9">
              <Plus className="h-3.5 w-3.5" />
              Initialize First Model
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <StrategyBlock
                key={model.id}
                model={model}
                onView={setViewModel}
                onEdit={handleEditModel}
                onDelete={setDeleteModelId}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Add/Edit Model Modal */}
      <AddEditModelModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveModel}
        model={selectedModel}
        mode={modalMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteModelId} onOpenChange={() => setDeleteModelId(null)}>
        <AlertDialogContent className="bg-background/95 backdrop-blur-2xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black uppercase tracking-tighter">Remove Strategy Model</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-bold">
              Confirm removal of this protocol from your playbook. Existing trades will retain their historical validation but will lose the live link to this model.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-black uppercase tracking-tighter text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              className="bg-short text-white hover:bg-short/90 font-black uppercase tracking-tighter text-xs"
            >
              Verify Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Model Dialog */}
      <AlertDialog open={!!viewModel} onOpenChange={() => setViewModel(null)}>
        <AlertDialogContent className="max-w-2xl bg-background/95 backdrop-blur-2xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tighter uppercase">{viewModel?.name}</AlertDialogTitle>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Strategy Performance</span>
                <span className={cn(
                  "text-sm font-bold",
                  (viewModel?.stats?.winRate || 0) >= 50 ? "text-long" : "text-short"
                )}>
                  {viewModel?.stats?.winRate?.toFixed(1) || '0.0'}% Win Rate
                </span>
              </div>
              <div className="w-px h-8 bg-border/40" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Total Profitability</span>
                <span className={cn(
                  "text-sm font-bold",
                  (viewModel?.stats?.totalPnL || 0) >= 0 ? "text-long" : "text-short"
                )}>
                  ${viewModel?.stats?.totalPnL?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </span>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="space-y-6">
            {viewModel?.rules && viewModel.rules.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(['entry', 'exit', 'risk', 'general'] as const).map(cat => {
                  const catRules = viewModel.rules.filter((r: any) =>
                    (typeof r === 'string' && cat === 'general') ||
                    (typeof r === 'object' && r.category === cat)
                  )
                  if (catRules.length === 0) return null

                  return (
                    <div key={cat} className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {cat === 'general' ? 'General' : cat} Protocols
                      </h4>
                      <ul className="space-y-2">
                        {catRules.map((rule: any, i) => {
                          const text = typeof rule === 'string' ? rule : rule.text
                          const adherence = viewModel.stats?.ruleAdherence?.[text]
                          const rate = adherence && adherence.total > 0 ? (adherence.followed / adherence.total) * 100 : 0

                          return (
                            <li key={i} className="flex items-center justify-between group p-2 hover:bg-muted/10 rounded-lg transition-colors">
                              <div className="flex items-start gap-2 max-w-[70%]">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-border shrink-0" />
                                <span className="text-xs font-bold text-muted-foreground/90 leading-tight group-hover:text-foreground">
                                  {text}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-1 w-12 bg-muted/40 rounded-full overflow-hidden">
                                  <div
                                    className={cn("h-full transition-all duration-1000", rate >= 80 ? "bg-primary" : rate >= 50 ? "bg-amber-500" : "bg-short")}
                                    style={{ width: `${rate}%` }}
                                  />
                                </div>
                                <span className={cn(
                                  "text-[9px] font-black tabular-nums min-w-[24px] text-right",
                                  rate >= 80 ? "text-primary" : rate >= 50 ? "text-amber-500" : "text-short"
                                )}>
                                  {rate.toFixed(0)}%
                                </span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}

            {viewModel?.notes && (
              <div className="pt-6 border-t border-border/40">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">Model Analysis & Notes</h4>
                <p className="text-xs text-muted-foreground italic leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/10">
                  "{viewModel.notes}"
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-6 border-t border-border/40 opacity-40">
              <span className="text-[9px] font-black uppercase tracking-widest">Initialization: {new Date(viewModel?.createdAt || '').toLocaleDateString()}</span>
              <span className="text-[9px] font-black uppercase tracking-widest">Last Update: {new Date(viewModel?.updatedAt || '').toLocaleDateString()}</span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setViewModel(null)} className="font-black uppercase tracking-tighter text-xs">
              Close Intelligence
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
