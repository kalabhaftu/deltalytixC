'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { toast } from 'sonner'
import { Trade } from '@prisma/client'
import { Edit, Camera, X, Target, ChevronDown, AlertTriangle } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useUserStore } from '@/store/user-store'
import { formatCurrency } from '@/lib/utils'
import { DataSerializer } from '@/lib/data-serialization'
import { uploadService } from '@/lib/upload-service'
import { TagSelector } from '@/app/dashboard/components/tags/tag-selector'

// Utility function to format trading model names consistently
const formatModelName = (model: string): string => {
  // Handle special cases for default models
  if (model.includes('ict') || model.includes('ICT')) {
    return 'ICT 2022'
  }
  if (model.includes('msnr') || model === 'MSNR') {
    return 'MSNR'
  }
  if (model.includes('ttfm') || model === 'TTFM') {
    return 'TTFM'
  }
  if (model.includes('price') || model.includes('PRICE')) {
    return 'Price Action'
  }
  
  // For custom models, use proper title case
  return model.split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Utility function to get trading models with proper enum mapping
const getTradingModels = () => {
  const defaultModels = ['ict-2022', 'msnr', 'ttfm', 'price-action']
  const customModels = DataSerializer.getTradingModels()
  return [...defaultModels, ...customModels]
}

// Map string values to TradingModel enum values for database updates
const mapModelToEnum = (model: string) => {
  const enumMap: Record<string, 'ICT_2022' | 'MSNR' | 'TTFM' | 'PRICE_ACTION'> = {
    'ict-2022': 'ICT_2022',
    'msnr': 'MSNR',
    'ttfm': 'TTFM',
    'price-action': 'PRICE_ACTION'
  }

  // For custom models that aren't in the default enum, store as null
  // (or you could extend this to handle custom enums)
  return enumMap[model] || null
}

// Schema for limited editing (only notes, screenshots, links)
const editTradeSchema = z.object({
  comment: z.string().optional(),
  cardPreviewImage: z.string().optional(),
  tradingModel: z.string().nullable().optional(),
  links: z.array(z.string().url()).optional(),
})

type EditTradeFormData = z.infer<typeof editTradeSchema>

interface EnhancedEditTradeProps {
  isOpen: boolean
  onClose: () => void
  trade: Trade | null
  onSave: (updatedTrade: Partial<Trade>) => Promise<void>
}

// File validation helpers
const validateImageFile = (file: File): void => {
  const maxSize = 10 * 1024 * 1024 // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/svg+xml']
  
  if (file.size > maxSize) {
    throw new Error('Image must be smaller than 10MB')
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, WebP, GIF, BMP, and SVG images are allowed')
  }
}

const compressImageForCard = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    try {
      resolve(file)
      // TODO: Implement WebP compression (currently disabled - see upload-service.ts)
    } catch (error) {
      resolve(file)
    }
  })
}

function generateShortId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const DRAFT_KEY_PREFIX = 'trade-edit-draft-'

function saveDraftToLocalStorage(tradeId: string, data: EditTradeFormData) {
  try {
    const key = `${DRAFT_KEY_PREFIX}${tradeId}`
    localStorage.setItem(key, JSON.stringify({
      ...data,
      timestamp: Date.now()
    }))
  } catch (error) {
    // Silent fail
  }
}

function loadDraftFromLocalStorage(tradeId: string): EditTradeFormData | null {
  try {
    const key = `${DRAFT_KEY_PREFIX}${tradeId}`
    const saved = localStorage.getItem(key)
    if (!saved) return null
    
    const parsed = JSON.parse(saved)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    if (parsed.timestamp && parsed.timestamp < sevenDaysAgo) {
      localStorage.removeItem(key)
      return null
    }
    
    return parsed
  } catch (error) {
    return null
  }
}

function clearDraftFromLocalStorage(tradeId: string) {
  try {
    const key = `${DRAFT_KEY_PREFIX}${tradeId}`
    localStorage.removeItem(key)
  } catch (error) {
    // Silent fail
  }
}

