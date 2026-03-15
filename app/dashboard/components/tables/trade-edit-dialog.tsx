'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTags } from '@/context/tags-provider'
import { useNewsEvents } from '@/hooks/use-news-events'
import { useTradingModels } from '@/hooks/use-trading-models'
import { uploadService } from '@/lib/upload-service'
import { useUserStore } from '@/store/user-store'
import { ExtendedTrade, MarketBias, TradeOutcome } from '@/types/trade-extended'
import { zodResolver } from '@hookform/resolvers/zod'
import { CircleNotch, X } from '@phosphor-icons/react'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { TradeNewsTab } from './components/trade-news-tab'
import { TradeNotesTab } from './components/trade-notes-tab'
import { TradeStrategyTab } from './components/trade-strategy-tab'

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

interface LocalTradingModel {
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
  const { tradingModels: fetchedModels } = useTradingModels()
  const stableTradingModels = React.useMemo(
    () => (Array.isArray(fetchedModels) ? fetchedModels.map((m) => ({ ...m })) : []),
    [fetchedModels]
  )
  const { newsEvents: allNewsEvents } = useNewsEvents()
  const tradingModels = React.useMemo(
    () => (stableTradingModels || []) as LocalTradingModel[],
    [stableTradingModels]
  )
  const [selectedModel, setSelectedModel] = useState<LocalTradingModel | null>(null)
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isNewsDay, setIsNewsDay] = useState(false)
  const [selectedNewsEvents, setSelectedNewsEvents] = useState<string[]>([])
  const [newsTraded, setNewsTraded] = useState(false)
  const [marketBias, setMarketBias] = useState<MarketBias | null>(null)
  const [tradeOutcome, setTradeOutcome] = useState<TradeOutcome | null>(null)
  const [ruleBroken, setRuleBroken] = useState<boolean>(false)
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
  const { control, handleSubmit, setValue, watch, reset, formState: { isDirty } } = useForm<EditTradeFormData>({
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

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollBarWidth}px`
      return () => {
        document.body.style.overflow = ''
        document.body.style.paddingRight = ''
      }
    }
  }, [isOpen])

  // Trading models now come from useTradingModels() React Query hook

  // Initialize form when trade changes
  useEffect(() => {
    if (trade && isOpen) {
      // Reset image errors when dialog opens
      setImageErrors({})
      // Tags - now stored as array
      const tagIds = Array.isArray(trade.tags) ? trade.tags : []
      setSelectedTags(tagIds)

      // News
      const newsIds = (trade as any).selectedNews ? (trade as any).selectedNews.split(',').filter(Boolean) : []
      setSelectedNewsEvents(newsIds)
      setIsNewsDay((trade as any).newsDay || false)
      setNewsTraded((trade as any).newsTraded || false)

      // Market Bias
      // @ts-ignore - MarketBias type mismatch fix
      setMarketBias(trade.marketBias || null)

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
        setSelectedRules(trade.selectedRules || [])
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
        comment: (trade as any).comment || '',
        ...imageFields,
        modelId: modelId || null,
        selectedRules: (trade as any).selectedRules || [],
        // @ts-ignore
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

      setComment((trade as any).comment || '')
      setTradeOutcome((trade as any).outcome || null)
      setRuleBroken((trade as any).ruleBroken || false)
    }
  }, [trade, isOpen, reset, tradingModels])

  // Filter news events based on search query
  const filteredNewsEvents = React.useMemo(() => {
    if (!newsSearchQuery.trim()) return allNewsEvents

    const query = newsSearchQuery.toLowerCase()
    return allNewsEvents.filter(event =>
      event.name.toLowerCase().includes(query) ||
      event.country.toLowerCase().includes(query) ||
      event.category.toLowerCase().includes(query) ||
      (event.description && event.description.toLowerCase().includes(query))
    )
  }, [newsSearchQuery, allNewsEvents])

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
        tradeId: (trade as any)?.id,
      })

      if (!result.success || !result.url) {
        throw new Error(result.error || 'Upload failed')
      }

      setValue(field, result.url, { shouldDirty: true })
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
        outcome: tradeOutcome,
        ruleBroken: ruleBroken,
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

  // Safe Close Logic
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false)

  const handleCloseAttempt = (open: boolean) => {
    if (!open) {
      if (isDirty) {
        setShowUnsavedAlert(true)
      } else {
        onClose()
      }
    }
  }

  if (!trade) return null

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-background flex flex-col overflow-hidden overscroll-none">
        <div className="w-full h-full max-w-7xl mx-auto flex flex-col flex-1 relative transition-all z-10 p-0">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b shrink-0 flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold truncate pr-8">
                Edit Trade - {(trade as any).instrument} {(trade as any).side}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Enhance your trade with notes, screenshots, strategy, and market context
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleCloseAttempt(false)} className="h-8 w-8 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 sm:px-6 mt-4 shrink-0 overflow-x-auto pb-2 sm:pb-0">
              <TabsList className="w-full sm:w-auto overflow-x-auto justify-start flex-nowrap sm:grid sm:grid-cols-3 h-auto p-1 gap-1 bg-muted/50">
                <TabsTrigger value="details" className="text-xs sm:text-sm px-3 py-1.5 h-auto">Notes & Images</TabsTrigger>
                <TabsTrigger value="strategy" className="text-xs sm:text-sm px-3 py-1.5 h-auto">Strategy</TabsTrigger>
                <TabsTrigger value="news" className="text-xs sm:text-sm px-3 py-1.5 h-auto">News</TabsTrigger>
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
                      setValue(field as 'cardPreviewImage' | 'imageOne' | 'imageTwo' | 'imageThree' | 'imageFour' | 'imageFive' | 'imageSix', '', { shouldDirty: true })
                      setImageErrors(prev => {
                        const newErrors = { ...prev }
                        delete newErrors[field]
                        return newErrors
                      })
                    }}
                    imageErrors={imageErrors}
                    setImageError={(field, hasError) => setImageErrors(prev => ({ ...prev, [field]: hasError }))}
                    uploadingField={uploadingField}
                    chartLinks={chartLinks}
                    setChartLinks={setChartLinks}
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
                      setValue('modelId', id, { shouldDirty: true })
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
                    tradeOutcome={tradeOutcome}
                    setTradeOutcome={setTradeOutcome}
                    ruleBroken={ruleBroken}
                    setRuleBroken={setRuleBroken}
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
              </div>
            </div>
          </Tabs>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-4 border-t shrink-0 flex-col-reverse sm:flex-row gap-2 sm:gap-0 flex w-full items-center justify-between bg-muted/20 mt-auto">
            <Button type="button" variant="outline" onClick={() => handleCloseAttempt(false)} disabled={isSubmitting} className="w-full sm:w-auto h-10 sm:h-11 px-6 rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="w-full sm:w-auto h-10 sm:h-11 px-6 rounded-xl shadow-lg shadow-primary/10 transition-all font-semibold">
              {isSubmitting ? (
                <>
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" weight="light" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showUnsavedAlert} onOpenChange={setShowUnsavedAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your trade journal. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedAlert(false)
                onClose()
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

