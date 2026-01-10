'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ExtendedTrade } from '@/types/trade-extended'
import { ExtendedTrade as Trade, MarketBias } from '@/types/trade-extended'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { uploadService } from '@/lib/upload-service'
import { MAJOR_NEWS_EVENTS } from '@/lib/major-news-events'
import { useUserStore } from '@/store/user-store'
import { useTags } from '@/context/tags-provider'
import { TradeNotesTab } from './components/trade-notes-tab'
import { TradeStrategyTab } from './components/trade-strategy-tab'
import { TradeNewsTab } from './components/trade-news-tab'
import { TradeTimeframesTab } from './components/trade-timeframes-tab'
import { TIMEFRAME_OPTIONS, MARKET_BIAS_OPTIONS } from '@/lib/constants'

interface TradeEditDialogProps {
  isOpen: boolean
  onClose: () => void
  trade: ExtendedTrade | null
  onSave: (updatedTrade: Partial<ExtendedTrade>) => Promise<void>
}

// Timeframe options
// Local constants replaced by imports from @/lib/constants

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

interface Rule {
  text: string
  category: 'entry' | 'exit' | 'risk' | 'general'
}

interface TradingModel {
  id: string
  name: string
  rules: (string | Rule)[]
  notes?: string | null
}

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
      const tagIds = Array.isArray(trade.tags) ? trade.tags : []
      setSelectedTags(tagIds)

      // News
      const newsIds = trade.selectedNews ? trade.selectedNews.split(',').filter(Boolean) : []
      setSelectedNewsEvents(newsIds)
      setIsNewsDay(trade.newsDay || false)
      setNewsTraded(trade.newsTraded || false)

      // Market Bias
      // @ts-ignore - MarketBias type mismatch fix
      setMarketBias(trade.marketBias || null)

      // Timeframes
      setBiasTimeframe(trade.biasTimeframe || null)
      setNarrativeTimeframe(trade.narrativeTimeframe || null)
      setEntryTimeframe(trade.entryTimeframe || null)
      setStructureTimeframe(trade.structureTimeframe || null)

      // Order Type
      setOrderType(trade.orderType || null)

      // Chart Links
      const links = trade.chartLinks ? trade.chartLinks.split(',').filter(Boolean) : []
      setChartLinks(links.length > 0 ? links : ['', '', '', ''])

      // Model
      const modelId = trade.modelId
      if (modelId) {
        const model = tradingModels.find(m => m.id === modelId)
        setSelectedModel(model || null)
        setSelectedRules(trade.selectedRules || [])
      }

      // Form values
      const imageFields = {
        cardPreviewImage: trade.cardPreviewImage || '',
        imageOne: trade.imageOne || '',
        imageTwo: trade.imageTwo || '',
        imageThree: trade.imageThree || '',
        imageFour: trade.imageFour || '',
        imageFive: trade.imageFive || '',
        imageSix: trade.imageSix || '',
      }

      reset({
        comment: trade.comment || '',
        ...imageFields,
        modelId: modelId || null,
        selectedRules: trade.selectedRules || [],
        // @ts-ignore
        marketBias: trade.marketBias || null,
        newsDay: trade.newsDay || false,
        selectedNews: newsIds,
        newsTraded: trade.newsTraded || false,
        biasTimeframe: trade.biasTimeframe || null,
        narrativeTimeframe: trade.narrativeTimeframe || null,
        entryTimeframe: trade.entryTimeframe || null,
        structureTimeframe: trade.structureTimeframe || null,
        orderType: trade.orderType || null,
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
      <DialogContent className="w-full max-w-[95vw] sm:max-w-5xl h-[95vh] sm:h-[90vh] flex flex-col p-0 transition-all">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-lg sm:text-xl truncate pr-8">
            Edit Trade - {trade.instrument} {trade.side}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Enhance your trade with notes, screenshots, strategy, and market context
          </DialogDescription>
        </DialogHeader>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 sm:px-6 mt-4 shrink-0 overflow-x-auto pb-2 sm:pb-0">
            <TabsList className="w-full sm:w-auto overflow-x-auto justify-start flex-nowrap sm:grid sm:grid-cols-4 h-auto p-1 gap-1 bg-muted/50">
              <TabsTrigger value="details" className="text-xs sm:text-sm px-3 py-1.5 h-auto">Notes & Images</TabsTrigger>
              <TabsTrigger value="strategy" className="text-xs sm:text-sm px-3 py-1.5 h-auto">Strategy</TabsTrigger>
              <TabsTrigger value="news" className="text-xs sm:text-sm px-3 py-1.5 h-auto">News</TabsTrigger>
              <TabsTrigger value="timeframes" className="text-xs sm:text-sm px-3 py-1.5 h-auto">Timeframes</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6">
            <div className="py-4">
              {/* Tab 1: Notes & Images */}
              <TabsContent value="details" className="mt-0 space-y-6 sm:space-y-8 px-1">
                <TradeNotesTab
                  control={control}
                  cardPreviewImage={watchedValues.cardPreviewImage || null}
                  images={{
                    imageOne: watchedValues.imageOne || null,
                    imageTwo: watchedValues.imageTwo || null,
                    imageThree: watchedValues.imageThree || null,
                    imageFour: watchedValues.imageFour || null,
                    imageFive: watchedValues.imageFive || null,
                    imageSix: watchedValues.imageSix || null,
                  }}
                  onUpload={(field, file) => handleImageUpload(field as 'cardPreviewImage' | 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix', file)}
                  onRemove={(field) => {
                    setValue(field as 'cardPreviewImage' | 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix', '')
                    setImageErrors(prev => {
                      const newErrors = { ...prev }
                      delete newErrors[field]
                      return newErrors
                    })
                  }}
                  imageErrors={imageErrors}
                  setImageError={(field, hasError) => setImageErrors(prev => ({ ...prev, [field]: hasError }))}
                  uploadingField={uploadingField}
                />
              </TabsContent>

              {/* Tab 2: Strategy & Context */}
              <TabsContent value="strategy" className="mt-0 space-y-6 px-1">
                <TradeStrategyTab
                  marketBias={marketBias}
                  setMarketBias={setMarketBias}
                  orderType={orderType}
                  setOrderType={setOrderType}
                  selectedModelId={watchedValues.modelId || null}
                  setModelId={(id) => {
                    setValue('modelId', id)
                    const model = tradingModels.find(m => m.id === id)
                    setSelectedModel(model || null)
                    if (id !== watchedValues.modelId) setSelectedRules([])
                  }}
                  tradingModels={tradingModels}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  selectedRules={selectedRules}
                  setSelectedRules={setSelectedRules}
                  selectedTags={selectedTags}
                  setSelectedTags={setSelectedTags}
                />
              </TabsContent>

              {/* Tab 3: News Events */}
              <TabsContent value="news" className="mt-0 space-y-6 px-1">
                <TradeNewsTab
                  isNewsDay={isNewsDay}
                  setIsNewsDay={(val) => {
                    setIsNewsDay(val)
                    if (!val) {
                      setSelectedNewsEvents([])
                      setNewsTraded(false)
                    }
                  }}
                  newsSearchQuery={newsSearchQuery}
                  setNewsSearchQuery={setNewsSearchQuery}
                  filteredNewsEvents={filteredNewsEvents}
                  selectedNewsEvents={selectedNewsEvents}
                  setSelectedNewsEvents={setSelectedNewsEvents}
                  newsTraded={newsTraded}
                  setNewsTraded={setNewsTraded}
                />
              </TabsContent>

              {/* Tab 4: Timeframes */}
              <TabsContent value="timeframes" className="mt-0 space-y-6 sm:space-y-8 px-1">
                <TradeTimeframesTab
                  biasTimeframe={biasTimeframe}
                  setBiasTimeframe={setBiasTimeframe}
                  structureTimeframe={structureTimeframe}
                  setStructureTimeframe={setStructureTimeframe}
                  narrativeTimeframe={narrativeTimeframe}
                  setNarrativeTimeframe={setNarrativeTimeframe}
                  entryTimeframe={entryTimeframe}
                  setEntryTimeframe={setEntryTimeframe}
                  chartLinks={chartLinks}
                  setChartLinks={setChartLinks}
                />
              </TabsContent>
            </div >
          </div >
        </Tabs >

        {/* Footer */}
        < DialogFooter className="px-4 sm:px-6 py-4 border-t shrink-0 flex-col-reverse sm:flex-row gap-2 sm:gap-0" >
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full sm:w-auto">
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