export default function EnhancedEditTrade({
  isOpen,
  onClose,
  trade,
  onSave
}: EnhancedEditTradeProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null)
  const [additionalLinks, setAdditionalLinks] = useState<string[]>([])
  const [isTradingModelOpen, setIsTradingModelOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Confirmation dialogs state
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [showDeleteImageDialog, setShowDeleteImageDialog] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<'cardPreviewImage' | null>(null)
  const [pendingClose, setPendingClose] = useState(false)
  
  // Track if form has unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialFormState, setInitialFormState] = useState<EditTradeFormData | null>(null)
  
  // Track if draft was loaded from localStorage
  const [draftLoaded, setDraftLoaded] = useState(false)
  
  const [tradeId] = useState(() => {
    if (trade?.id?.includes('undefined')) {
      return generateShortId()
    }
    return trade?.id?.slice(0, 6) || generateShortId()
  })
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<EditTradeFormData>({
    resolver: zodResolver(editTradeSchema),
    defaultValues: {
      comment: '',
      cardPreviewImage: '',
      tradingModel: '',
    }
  })

  const watchedValues = watch()

  // Initialize form with trade data and load draft if available
  useEffect(() => {
    if (trade && isOpen) {
      // Initialize tags
      const tradeTags = (trade as any)?.tags
      setSelectedTags(tradeTags ? tradeTags.split(',').filter(Boolean) : [])
      
      const defaultFormState: EditTradeFormData = {
        comment: trade.comment || '',
        cardPreviewImage: (trade as any)?.cardPreviewImage || '',
        tradingModel: (trade as any)?.tradingModel || '',
      }
      
      // Try to load draft from localStorage
      const draft = loadDraftFromLocalStorage(trade.id)
      
      if (draft) {
        // Show toast to inform user about draft
        toast.info('Draft found', {
          description: 'Your unsaved changes have been restored.',
          duration: 3000,
        })
        
        // Load draft instead of default
        reset(draft)
        setDraftLoaded(true)
        setHasUnsavedChanges(true)
      } else {
        // No draft, use default
        reset(defaultFormState)
        setDraftLoaded(false)
        setHasUnsavedChanges(false)
      }
      
      // Store initial state for comparison
      setInitialFormState(draft || defaultFormState)
      
      // CRITICAL FIX: Reset fullscreen image state when dialog opens
      setFullscreenImage(null)
    }
    
    // Cleanup when dialog closes
    if (!isOpen) {
      setFullscreenImage(null)
      setHasUnsavedChanges(false)
      setDraftLoaded(false)
      setInitialFormState(null)
    }
  }, [trade, isOpen, reset])
  
  // Auto-save draft to localStorage when form changes
  useEffect(() => {
    if (!trade || !isOpen) return
    
    const subscription = watch((formData) => {
      // Check if form has changes compared to initial state
      if (initialFormState) {
        const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormState)
        setHasUnsavedChanges(hasChanges)
        
        // Auto-save draft if there are changes
        if (hasChanges) {
          saveDraftToLocalStorage(trade.id, formData as EditTradeFormData)
        }
      }
    })
    
    return () => subscription.unsubscribe()
  }, [watch, trade, isOpen, initialFormState])
  
  // Handle browser/tab close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && isOpen) {
        e.preventDefault()
        e.returnValue = '' // Required for Chrome
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges, isOpen])

  const handleImageUpload = async (field: 'cardPreviewImage', file: File) => {
    try {
      validateImageFile(file)
      
      const currentUser = user || supabaseUser
      if (!currentUser?.id) {
        toast.error('Upload failed', { description: 'User not authenticated' })
        return
      }

      // Upload directly to Supabase storage (no base64)
      toast.loading('Uploading image...', { id: `upload-${field}` })
      
      const result = await uploadService.uploadImage(file, {
        userId: currentUser.id,
        folder: 'trades',
        tradeId: trade?.id,
      })
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed')
      }
      
      // Store the storage URL instead of base64
      setValue(field, result.url)
      
      toast.success('Image uploaded', {
        id: `upload-${field}`,
        description: field === 'cardPreviewImage'
          ? 'Card preview uploaded successfully.'
          : 'Analysis image uploaded successfully.',
      })
      
    } catch (error) {
      toast.error('Upload failed', {
        id: `upload-${field}`,
        description: error instanceof Error ? error.message : 'Failed to upload image',
      })
    }
  }

  const removeImage = (field: 'cardPreviewImage') => {
    // Show confirmation dialog before deleting
    setImageToDelete(field)
    setShowDeleteImageDialog(true)
  }
  
  const confirmDeleteImage = () => {
    if (imageToDelete) {
      setValue(imageToDelete, '', { shouldDirty: true }) // Set to empty string to mark for deletion
      toast.success('Image removed', {
        description: 'The image will be deleted when you save changes.'
      })
    }
    setShowDeleteImageDialog(false)
    setImageToDelete(null)
  }

  const addLink = () => {
    setAdditionalLinks(prev => [...prev, ''])
  }

  const updateLink = (index: number, value: string) => {
    setAdditionalLinks(prev => {
      const updated = [...prev]
      updated[index] = value
      return updated
    })
  }

  const removeLink = (index: number) => {
    setAdditionalLinks(prev => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: EditTradeFormData) => {
    if (!trade) return

    setIsSubmitting(true)
    try {
      // Prepare the update data - explicitly handle null values for deleted images
      const updateData = {
        comment: data.comment || null,
        tradingModel: data.tradingModel ? mapModelToEnum(data.tradingModel) : null,
        tags: selectedTags.length > 0 ? selectedTags.join(',') : null,
        cardPreviewImage: data.cardPreviewImage === '' ? null : data.cardPreviewImage || null,
      } as Partial<Trade>

      // Call the save function
      await onSave(updateData)
      
      // Clear draft from localStorage after successful save
      clearDraftFromLocalStorage(trade.id)
      setHasUnsavedChanges(false)
      
      toast.success('Trade updated', {
        description: 'Trade has been successfully updated.',
      })

      onClose()
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to update trade',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Check if there are unsaved changes
    if (hasUnsavedChanges) {
      // Show confirmation dialog
      setPendingClose(true)
      setShowUnsavedChangesDialog(true)
    } else {
      // No unsaved changes, close directly
      performClose()
    }
  }
  
  const performClose = () => {
    reset()
    setHasUnsavedChanges(false)
    setShowUnsavedChangesDialog(false)
    setPendingClose(false)
    onClose()
  }
  
  const discardChanges = () => {
    // Clear draft from localStorage
    if (trade) {
      clearDraftFromLocalStorage(trade.id)
    }
    performClose()
  }

  if (!trade) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] overflow-y-auto z-[10000] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base sm:text-lg">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Edit Trade - {trade.instrument} {trade.side}
            </DialogTitle>
            <DialogDescription>
              Add notes and screenshots to enhance your trade analysis.
              Trade execution details cannot be modified.
            </DialogDescription>
          </DialogHeader>

          {/* Trade Summary (Read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trade Summary (Read-only)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 text-sm">
              <div>
                <Label className="text-sm text-muted-foreground">Date</Label>
                <p className="font-medium">{new Date(trade.entryDate).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">P&L</Label>
                <p className={`font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(trade.pnl)}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Entry → Close</Label>
                <p className="font-medium">{String(trade.entryPrice)} → {String(trade.closePrice)}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Quantity</Label>
                <p className="font-medium">{Number(trade.quantity).toFixed(2)} lots</p>
              </div>
              {/* Close Reason (if available) */}
              {(trade as any).closeReason && (
                <div className="col-span-2">
                  <Label className="text-sm text-muted-foreground">Close Reason</Label>
                  <p className="font-medium capitalize">
                    {(trade as any).closeReason.replace(/[_-]/g, ' ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Trade Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trade Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="comment">Analysis & Reflections</Label>
                  <Textarea
                    {...register('comment')}
                    placeholder="Add your trade analysis and reflections..."
                    className="min-h-[200px] resize-none"
                  />
                  <p className="text-sm text-muted-foreground">
                    Document your analysis, market conditions, and lessons learned from this trade using the rich text editor.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trading Model */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Trading Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Select Trading Model</Label>
                  <Collapsible open={isTradingModelOpen} onOpenChange={setIsTradingModelOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                      >
                        {watchedValues.tradingModel ? formatModelName(watchedValues.tradingModel) : "Select a trading model..."}
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isTradingModelOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      <div className="grid grid-cols-1 gap-2">
                        {getTradingModels().map((model) => (
                          <Button
                            key={model}
                            variant={watchedValues.tradingModel === model ? "default" : "outline"}
                            className="justify-start"
                            onClick={() => {
                              setValue('tradingModel', model === '' ? undefined : model)
                              setIsTradingModelOpen(false)
                            }}
                          >
                            {formatModelName(model)}
                          </Button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  <p className="text-sm text-muted-foreground">
                    Choose the trading model or strategy used for this trade.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trade Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Categorize this trade</Label>
                  <TagSelector
                    selectedTagIds={selectedTags}
                    onChange={setSelectedTags}
                  />
                  <p className="text-sm text-muted-foreground">
                    Add tags to categorize and filter your trades.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Screenshots */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Camera className="w-5 h-5 mr-2" />
                  Screenshots (6) + Card Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Card Preview - Smaller size like backtest */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Card Preview Image</Label>
                  <div className="w-full sm:w-64">
                    <div className="border-2 border-dashed rounded-lg p-3 text-center aspect-video flex items-center justify-center min-h-[120px] border-border bg-muted/30">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id="card-preview"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload('cardPreviewImage', file)
                        }}
                      />

                      {watchedValues.cardPreviewImage ? (
                        <div className="relative w-full h-full group">
                          <Image
                            src={watchedValues.cardPreviewImage}
                            alt="Card Preview"
                            fill
                            className="object-cover rounded cursor-pointer"
                            onClick={() => setFullscreenImage(watchedValues.cardPreviewImage!)}
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeImage('cardPreviewImage')}
                              className="mr-2"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setFullscreenImage(watchedValues.cardPreviewImage!)}
                            >
                              View
                            </Button>
                          </div>
                          <div className="absolute top-2 left-2 bg-foreground text-background px-2 py-1 rounded text-xs font-medium">
                            Preview
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="card-preview"
                          className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Camera className="w-6 h-6 mb-1" />
                          <span className="text-xs">Upload</span>
                        </label>
                      )}
                    </div>
                  </div>
                </div>


                <p className="text-sm text-muted-foreground mt-2">
                  Upload chart screenshots, trade setups, or market analysis images (JPG, PNG, max 5MB each).
                </p>
              </CardContent>
            </Card>



            {/* Form Actions */}
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Viewer - Same as View Dialog */}
      {fullscreenImage && (
        <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 gap-0 z-[10002]">
            <DialogHeader className="px-4 pt-4 pb-2">
              <DialogTitle>Image Viewer</DialogTitle>
              <DialogDescription>
                Click and drag to pan • Scroll to zoom • Double-click to reset
              </DialogDescription>
            </DialogHeader>
            <div className="relative w-full h-[85vh] px-2 pb-2">
              <Image
                src={fullscreenImage}
                alt="Fullscreen view"
                fill
                className="object-contain"
                sizes="95vw"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent className="z-[10002]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes that will be lost if you close this dialog. 
              Your progress has been auto-saved as a draft and will be restored when you reopen this trade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowUnsavedChangesDialog(false)
              setPendingClose(false)
            }}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={discardChanges} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Image Confirmation Dialog */}
      <AlertDialog open={showDeleteImageDialog} onOpenChange={setShowDeleteImageDialog}>
        <AlertDialogContent className="z-[10002]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Delete Image?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image? This action will be applied when you save the trade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteImageDialog(false)
              setImageToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteImage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
