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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Trade, MarketBias } from '@prisma/client'
import { Edit, Camera, X, Target, AlertTriangle, TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react'
import { useUserStore } from '@/store/user-store'
import { formatCurrency } from '@/lib/utils'
import { uploadService } from '@/lib/upload-service'
import { TagSelector } from '@/app/dashboard/components/tags/tag-selector'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface TradingModel {
  id: string
  name: string
  rules: string[]
  notes?: string | null
}

// Schema for limited editing (only notes, screenshots, links, model + rules, bias)
const editTradeSchema = z.object({
  comment: z.string().optional(),
  cardPreviewImage: z.string().optional(),
  modelId: z.string().nullable().optional(),
  selectedRules: z.array(z.string()).optional(),
  links: z.array(z.string().url()).optional(),
  marketBias: z.enum(['BULLISH', 'BEARISH', 'UNDECIDED']).nullable().optional(),
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
  const [tradingModels, setTradingModels] = useState<TradingModel[]>([])
  const [selectedModel, setSelectedModel] = useState<TradingModel | null>(null)
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Confirmation dialogs state
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false)
  const [showDeleteImageDialog, setShowDeleteImageDialog] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<'cardPreviewImage' | 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix' | null>(null)
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
      imageOne: '',
      imageTwo: '',
      imageThree: '',
      imageFour: '',
      imageFive: '',
      imageSix: '',
      modelId: null,
      selectedRules: [],
      marketBias: null,
    }
  })

  const watchedValues = watch()

  // Fetch trading models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/user/trading-models')
        if (response.ok) {
          const data = await response.json()
          setTradingModels(data.models || [])
        }
      } catch (error) {
        console.error('Failed to fetch trading models:', error)
      }
    }
    fetchModels()
  }, [])

  // Initialize form with trade data and load draft if available
  useEffect(() => {
    if (trade && isOpen) {
      // Initialize tags
      const tradeTags = (trade as any)?.tags
      setSelectedTags(tradeTags ? tradeTags.split(',').filter(Boolean) : [])
      
      const defaultFormState: EditTradeFormData = {
        comment: trade.comment || '',
        cardPreviewImage: (trade as any)?.cardPreviewImage || '',
        imageOne: (trade as any)?.imageOne || '',
        imageTwo: (trade as any)?.imageTwo || '',
        imageThree: (trade as any)?.imageThree || '',
        imageFour: (trade as any)?.imageFour || '',
        imageFive: (trade as any)?.imageFive || '',
        imageSix: (trade as any)?.imageSix || '',
        modelId: (trade as any)?.modelId || null,
        selectedRules: (trade as any)?.selectedRules || [],
        marketBias: (trade as any)?.marketBias || null,
      }
      
      // Set model and rules state
      if ((trade as any)?.modelId) {
        const model = tradingModels.find(m => m.id === (trade as any).modelId)
        setSelectedModel(model || null)
        setSelectedRules((trade as any)?.selectedRules || [])
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

  const handleImageUpload = async (field: 'cardPreviewImage' | 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix', file: File) => {
    try {
      validateImageFile(file)
      
      const currentUser = user || supabaseUser
      if (!currentUser?.id) {
        toast.error('Upload failed', { description: 'User not authenticated' })
        return
      }

      toast.loading('Uploading image...', { id: `upload-${field}` })
      
      let fileToUpload = file
      
      // Compress ONLY the card preview image to WebP
      if (field === 'cardPreviewImage') {
        try {
          const imageCompression = (await import('browser-image-compression')).default
          
          fileToUpload = await imageCompression(file, {
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.95,
          })
          
          console.log(`Card preview compressed: ${(file.size / 1024).toFixed(2)}KB → ${(fileToUpload.size / 1024).toFixed(2)}KB`)
        } catch (compressError) {
          console.warn('Compression failed, using original:', compressError)
          fileToUpload = file
        }
      }
      // For imageOne through imageSix: keep original quality (no compression)
      
      const result = await uploadService.uploadImage(fileToUpload, {
        userId: currentUser.id,
        folder: 'trades',
        tradeId: trade?.id,
      })
      
      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed')
      }
      
      // Store the storage URL
      setValue(field, result.url)
      
      toast.success('Image uploaded', {
        id: `upload-${field}`,
        description: field === 'cardPreviewImage'
          ? 'Card preview uploaded and compressed to WebP.'
          : 'Screenshot uploaded successfully (original quality).',
      })
      
    } catch (error) {
      toast.error('Upload failed', {
        id: `upload-${field}`,
        description: error instanceof Error ? error.message : 'Failed to upload image',
      })
    }
  }

  const removeImage = (field: 'cardPreviewImage' | 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix') => {
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
        modelId: data.modelId || null,
        selectedRules: selectedRules.length > 0 ? selectedRules : null,
        tags: selectedTags.length > 0 ? selectedTags.join(',') : null,
        cardPreviewImage: data.cardPreviewImage === '' ? null : data.cardPreviewImage || null,
        imageOne: data.imageOne === '' ? null : data.imageOne || null,
        imageTwo: data.imageTwo === '' ? null : data.imageTwo || null,
        imageThree: data.imageThree === '' ? null : data.imageThree || null,
        imageFour: data.imageFour === '' ? null : data.imageFour || null,
        imageFive: data.imageFive === '' ? null : data.imageFive || null,
        imageSix: data.imageSix === '' ? null : data.imageSix || null,
        marketBias: data.marketBias || null,
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
        <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] flex flex-col z-[10000] p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center text-base sm:text-lg">
              <Edit className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Edit Trade - {trade.instrument} {trade.side}
            </DialogTitle>
            <DialogDescription>
              Add notes and screenshots to enhance your trade analysis.
              Trade execution details cannot be modified.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
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

            {/* Market Bias */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Market Bias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label>What was your market sentiment? (Optional)</Label>
                  <RadioGroup
                    value={watchedValues.marketBias || ''}
                    onValueChange={(value) => setValue('marketBias', value as MarketBias | null)}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="BULLISH" id="bias-bullish" />
                        <Label htmlFor="bias-bullish" className="flex items-center gap-2 cursor-pointer w-full">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          Bullish
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="BEARISH" id="bias-bearish" />
                        <Label htmlFor="bias-bearish" className="flex items-center gap-2 cursor-pointer w-full">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          Bearish
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="UNDECIDED" id="bias-undecided" />
                        <Label htmlFor="bias-undecided" className="flex items-center gap-2 cursor-pointer w-full">
                          <Minus className="h-4 w-4 text-muted-foreground" />
                          Undecided
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                  {watchedValues.marketBias && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setValue('marketBias', null)}
                      className="text-xs"
                    >
                      Clear Selection
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Record your overall market sentiment at the time of this trade.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Trading Model & Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Trading Model & Rules
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Trading Model</Label>
                    <Select
                      value={watchedValues.modelId || undefined}
                      onValueChange={(value) => {
                        const modelId = value === 'none' ? null : value
                        setValue('modelId', modelId)
                        const model = tradingModels.find(m => m.id === modelId)
                        setSelectedModel(model || null)
                        setSelectedRules([])
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No model selected" />
                      </SelectTrigger>
                      <SelectContent className="z-[10050]">
                        <SelectItem value="none">None</SelectItem>
                        {tradingModels.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose the trading model or strategy used for this trade.
                    </p>
                  </div>

                  {selectedModel && selectedModel.rules.length > 0 && (
                    <div className="space-y-3 pt-4 border-t">
                      <Label>Rules Applied (check what you used)</Label>
                      <div className="space-y-3">
                        {selectedModel.rules.map((rule, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <Checkbox
                              id={`rule-${index}`}
                              checked={selectedRules.includes(rule)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRules([...selectedRules, rule])
                                  setValue('selectedRules', [...selectedRules, rule])
                                } else {
                                  const newRules = selectedRules.filter(r => r !== rule)
                                  setSelectedRules(newRules)
                                  setValue('selectedRules', newRules)
                                }
                              }}
                            />
                            <Label
                              htmlFor={`rule-${index}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {rule}
                            </Label>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Select which rules from this model applied to your trade.
                      </p>
                    </div>
                  )}
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
                  Trade Screenshots
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Upload up to 6 screenshots for this trade (chart screenshots, trade setups, market analysis, etc.)
                  </p>
                  
                  {/* Card Preview - Main Image */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Card Preview Image (Main)</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center aspect-video flex items-center justify-center border-border bg-muted/30 hover:bg-muted/50 transition-colors">
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
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeImage('cardPreviewImage')
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => setFullscreenImage(watchedValues.cardPreviewImage!)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="card-preview"
                          className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors py-8"
                        >
                          <Camera className="w-10 h-10 mb-2" />
                          <span className="text-sm font-medium">Click to upload screenshot</span>
                          <span className="text-xs mt-1">JPG, PNG, WebP (max 10MB)</span>
                        </label>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This image will be used as the main preview card for this trade.
                    </p>
                  </div>

                  {/* Additional Screenshots */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Additional Screenshots (Optional)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { field: 'imageOne' as const, label: 'Screenshot 2', id: 'image-one' },
                        { field: 'imageTwo' as const, label: 'Screenshot 3', id: 'image-two' },
                        { field: 'imageThree' as const, label: 'Screenshot 4', id: 'image-three' },
                        { field: 'imageFour' as const, label: 'Screenshot 5', id: 'image-four' },
                        { field: 'imageFive' as const, label: 'Screenshot 6', id: 'image-five' },
                      ].map(({ field, label, id }) => (
                      <div key={field} className="space-y-2">
                        <Label className="text-sm font-medium">{label}</Label>
                        <div className="border-2 border-dashed rounded-lg p-2 text-center aspect-video flex items-center justify-center border-border bg-muted/30 hover:bg-muted/50 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id={id}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload(field, file)
                            }}
                          />

                          {watchedValues[field] ? (
                            <div className="relative w-full h-full group">
                              <Image
                                src={watchedValues[field]!}
                                alt={label}
                                fill
                                className="object-cover rounded cursor-pointer"
                                onClick={() => setFullscreenImage(watchedValues[field]!)}
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeImage(field)
                                  }}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Remove
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setFullscreenImage(watchedValues[field]!)}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <label
                              htmlFor={id}
                              className="cursor-pointer flex flex-col items-center text-muted-foreground hover:text-foreground transition-colors py-6"
                            >
                              <Camera className="w-8 h-8 mb-2" />
                              <span className="text-xs font-medium">Click to upload</span>
                              <span className="text-xs mt-1">JPG, PNG, WebP (max 10MB)</span>
                            </label>
                          )}
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            </div>

            {/* Form Actions - Fixed at bottom */}
            <div className="border-t px-4 sm:px-6 py-4 shrink-0 bg-background">
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
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
