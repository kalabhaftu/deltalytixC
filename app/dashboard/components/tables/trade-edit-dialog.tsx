'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trade } from '@prisma/client'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Camera,
  X,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Newspaper,
  CalendarOff,
  Tag as TagIcon,
  Settings,
  Loader2,
  Plus,
  Search,
  BarChart3,
  ExternalLink,
  Zap,
  Pencil,
  Trash2
} from 'lucide-react'
import { useUserStore } from '@/store/user-store'
import { uploadService } from '@/lib/upload-service'
import { useTags } from '@/context/tags-provider'
import { MAJOR_NEWS_EVENTS } from '@/lib/major-news-events'
import { TagSelector } from '@/app/dashboard/components/tags/tag-selector'

// Types
type MarketBias = 'BULLISH' | 'BEARISH' | 'UNDECIDED'

interface TradingModel {
  id: string
  name: string
  rules: string[]
  notes?: string | null
}

interface TradeEditDialogProps {
  isOpen: boolean
  onClose: () => void
  trade: Trade | null
  onSave: (updatedTrade: Partial<Trade>) => Promise<void>
}

// Timeframe options
const TIMEFRAME_OPTIONS = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: 'd', label: 'Daily' },
  { value: 'w', label: 'Weekly' },
  { value: 'm', label: 'Monthly' },
]

// Form Schema
const editTradeSchema = z.object({
  comment: z.string().optional(),
  cardPreviewImage: z.string().optional(),
  imageOne: z.string().optional(),
  imageTwo: z.string().optional(),
  imageThree: z.string().optional(),
  imageFour: z.string().optional(),
  imageFive: z.string().optional(),
  imageSix: z.string().optional(),
  modelId: z.string().nullable().optional(),
  selectedRules: z.array(z.string()).optional(),
  marketBias: z.enum(['BULLISH', 'BEARISH', 'UNDECIDED']).nullable().optional(),
  newsDay: z.boolean().optional(),
  selectedNews: z.array(z.string()).optional(),
  newsTraded: z.boolean().optional(),
  biasTimeframe: z.string().nullable().optional(),
  narrativeTimeframe: z.string().nullable().optional(),
  entryTimeframe: z.string().nullable().optional(),
  structureTimeframe: z.string().nullable().optional(),
  orderType: z.string().nullable().optional(),
  chartLinks: z.array(z.string()).optional(),
})

type EditTradeFormData = z.infer<typeof editTradeSchema>

