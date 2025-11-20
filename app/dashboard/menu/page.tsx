'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MoreVertical, Eye, Pencil, Trash2, FileText, TestTube } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
}

export default function MenuPage() {
  const [models, setModels] = useState<TradingModel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add')
  const [selectedModel, setSelectedModel] = useState<TradingModel | null>(null)
  const [deleteModelId, setDeleteModelId] = useState<string | null>(null)
  const [viewModel, setViewModel] = useState<TradingModel | null>(null)
  
  // Temporary: TradingView embed test
  const [showTVTest, setShowTVTest] = useState(false)
  const [tvUrl, setTvUrl] = useState('https://www.tradingview.com/x/EkNnAJnR/')

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
      console.error(error)
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
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Menu</h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Manage your trading models and strategies
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowTVTest(true)} variant="outline" className="gap-2">
                <TestTube className="h-4 w-4" />
                Test TradingView
              </Button>
              <Button onClick={handleAddModel} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Model
              </Button>
            </div>
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
              <h3 className="text-lg font-semibold mb-2">No trading models yet</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Create your first trading model to organize your trading strategies
              </p>
              <Button onClick={handleAddModel} className="gap-2">
                <Plus className="h-4 w-4" />
                Create First Model
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

      {/* Temporary: TradingView Embed Test */}
      <Dialog open={showTVTest} onOpenChange={setShowTVTest}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>TradingView Chart Embed Test</DialogTitle>
            <DialogDescription>
              Testing if TradingView chart links can be embedded as previews
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="tv-url">TradingView URL</Label>
              <Input
                id="tv-url"
                value={tvUrl}
                onChange={(e) => setTvUrl(e.target.value)}
                placeholder="https://www.tradingview.com/x/..."
                className="mt-1"
              />
            </div>

            {/* Method 1: Direct iframe */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Method 1: Direct iframe</h4>
              <div className="border rounded overflow-hidden" style={{ height: '500px' }}>
                <iframe
                  src={tvUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="TradingView Chart - Method 1"
                />
              </div>
            </div>

            {/* Method 2: Image fallback */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Method 2: As image (snapshot)</h4>
              <div className="border rounded overflow-hidden">
                <img 
                  src={`${tvUrl}snapshot/`}
                  alt="TradingView Chart Snapshot"
                  className="w-full"
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESnapshot not available%3C/text%3E%3C/svg%3E'
                  }}
                />
              </div>
            </div>

            {/* Method 3: Embed widget */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Method 3: With embed parameter</h4>
              <div className="border rounded overflow-hidden" style={{ height: '500px' }}>
                <iframe
                  src={`${tvUrl}?widget=1`}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title="TradingView Chart - Method 3"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
