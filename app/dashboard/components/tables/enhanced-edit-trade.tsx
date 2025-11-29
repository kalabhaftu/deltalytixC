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
  BarChart3,
  ExternalLink
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

interface EnhancedEditTradeProps {
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
  driverTimeframe: z.string().nullable().optional(),
  entryTimeframe: z.string().nullable().optional(),
  structureTimeframe: z.string().nullable().optional(),
  orderType: z.string().nullable().optional(),
  chartLinks: z.array(z.string()).optional(),
})

type EditTradeFormData = z.infer<typeof editTradeSchema>

export default function EnhancedEditTrade({
  isOpen,
  onClose,
  trade,
  onSave
}: EnhancedEditTradeProps) {
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
  const [driverTimeframe, setDriverTimeframe] = useState<string | null>(null)
  const [entryTimeframe, setEntryTimeframe] = useState<string | null>(null)
  const [structureTimeframe, setStructureTimeframe] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<string | null>(null)
  const [chartLinks, setChartLinks] = useState<string[]>(['', '', '', ''])

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
      driverTimeframe: null,
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
      setDriverTimeframe((trade as any).driverTimeframe || null)
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
      reset({
        comment: trade.comment || '',
        cardPreviewImage: (trade as any).cardPreviewImage || '',
        imageOne: (trade as any).imageOne || '',
        imageTwo: (trade as any).imageTwo || '',
        imageThree: (trade as any).imageThree || '',
        imageFour: (trade as any).imageFour || '',
        imageFive: (trade as any).imageFive || '',
        imageSix: (trade as any).imageSix || '',
        modelId: modelId || null,
        selectedRules: (trade as any).selectedRules || [],
        marketBias: (trade as any).marketBias || null,
        newsDay: (trade as any).newsDay || false,
        selectedNews: newsIds,
        newsTraded: (trade as any).newsTraded || false,
        biasTimeframe: (trade as any).biasTimeframe || null,
        narrativeTimeframe: (trade as any).narrativeTimeframe || null,
        driverTimeframe: (trade as any).driverTimeframe || null,
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
        comment: comment || null,
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
        driverTimeframe: driverTimeframe,
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
              <TabsContent value="details" className="mt-0 space-y-4">
            {/* Trade Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trade Notes</CardTitle>
              </CardHeader>
              <CardContent>
                    <Controller
                      name="comment"
                      control={control}
                      render={({ field }) => (
                  <Textarea
                          {...field}
                          placeholder="Add your analysis, market conditions, and lessons learned..."
                          className="min-h-[150px] resize-none"
                        />
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Card Preview Image */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Camera className="w-4 h-4 mr-2" />
                      Card Preview Image
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {watchedValues.cardPreviewImage ? (
                        <div className="relative aspect-video rounded-lg overflow-hidden border">
                          <Image
                            src={watchedValues.cardPreviewImage}
                            alt="Preview"
                            fill
                            className="object-cover"
                            unoptimized
                            loading="eager"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={() => setValue('cardPreviewImage', '')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                          <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload</span>
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
                        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Screenshots */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Additional Screenshots (6 max)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(['imageOne', 'imageTwo', 'imageThree', 'imageFour', 'imageFive', 'imageSix'] as const).map((field, idx) => (
                        <div key={field} className="space-y-2">
                          <Label className="text-xs">Screenshot {idx + 1}</Label>
                          {watchedValues[field] ? (
                            <div className="relative aspect-video rounded overflow-hidden border">
                              <Image
                                src={watchedValues[field]!}
                                alt={`Screenshot ${idx + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                                loading="eager"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1"
                                onClick={() => setValue(field, '')}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed rounded cursor-pointer hover:bg-muted/50">
                              <Camera className="h-6 w-6 text-muted-foreground" />
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
                            <div className="text-xs text-center text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Strategy & Context */}
              <TabsContent value="strategy" className="mt-0 space-y-4">
                {/* Market Bias */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Market Bias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Label>What was your market sentiment?</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'BULLISH', icon: TrendingUp, label: 'Bullish', color: 'text-green-600' },
                          { value: 'BEARISH', icon: TrendingDown, label: 'Bearish', color: 'text-red-600' },
                          { value: 'UNDECIDED', icon: Minus, label: 'Undecided', color: 'text-muted-foreground' }
                        ].map(({ value, icon: Icon, label, color }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setMarketBias(value as MarketBias)}
                            className={`flex items-center gap-2 p-3 border rounded-md transition-colors ${
                              marketBias === value ? 'bg-accent border-primary' : 'hover:bg-muted/50'
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${color}`} />
                            <span className="text-sm font-medium">{label}</span>
                          </button>
                        ))}
                      </div>
                      {marketBias && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMarketBias(null)}
                        >
                          Clear Selection
                        </Button>
                      )}
                </div>
              </CardContent>
            </Card>

                {/* Order Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Order Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="order-type">Execution Type</Label>
                      <select
                        id="order-type"
                        value={orderType || ''}
                        onChange={(e) => setOrderType(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">Not specified</option>
                        <option value="market">Market Order</option>
                        <option value="limit">Limit Order</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Trading Model */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                      <Target className="w-4 h-4 mr-2" />
                      Trading Model
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                      <div>
                        <Label>Select Model</Label>
                    <select
                      value={watchedValues.modelId || ''}
                      onChange={(e) => {
                        const modelId = e.target.value || null
                        setValue('modelId', modelId)
                        const model = tradingModels.find(m => m.id === modelId)
                        setSelectedModel(model || null)
                        setSelectedRules([])
                      }}
                          className="w-full mt-2 p-2 border rounded-md bg-background"
                    >
                      <option value="">No model selected</option>
                      {tradingModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                        {tradingModels.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            No models found. Create one in Menu → Trading Models
                    </p>
                        )}
                  </div>

                  {selectedModel && selectedModel.rules.length > 0 && (
                        <div className="space-y-2 pt-3 border-t">
                          <Label>Rules Applied</Label>
                      <div className="space-y-2">
                            {selectedModel.rules.map((rule, idx) => (
                              <label key={idx} className="flex items-center gap-2 cursor-pointer">
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
                                  className="h-4 w-4"
                                />
                                <span className="text-sm">{rule}</span>
                            </label>
                            ))}
                          </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <TagIcon className="w-4 h-4 mr-2" />
                      Trade Tags
                    </CardTitle>
              </CardHeader>
              <CardContent>
                  <TagSelector
                    selectedTagIds={selectedTags}
                    onChange={setSelectedTags}
                  />
                    {tags.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        No tags available. Create one in Menu → Tags
                  </p>
                    )}
              </CardContent>
            </Card>
              </TabsContent>

              {/* Tab 3: News Events */}
              <TabsContent value="news" className="mt-0 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                      <Newspaper className="w-4 h-4 mr-2" />
                      News Events
                </CardTitle>
              </CardHeader>
                  <CardContent className="space-y-4">
                    {/* News Day Toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center gap-2">
                        <CalendarOff className="h-4 w-4" />
                        <Label htmlFor="news-day">Was this a news day?</Label>
                      </div>
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
                        className="h-4 w-4"
                      />
                    </div>

                    {isNewsDay && (
                      <>
                        <div className="space-y-2">
                          <Label>Select News Events</Label>
                          <Input
                            type="text"
                            placeholder="Search news events by name, country, or category..."
                            value={newsSearchQuery}
                            onChange={(e) => setNewsSearchQuery(e.target.value)}
                            className="mb-2"
                          />
                          {newsSearchQuery && (
                            <p className="text-xs text-muted-foreground">
                              Found {filteredNewsEvents.length} event{filteredNewsEvents.length !== 1 ? 's' : ''}
                            </p>
                          )}
                          <div className="border rounded-md p-3 space-y-3">
                              {['employment', 'inflation', 'interest-rate', 'gdp', 'pmi', 'retail', 'bank-holiday', 'other'].map(category => {
                                const events = filteredNewsEvents.filter(e => e.category === category)
                                if (events.length === 0) return null
                                
                                return (
                                  <div key={category} className="space-y-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                                      {category.replace('-', ' ')}
                                    </h4>
                                    {events.map(event => (
                                      <label
                                        key={event.id}
                                        className="flex items-start gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
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
                                          className="h-4 w-4 mt-0.5"
                                        />
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium">{event.name}</span>
                                            <Badge variant="outline" className="text-[10px] px-1">
                                              {event.country}
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">{event.description}</p>
                                        </div>
                                      </label>
                                    ))}
                          </div>
                                )
                              })}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {selectedNewsEvents.length} event(s) selected
                          </p>
                </div>

                        {selectedNewsEvents.length > 0 && (
                          <div className="flex items-start gap-2 p-3 border rounded-md bg-muted/30">
                            <input
                              id="news-traded"
                              type="checkbox"
                              checked={newsTraded}
                              onChange={(e) => setNewsTraded(e.target.checked)}
                              className="h-4 w-4 mt-0.5"
                            />
                            <Label htmlFor="news-traded" className="cursor-pointer">
                              <span className="font-medium">Traded during news release</span>
                              <p className="text-xs text-muted-foreground mt-1">
                                Check if you entered or were in a trade while the news was releasing
                              </p>
                            </Label>
                          </div>
                        )}
                      </>
                    )}
              </CardContent>
            </Card>
              </TabsContent>

              {/* Tab 4: Timeframes */}
              <TabsContent value="timeframes" className="mt-0 space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Multi-Timeframe Analysis</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Select the timeframes you used for each aspect of your trade analysis
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Bias Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="bias-timeframe">Bias</Label>
                      <select
                        id="bias-timeframe"
                        value={biasTimeframe || ''}
                        onChange={(e) => setBiasTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">None selected</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Narrative Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="narrative-timeframe">Narrative</Label>
                      <select
                        id="narrative-timeframe"
                        value={narrativeTimeframe || ''}
                        onChange={(e) => setNarrativeTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">None selected</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Driver Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="driver-timeframe">Driver</Label>
                      <select
                        id="driver-timeframe"
                        value={driverTimeframe || ''}
                        onChange={(e) => setDriverTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">None selected</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Entry Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="entry-timeframe">Entry</Label>
                      <select
                        id="entry-timeframe"
                        value={entryTimeframe || ''}
                        onChange={(e) => setEntryTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">None selected</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Structure Timeframe */}
                    <div className="space-y-2">
                      <Label htmlFor="structure-timeframe">Structure</Label>
                      <select
                        id="structure-timeframe"
                        value={structureTimeframe || ''}
                        onChange={(e) => setStructureTimeframe(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                      >
                        <option value="">None selected</option>
                        {TIMEFRAME_OPTIONS.map(tf => (
                          <option key={tf.value} value={tf.value}>{tf.label}</option>
                        ))}
                      </select>
                    </div>
                  </CardContent>
                </Card>

                {/* Chart Links */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      TradingView Chart Links
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add links to your TradingView chart analysis (up to 8)
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {chartLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder="https://www.tradingview.com/x/"
                            value={link}
                            onChange={(e) => {
                              const newLinks = [...chartLinks]
                              newLinks[index] = e.target.value
                              setChartLinks(newLinks)
                            }}
                            className="text-sm"
                          />
                        </div>
                        {index >= 4 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
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
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Chart Link ({chartLinks.length}/8)
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t shrink-0">
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
        </DialogFooter>
          </DialogContent>
        </Dialog>
  )
}

