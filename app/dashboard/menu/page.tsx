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

interface TradingModel {
  id: string
  name: string
  rules: string[]
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
  }
}

export default function MenuPage() {
  const [models, setModels] = useState<TradingModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedModel, setSelectedModel] = useState<TradingModel | null>(null)
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)
  const [viewModel, setViewModel] = useState<TradingModel | null>(null)

  // Fetch models
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

  // Handle add model
  const handleAddModel = () => {
    setModalMode('add')
    setSelectedModel(null)
    setIsModalOpen(true)
  }

  // Handle edit model
  const handleEditModel = (model: TradingModel) => {
    setModalMode('edit')
    setSelectedModel(model)
    setIsModalOpen(true)
  }

  // Handle save model
  const handleSaveModel = async (data: { name: string; rules: string[]; notes?: string }) => {
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

  // Handle delete model
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

      const result = await response.json()
      toast.success(result.message || 'Model deleted successfully')
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Trading Playbook</h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Document your setups, rules, and strategies here
              </p>
            </div>
            <Button onClick={handleAddModel} className="gap-2">
              <Plus className="h-4 w-4" />
              New Entry
            </Button>
          </div>
        </div>

        {/* Models Grid */}
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : models.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to build your playbook?</h3>
              <p className="text-sm text-muted-foreground text-center mb-4 max-w-md">
                This is where you document the setups that work for you. Add your first entry and start tracking what makes you profitable!
              </p>
              <Button onClick={handleAddModel} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => (
              <Card key={model.id} className="group relative hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{model.name}</CardTitle>
                      <div className="text-sm text-muted-foreground mt-1">
                        {model.rules.length > 0 ? (
                          <>
                            <Badge variant="secondary" className="mr-1">
                              {model.rules.length} {model.rules.length === 1 ? 'rule' : 'rules'}
                            </Badge>
                          </>
                        ) : (
                          <span className="text-xs">No rules</span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewModel(model)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditModel(model)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteModelId(model.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {model.rules.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Rules:</p>
                      <div className="flex flex-wrap gap-1">
                        {model.rules.slice(0, 3).map((rule, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {rule}
                          </Badge>
                        ))}
                        {model.rules.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{model.rules.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {model.notes && (
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {model.notes}
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${(model.stats?.winRate || 0) >= 50 ? 'text-green-500' :
                          (model.stats?.winRate || 0) > 0 ? 'text-yellow-500' : 'text-muted-foreground'
                          }`}>
                          {model.stats?.winRate?.toFixed(1) || '0.0'}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({model.stats?.tradeCount || 0})
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Total PnL</p>
                      <span className={`text-lg font-bold ${(model.stats?.totalPnL || 0) > 0 ? 'text-green-500' :
                        (model.stats?.totalPnL || 0) < 0 ? 'text-red-500' : 'text-muted-foreground'
                        }`}>
                        ${model.stats?.totalPnL?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trading Model</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this model? Trades using this model will no longer reference it.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteModel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Model Dialog */}
      <AlertDialog open={!!viewModel} onOpenChange={() => setViewModel(null)}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{viewModel?.name}</AlertDialogTitle>
            <AlertDialogDescription>Model details and information</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {viewModel?.rules && viewModel.rules.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Rules ({viewModel.rules.length})</h4>
                <div className="flex flex-wrap gap-2">
                  {viewModel.rules.map((rule, index) => (
                    <Badge key={index} variant="secondary">
                      {rule}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {viewModel?.notes && (
              <div>
                <h4 className="text-sm font-medium mb-2">Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {viewModel.notes}
                </p>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              <p>Created: {new Date(viewModel?.createdAt || '').toLocaleDateString()}</p>
              <p>Last updated: {new Date(viewModel?.updatedAt || '').toLocaleDateString()}</p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setViewModel(null)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