export default function TradeEditDialog({
  isOpen,
  onClose,
  trade,
  onSave
}: TradeEditDialogProps) {
  // State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tradingModels, setTradingModels] = useState<TradingModel[]>([])
  const [selectedModel, setSelectedModel] = useState<TradingModel | null>(null)
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isNewsDay, setIsNewsDay] = useState(false)
  const [selectedNewsEvents, setSelectedNewsEvents] = useState<string[]>([])
  const [newsTraded, setNewsTraded] = useState(false)
  const [marketBias, setMarketBias] = useState<MarketBias | null>(null)
  const [activeTab, setActiveTab] = useState('details')
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  const [newsSearchQuery, setNewsSearchQuery] = useState('')
  const [comment, setComment] = useState('')
  const [biasTimeframe, setBiasTimeframe] = useState<string | null>(null)
  const [narrativeTimeframe, setNarrativeTimeframe] = useState<string | null>(null)
  const [entryTimeframe, setEntryTimeframe] = useState<string | null>(null)
  const [structureTimeframe, setStructureTimeframe] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<string | null>(null)
  const [chartLinks, setChartLinks] = useState<string[]>(['', '', '', ''])
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})

  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const { tags } = useTags()

  // Form
  const { control, handleSubmit, setValue, watch, reset } = useForm<EditTradeFormData>({
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
      newsDay: false,
      selectedNews: [],
      newsTraded: false,
      biasTimeframe: null,
      narrativeTimeframe: null,
      entryTimeframe: null,
      structureTimeframe: null,
      orderType: null,
      chartLinks: [],
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
        // Error fetching models
      }
    }
    fetchModels()
  }, [])

  // Initialize form when trade changes
  useEffect(() => {
    if (trade && isOpen) {
      // Reset image errors when dialog opens
      setImageErrors({})
      // Tags - now stored as array
      const tagIds = Array.isArray((trade as any).tags) ? (trade as any).tags : []
      setSelectedTags(tagIds)

      // News
      const newsIds = (trade as any).selectedNews ? (trade as any).selectedNews.split(',').filter(Boolean) : []
      setSelectedNewsEvents(newsIds)
      setIsNewsDay((trade as any).newsDay || false)
      setNewsTraded((trade as any).newsTraded || false)

      // Market Bias
      setMarketBias((trade as any).marketBias || null)

      // Timeframes
      setBiasTimeframe((trade as any).biasTimeframe || null)
      setNarrativeTimeframe((trade as any).narrativeTimeframe || null)
      setEntryTimeframe((trade as any).entryTimeframe || null)
      setStructureTimeframe((trade as any).structureTimeframe || null)

      // Order Type
      setOrderType((trade as any).orderType || null)

      // Chart Links
      const links = (trade as any).chartLinks ? (trade as any).chartLinks.split(',').filter(Boolean) : []
      setChartLinks(links.length > 0 ? links : ['', '', '', ''])

      // Model
      const modelId = (trade as any).modelId
      if (modelId) {
        const model = tradingModels.find(m => m.id === modelId)
        setSelectedModel(model || null)
        setSelectedRules((trade as any).selectedRules || [])
      }

      // Form values
      const imageFields = {
        cardPreviewImage: (trade as any).cardPreviewImage || '',
        imageOne: (trade as any).imageOne || '',
        imageTwo: (trade as any).imageTwo || '',
        imageThree: (trade as any).imageThree || '',
        imageFour: (trade as any).imageFour || '',
        imageFive: (trade as any).imageFive || '',
        imageSix: (trade as any).imageSix || '',
      }

      reset({
        comment: trade.comment || '',
        ...imageFields,
        modelId: modelId || null,
        selectedRules: (trade as any).selectedRules || [],
        marketBias: (trade as any).marketBias || null,
        newsDay: (trade as any).newsDay || false,
        selectedNews: newsIds,
        newsTraded: (trade as any).newsTraded || false,
        biasTimeframe: (trade as any).biasTimeframe || null,
        narrativeTimeframe: (trade as any).narrativeTimeframe || null,
        entryTimeframe: (trade as any).entryTimeframe || null,
        structureTimeframe: (trade as any).structureTimeframe || null,
        orderType: (trade as any).orderType || null,
        chartLinks: links,
      })

      setComment(trade.comment || '')
    }
  }, [trade, isOpen, tradingModels, reset])

  // Filter news events based on search query
  const filteredNewsEvents = React.useMemo(() => {
    if (!newsSearchQuery.trim()) return MAJOR_NEWS_EVENTS

    const query = newsSearchQuery.toLowerCase()
    return MAJOR_NEWS_EVENTS.filter(event =>
      event.name.toLowerCase().includes(query) ||
      event.country.toLowerCase().includes(query) ||
      event.category.toLowerCase().includes(query) ||
      (event.description && event.description.toLowerCase().includes(query))
    )
  }, [newsSearchQuery])

  // Handle image upload
  const handleImageUpload = async (
    field: 'cardPreviewImage' | 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix',
    file: File
  ) => {
    try {
      const currentUser = user || supabaseUser
      if (!currentUser?.id) {
        toast.error('User not authenticated')
        return
      }

      setUploadingField(field)

      let fileToUpload = file

      // Compress only preview image
      if (field === 'cardPreviewImage') {
        try {
          const imageCompression = (await import('browser-image-compression')).default
          fileToUpload = await imageCompression(file, {
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.95,
          })
        } catch (err) {
          // Compression failed, continue without compression
        }
      }

      const result = await uploadService.uploadImage(fileToUpload, {
        userId: currentUser.id,
        folder: 'trades',
        tradeId: trade?.id,
      })

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed')
      }

      setValue(field, result.url)
      setImageErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
      toast.success('Image uploaded successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploadingField(null)
    }
  }

  // Handle form submit
  const onSubmit = async (data: EditTradeFormData) => {
    if (!trade) return

    setIsSubmitting(true)
    try {
      const updateData = {
        comment: data.comment || null,
        modelId: data.modelId || null,
        selectedRules: selectedRules.length > 0 ? selectedRules : null,
        tags: selectedTags.length > 0 ? selectedTags : [],
        cardPreviewImage: data.cardPreviewImage || null,
        imageOne: data.imageOne || null,
        imageTwo: data.imageTwo || null,
        imageThree: data.imageThree || null,
        imageFour: data.imageFour || null,
        imageFive: data.imageFive || null,
        imageSix: data.imageSix || null,
        marketBias: marketBias,
        newsDay: isNewsDay,
        selectedNews: selectedNewsEvents.length > 0 ? selectedNewsEvents.join(',') : null,
        newsTraded: newsTraded,
        biasTimeframe: biasTimeframe,
        narrativeTimeframe: narrativeTimeframe,
        entryTimeframe: entryTimeframe,
        structureTimeframe: structureTimeframe,
        orderType: orderType,
        chartLinks: chartLinks.filter(link => link.trim()).join(',') || null,
      } as any

      await onSave(updateData)
      toast.success('Trade updated successfully')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update trade')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!trade) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>
            Edit Trade - {trade.instrument} {trade.side}
          </DialogTitle>
          <DialogDescription>
            Enhance your trade with notes, screenshots, strategy, and market context
          </DialogDescription>
        </DialogHeader>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 shrink-0">
            <TabsTrigger value="details">Notes & Images</TabsTrigger>
            <TabsTrigger value="strategy">Strategy & Context</TabsTrigger>
            <TabsTrigger value="news">News Events</TabsTrigger>
            <TabsTrigger value="timeframes">Timeframes</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6">
            <div className="py-4">
              {/* Tab 1: Notes & Images */}
              <TabsContent value="details" className="mt-0 space-y-8 px-1">
                {/* Trade Notes */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Trade Notes</h3>
                    <p className="text-xs text-muted-foreground">Document your thoughts, market conditions, and key takeaways.</p>
                  </div>
                  <Controller
                    name="comment"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="What did you see? What did you learn?"
                        className="min-h-[160px] resize-none bg-muted/20 border-border/50 focus:bg-background transition-all"
                      />
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Card Preview Image */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Featured Analysis</h3>
                      <p className="text-xs text-muted-foreground">The primary image shown in your journal feed.</p>
                    </div>
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 bg-muted/30 group">
                      {(() => {
                        const formValue = watchedValues.cardPreviewImage
                        const tradeValue = (trade as any)?.cardPreviewImage
                        const imageUrl = (formValue && String(formValue).trim() !== '') ? formValue : (tradeValue && String(tradeValue).trim() !== '') ? tradeValue : ''
                        return imageUrl !== ''
                      })() ? (
                        <>
                          {!imageErrors.cardPreviewImage ? (
                            <Image
                              src={(() => {
                                const formValue = watchedValues.cardPreviewImage
                                const tradeValue = (trade as any)?.cardPreviewImage
                                return (formValue && String(formValue).trim() !== '') ? formValue : (tradeValue && String(tradeValue).trim() !== '') ? tradeValue : ''
                              })()}
                              alt="Preview"
                              fill
                              className="object-cover"
                              unoptimized
                              loading="eager"
                              onError={() => setImageErrors(prev => ({ ...prev, cardPreviewImage: true }))}
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                              <X className="h-8 w-8 text-destructive/50 mb-2" />
                              <p className="text-xs text-muted-foreground">Image link broken</p>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-4 px-4 backdrop-blur-[2px]">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-9 px-4 text-xs font-semibold shadow-xl border-white/20 hover:bg-white hover:text-black transition-all"
                              onClick={() => {
                                const input = document.createElement('input')
                                input.type = 'file'
                                input.accept = 'image/*'
                                input.onchange = (e) => {
                                  const file = (e.target as HTMLInputElement).files?.[0]
                                  if (file) handleImageUpload('cardPreviewImage', file)
                                }
                                input.click()
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Replace
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-9 px-4 text-xs font-semibold shadow-xl hover:bg-red-600 transition-all"
                              onClick={() => {
                                setValue('cardPreviewImage', '')
                                setImageErrors(prev => {
                                  const newErrors = { ...prev }
                                  delete newErrors.cardPreviewImage
                                  return newErrors
                                })
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Remove
                            </Button>
                          </div>
                        </>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors">
                          <Plus className="h-8 w-8 text-muted-foreground/40 mb-2" />
                          <span className="text-xs text-muted-foreground">Upload preview</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleImageUpload('cardPreviewImage', file)
                            }}
                            disabled={uploadingField === 'cardPreviewImage'}
                          />
                        </label>
                      )}
                      {uploadingField === 'cardPreviewImage' && (
                        <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Screenshots */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Gallery</h3>
                      <p className="text-xs text-muted-foreground">Detailed chart views and execution proofs.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(['imageOne', 'imageTwo', 'imageThree', 'imageFour', 'imageFive', 'imageSix'] as const).map((field, idx) => {
                        const formValue = watchedValues[field]
                        const tradeValue = (trade as any)?.[field]
                        const imageUrl = (formValue && String(formValue).trim() !== '') ? formValue : (tradeValue && String(tradeValue).trim() !== '') ? tradeValue : ''

                        return (
                          <div key={field} className="relative aspect-square rounded-lg overflow-hidden border border-border/50 bg-muted/20 group">
                            {imageUrl ? (
                              <>
                                {!imageErrors[field] ? (
                                  <Image
                                    src={imageUrl}
                                    alt={`Screenshot ${idx + 1}`}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                    loading="eager"
                                    onError={() => setImageErrors(prev => ({ ...prev, [field]: true }))}
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <X className="h-4 w-4 text-destructive/40" />
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-[1px]">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-white/20 border-white/20 hover:bg-white hover:text-black text-white transition-all scale-90 group-hover:scale-100"
                                    title="Edit"
                                    onClick={() => {
                                      const input = document.createElement('input')
                                      input.type = 'file'
                                      input.accept = 'image/*'
                                      input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0]
                                        if (file) handleImageUpload(field, file)
                                      }
                                      input.click()
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-red-500/40 border-red-500/20 hover:bg-red-500 transition-all scale-90 group-hover:scale-100"
                                    title="Delete"
                                    onClick={() => {
                                      setValue(field, '')
                                      setImageErrors(prev => {
                                        const newErrors = { ...prev }
                                        delete newErrors[field]
                                        return newErrors
                                      })
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <label className="flex items-center justify-center w-full h-full cursor-pointer hover:bg-muted/50 transition-colors">
                                <Plus className="h-5 w-5 text-muted-foreground/30" />
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleImageUpload(field, file)
                                  }}
                                  disabled={uploadingField === field}
                                />
                              </label>
                            )}
                            {uploadingField === field && (
                              <div className="absolute inset-0 bg-background/40 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Strategy & Context */}
              <TabsContent value="strategy" className="mt-0 space-y-6 px-1">
                {/* Market Bias */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Market Bias</h3>
                    <p className="text-xs text-muted-foreground">What was your overall market sentiment for this trade?</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'BULLISH', label: 'Bullish', activeClass: 'bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400' },
                      { value: 'BEARISH', label: 'Bearish', activeClass: 'bg-red-500/10 border-red-500/50 text-red-700 dark:text-red-400' },
                      { value: 'UNDECIDED', label: 'Neutral', activeClass: 'bg-muted border-primary/50 text-foreground' }
                    ].map(({ value, label, activeClass }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMarketBias(value as MarketBias)}
                        className={`py-2.5 px-4 border rounded-md text-sm font-medium transition-all ${marketBias === value
                          ? activeClass
                          : 'bg-background hover:bg-muted/50 border-input'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                  {/* Order Type */}
                  <div className="space-y-2">
                    <Label htmlFor="order-type" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Execution Type</Label>
                    <select
                      id="order-type"
                      value={orderType || ''}
                      onChange={(e) => setOrderType(e.target.value || null)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:border-primary/50 focus:ring-0 transition-colors"
                    >
                      <option value="">Not specified</option>
                      <option value="market">Market Order</option>
                      <option value="limit">Limit Order</option>
                    </select>
                  </div>

                  {/* Trading Model */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trading Model</Label>
                    <select
                      value={watchedValues.modelId || ''}
                      onChange={(e) => {
                        const modelId = e.target.value || null
                        setValue('modelId', modelId)
                        const model = tradingModels.find(m => m.id === modelId)
                        setSelectedModel(model || null)
                        setSelectedRules([])
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:border-primary/50 focus:ring-0 transition-colors"
                    >
                      <option value="">No model selected</option>
                      {tradingModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedModel && selectedModel.rules.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Verification Rules</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 border rounded-lg p-4 bg-muted/20">
                      {selectedModel.rules.map((rule, idx) => (
                        <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={selectedRules.includes(rule)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRules([...selectedRules, rule])
                              } else {
                                setSelectedRules(selectedRules.filter(r => r !== rule))
                              }
                            }}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20 transition-all cursor-pointer"
                          />
                          <span className="text-sm text-foreground group-hover:text-primary transition-colors">{rule}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trade Tags</Label>
                  </div>
                  <div className="p-1">
                    <TagSelector
                      selectedTagIds={selectedTags}
                      onChange={setSelectedTags}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: News Events */}
              <TabsContent value="news" className="mt-0 space-y-6 px-1">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-foreground">Economic Events</h3>
                      <p className="text-xs text-muted-foreground">Select relevant economic events that influenced the trade.</p>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 rounded-full border border-border/50">
                      <Label htmlFor="news-day" className="text-xs font-medium cursor-pointer">News Day</Label>
                      <input
                        id="news-day"
                        type="checkbox"
                        checked={isNewsDay}
                        onChange={(e) => {
                          setIsNewsDay(e.target.checked)
                          if (!e.target.checked) {
                            setSelectedNewsEvents([])
                            setNewsTraded(false)
                          }
                        }}
                        className="h-3.5 w-3.5 rounded border-input"
                      />
                    </div>
                  </div>

                  {isNewsDay && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search news events..."
                          value={newsSearchQuery}
                          onChange={(e) => setNewsSearchQuery(e.target.value)}
                          className="pl-9 bg-muted/20 border-border/50 focus:bg-background transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {['employment', 'inflation', 'interest-rate', 'gdp', 'pmi', 'retail', 'housing', 'trade', 'manufacturing', 'bank-holiday', 'other'].map(category => {
                          const events = filteredNewsEvents.filter(e => e.category === category)
                          if (events.length === 0) return null

                          return (
                            <div key={category} className="space-y-3">
                              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">
                                {category.replace('-', ' ')}
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                {events.map(event => (
                                  <label
                                    key={event.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer group ${selectedNewsEvents.includes(event.id)
                                      ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/10'
                                      : 'bg-background hover:bg-muted/50 border-transparent hover:border-border'
                                      }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedNewsEvents.includes(event.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedNewsEvents([...selectedNewsEvents, event.id])
                                        } else {
                                          setSelectedNewsEvents(selectedNewsEvents.filter(id => id !== event.id))
                                        }
                                      }}
                                      className="h-4 w-4 mt-0.5 rounded border-input text-primary focus:ring-primary/20"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={`text-sm font-medium transition-colors ${selectedNewsEvents.includes(event.id) ? 'text-primary' : 'text-foreground'}`}>
                                          {event.name}
                                        </span>
                                        <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 bg-muted/60 text-muted-foreground font-normal">
                                          {event.country}
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 group-hover:line-clamp-none transition-all">
                                        {event.description}
                                      </p>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {selectedNewsEvents.length > 0 && (
                        <div className="flex items-center gap-3 p-4 border rounded-xl bg-primary/5 border-primary/20">
                          <input
                            id="news-traded"
                            type="checkbox"
                            checked={newsTraded}
                            onChange={(e) => setNewsTraded(e.target.checked)}
                            className="h-4 w-4 rounded border-primary/30 text-primary"
                          />
                          <Label htmlFor="news-traded" className="cursor-pointer">
                            <span className="text-sm font-semibold text-primary">Execution during news</span>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              I actively managed or executed positions during this high-impact release.
                            </p>
                          </Label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 4: Timeframes */}
              <TabsContent value="timeframes" className="mt-0 space-y-8 px-1">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Multi-Timeframe Analysis</h3>
                    <p className="text-xs text-muted-foreground">Select the timeframes used for each stage of your analysis.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-5 max-w-md">
                    {/* Bias Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="bias-timeframe" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bias</Label>
                      <select
                        id="bias-timeframe"
                        value={biasTimeframe || ''}
                        onChange={(e) => setBiasTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus:border-primary/50 focus:ring-0"
                      >
                        <option value="">None</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Structure Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="structure-timeframe" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Structure</Label>
                      <select
                        id="structure-timeframe"
                        value={structureTimeframe || ''}
                        onChange={(e) => setStructureTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus:border-primary/50 focus:ring-0"
                      >
                        <option value="">None</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Narrative Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="narrative-timeframe" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Narrative</Label>
                      <select
                        id="narrative-timeframe"
                        value={narrativeTimeframe || ''}
                        onChange={(e) => setNarrativeTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus:border-primary/50 focus:ring-0"
                      >
                        <option value="">None</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Entry Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="entry-timeframe" className="text-[10px] font-bold uppercase tracking-wider text-primary">Entry</Label>
                      <select
                        id="entry-timeframe"
                        value={entryTimeframe || ''}
                        onChange={(e) => setEntryTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-primary/30 bg-background px-3 py-1 text-sm transition-colors focus:border-primary focus:ring-0 font-medium"
                      >
                        <option value="">None</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Chart Links */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Chart Analysis Links</h3>
                    <p className="text-xs text-muted-foreground">Add links to your TradingView chart analysis (up to 8)</p>
                  </div>
                  <div className="space-y-3 max-w-2xl">
                    {chartLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2 group">
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder="https://www.tradingview.com/x/..."
                            value={link}
                            onChange={(e) => {
                              const newLinks = [...chartLinks]
                              newLinks[index] = e.target.value
                              setChartLinks(newLinks)
                            }}
                            className="text-sm h-9 bg-muted/20 border-border/50 focus:bg-background transition-all"
                          />
                        </div>
                        {index >= 4 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => {
                              const newLinks = chartLinks.filter((_, i) => i !== index)
                              setChartLinks(newLinks)
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {chartLinks.length < 8 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setChartLinks([...chartLinks, ''])}
                        className="w-full h-9 border-dashed border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Analysis Link ({chartLinks.length}/8)
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </div >
          </div >
        </Tabs >

        {/* Footer */}
        < DialogFooter className="px-6 py-4 border-t shrink-0" >
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter >
      </DialogContent >
    </Dialog >
  )
}

