'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, Plus, X, TrendingUp, Settings2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { BacktestDirection, BacktestSession, BacktestModel, BacktestOutcome } from '@/types/backtesting-types'
import Image from 'next/image'

// Schema for manual mode
const manualBacktestSchema = z.object({
  pair: z.string().min(1, 'Pair is required'),
  direction: z.enum(['BUY', 'SELL']),
  session: z.enum(['NEW_YORK', 'ASIAN', 'LONDON']),
  model: z.enum(['ICT_2022', 'MSNR', 'TTFM', 'PRICE_ACTION', 'SUPPLY_DEMAND', 'SMART_MONEY', 'CUSTOM']),
  customModel: z.string().optional(),
  
  entryPrice: z.string().min(1, 'Entry price is required'),
  stopLoss: z.string().min(1, 'Stop loss is required'),
  exitPrice: z.string().min(1, 'Exit price is required'),
  
  outcome: z.enum(['WIN', 'LOSS', 'BREAKEVEN']),
  notes: z.string().optional(),
  tags: z.string().optional(),
})

// Schema for simple R:R mode
const simpleBacktestSchema = z.object({
  pair: z.string().min(1, 'Pair is required'),
  direction: z.enum(['BUY', 'SELL']),
  session: z.enum(['NEW_YORK', 'ASIAN', 'LONDON']),
  model: z.enum(['ICT_2022', 'MSNR', 'TTFM', 'PRICE_ACTION', 'SUPPLY_DEMAND', 'SMART_MONEY', 'CUSTOM']),
  customModel: z.string().optional(),
  
  riskRewardRatio: z.string().min(1, 'R:R ratio is required'),
  pnl: z.string().min(1, 'P&L is required'),
  
  outcome: z.enum(['WIN', 'LOSS', 'BREAKEVEN']),
  notes: z.string().optional(),
  tags: z.string().optional(),
})

type ManualBacktestFormValues = z.infer<typeof manualBacktestSchema>
type SimpleBacktestFormValues = z.infer<typeof simpleBacktestSchema>
type BacktestFormValues = ManualBacktestFormValues | SimpleBacktestFormValues

interface AddBacktestFormProps {
  onAdd?: (backtest: any) => void
}

// Common trading instruments with their typical price ranges
const COMMON_INSTRUMENTS = [
  // Forex Majors
  { symbol: 'EUR/USD', category: 'Forex', placeholder: '1.08500' },
  { symbol: 'GBP/USD', category: 'Forex', placeholder: '1.26500' },
  { symbol: 'USD/JPY', category: 'Forex', placeholder: '148.500' },
  { symbol: 'USD/CHF', category: 'Forex', placeholder: '0.88500' },
  { symbol: 'AUD/USD', category: 'Forex', placeholder: '0.65500' },
  { symbol: 'USD/CAD', category: 'Forex', placeholder: '1.34200' },
  { symbol: 'NZD/USD', category: 'Forex', placeholder: '0.60500' },
  
  // Forex Crosses
  { symbol: 'EUR/GBP', category: 'Forex', placeholder: '0.85500' },
  { symbol: 'EUR/JPY', category: 'Forex', placeholder: '161.500' },
  { symbol: 'GBP/JPY', category: 'Forex', placeholder: '188.500' },
  
  // Indices
  { symbol: 'NAS100', category: 'Indices', placeholder: '16250.50' },
  { symbol: 'US30', category: 'Indices', placeholder: '38500.00' },
  { symbol: 'SPX500', category: 'Indices', placeholder: '4850.00' },
  { symbol: 'US100', category: 'Indices', placeholder: '16250.50' },
  { symbol: 'GER40', category: 'Indices', placeholder: '17200.00' },
  { symbol: 'UK100', category: 'Indices', placeholder: '7650.00' },
  
  // Commodities
  { symbol: 'GOLD', category: 'Commodities', placeholder: '2025.50' },
  { symbol: 'XAU/USD', category: 'Commodities', placeholder: '2025.50' },
  { symbol: 'SILVER', category: 'Commodities', placeholder: '23.50' },
  { symbol: 'XAG/USD', category: 'Commodities', placeholder: '23.50' },
  { symbol: 'WTI', category: 'Commodities', placeholder: '78.50' },
  { symbol: 'BRENT', category: 'Commodities', placeholder: '82.50' },
  
  // Crypto
  { symbol: 'BTC/USD', category: 'Crypto', placeholder: '42500.00' },
  { symbol: 'ETH/USD', category: 'Crypto', placeholder: '2250.00' },
]

export function AddBacktestForm({ onAdd }: AddBacktestFormProps) {
  const [images, setImages] = useState<string[]>([])
  const [cardPreview, setCardPreview] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [filteredInstruments, setFilteredInstruments] = useState(COMMON_INSTRUMENTS)
  const [inputMode, setInputMode] = useState<'manual' | 'simple'>('manual')
  const [isLoadingMode, setIsLoadingMode] = useState(true)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(inputMode === 'manual' ? manualBacktestSchema : simpleBacktestSchema),
    defaultValues: {
      direction: 'BUY',
      session: 'NEW_YORK',
      model: 'ICT_2022',
      outcome: 'WIN',
    }
  })

  const watchedModel = watch('model')
  const watchedDirection = watch('direction')
  const watchedOutcome = watch('outcome')
  const watchedPair = watch('pair')
  const watchedEntryPrice = watch('entryPrice')
  const watchedExitPrice = watch('exitPrice')
  const watchedPnl = watch('pnl')

  // Get price placeholders based on selected pair
  const getPricePlaceholder = () => {
    const instrument = COMMON_INSTRUMENTS.find(
      inst => inst.symbol.toLowerCase() === watchedPair?.toLowerCase()
    )
    return instrument?.placeholder || '0.00000'
  }

  // Filter instruments based on input
  const handlePairInputChange = (value: string) => {
    setValue('pair', value)
    
    if (value.length > 0) {
      const filtered = COMMON_INSTRUMENTS.filter(inst =>
        inst.symbol.toLowerCase().includes(value.toLowerCase()) ||
        inst.category.toLowerCase().includes(value.toLowerCase())
      )
      setFilteredInstruments(filtered)
      setShowSuggestions(true)
    } else {
      setFilteredInstruments(COMMON_INSTRUMENTS)
      setShowSuggestions(false)
    }
  }

  const selectInstrument = (symbol: string) => {
    setValue('pair', symbol)
    setShowSuggestions(false)
  }

  // Fetch user's input mode preference
  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await fetch('/api/settings/backtest-mode')
        if (response.ok) {
          const data = await response.json()
          setInputMode(data.mode || 'manual')
        }
      } catch (error) {
        console.error('Failed to fetch backtest mode:', error)
      } finally {
        setIsLoadingMode(false)
      }
    }
    fetchMode()
  }, [])

  // Save mode preference when changed
  const handleModeChange = async (newMode: 'manual' | 'simple') => {
    setInputMode(newMode)
    try {
      await fetch('/api/settings/backtest-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      })
      toast.success(`Switched to ${newMode === 'manual' ? 'Full Manual' : 'Simple R:R'} mode`)
    } catch (error) {
      console.error('Failed to save preference:', error)
      toast.error('Failed to save preference')
    }
  }

  // Auto-detect outcome based on P&L
  useEffect(() => {
    const currentPnL = calculatePnL()
    
    if (currentPnL !== 0) {
      const detectedOutcome = currentPnL > 0 ? 'WIN' : currentPnL < 0 ? 'LOSS' : 'BREAKEVEN'
      const currentOutcome = watch('outcome')
      
      // Auto-set outcome based on P&L
      if (currentOutcome !== detectedOutcome) {
        setValue('outcome', detectedOutcome)
      }
      
      // Validate: If user tries to set WIN with negative P&L or LOSS with positive P&L
      if ((currentOutcome === 'WIN' && currentPnL < 0) || (currentOutcome === 'LOSS' && currentPnL > 0)) {
        toast.error('Outcome mismatch!', {
          description: `P&L is ${currentPnL >= 0 ? 'positive' : 'negative'} but outcome is set to ${currentOutcome}. Auto-correcting...`
        })
        setValue('outcome', detectedOutcome)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedEntryPrice, watchedExitPrice, watchedPnl, inputMode])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSuggestions])

  const handleImageUpload = (file: File, isCardPreview: boolean = false) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (isCardPreview) {
        setCardPreview(result)
      } else {
        if (images.length < 6) {
          setImages(prev => [...prev, result])
        } else {
          toast.error('Maximum 6 images allowed')
        }
      }
    }
    reader.readAsDataURL(file)
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const calculateRR = () => {
    if (inputMode === 'simple') {
      const rr = parseFloat(watch('riskRewardRatio') || '0')
      return rr
    }

    const entry = parseFloat(watch('entryPrice') || '0')
    const sl = parseFloat(watch('stopLoss') || '0')
    const exit = parseFloat(watch('exitPrice') || '0')
    const direction = watch('direction')

    // Need all values to calculate
    if (!entry || !sl || !exit) return 0

    let risk = 0
    let reward = 0

    if (direction === 'BUY') {
      // For long positions:
      // Risk = Entry - Stop Loss (how much we can lose)
      // Reward = Exit - Entry (how much we gained/lost)
      risk = Math.abs(entry - sl)
      reward = exit - entry
    } else if (direction === 'SELL') {
      // For short positions:
      // Risk = Stop Loss - Entry (how much we can lose)
      // Reward = Entry - Exit (how much we gained/lost)
      risk = Math.abs(sl - entry)
      reward = entry - exit
    }

    // Risk must be positive, reward can be negative (for losses)
    if (risk <= 0) return 0
    
    // Return absolute R:R ratio
    return Math.abs(reward) / risk
  }

  const calculatePnL = () => {
    if (inputMode === 'simple') {
      const pnl = parseFloat(watch('pnl') || '0')
      return pnl
    }

    const entry = parseFloat(watch('entryPrice') || '0')
    const exit = parseFloat(watch('exitPrice') || '0')
    const direction = watch('direction')

    // Need both prices to calculate
    if (!entry || !exit) return 0

    // P&L is the difference between exit and entry
    // Positive = profit, Negative = loss
    if (direction === 'BUY') {
      // Long: P&L = Exit Price - Entry Price
      return exit - entry
    } else if (direction === 'SELL') {
      // Short: P&L = Entry Price - Exit Price
      return entry - exit
    }
    
    return 0
  }

  const onSubmit = async (data: any) => {
    setIsSubmitting(true)
    try {
      const rr = calculateRR()
      const pnl = calculatePnL()
      
      // Final validation: Check P&L vs Outcome consistency
      if (pnl !== 0) {
        const expectedOutcome = pnl > 0 ? 'WIN' : pnl < 0 ? 'LOSS' : 'BREAKEVEN'
        if (data.outcome !== expectedOutcome) {
          toast.error('Cannot submit!', {
            description: `P&L is ${pnl >= 0 ? 'positive (+' + pnl.toFixed(2) + ')' : 'negative (' + pnl.toFixed(2) + ')'} but outcome is ${data.outcome}. Please check your data.`
          })
          setIsSubmitting(false)
          return
        }
      }
      
      // For simple mode, use placeholder values for prices since we don't collect them
      let entryPrice, exitPrice, stopLoss, takeProfit
      
      if (inputMode === 'simple') {
        // Use placeholder values - these won't be displayed in simple mode
        entryPrice = '0'
        exitPrice = '0'
        stopLoss = '0'
        takeProfit = '0'
      } else {
        entryPrice = data.entryPrice
        exitPrice = data.exitPrice
        stopLoss = data.stopLoss
        takeProfit = data.exitPrice // Use exit price as take profit
      }

      const backtestData = {
        pair: data.pair,
        direction: data.direction,
        session: data.session,
        model: data.model,
        customModel: data.customModel,
        entryPrice,
        stopLoss,
        takeProfit,
        exitPrice,
        outcome: data.outcome,
        riskRewardRatio: rr,
        pnl: pnl,
        notes: data.notes,
        tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()) : [],
        images,
        cardPreviewImage: cardPreview,
        dateExecuted: new Date().toISOString(),
      }

      // Call onAdd if provided (API call happens in parent)
      if (onAdd) {
        await onAdd(backtestData)
      }

      // Reset form only after successful add
      reset()
      setImages([])
      setCardPreview('')
    } catch (error) {
      console.error('Error adding backtest:', error)
      // Error toast is handled in parent component
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Trade Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Backtest Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pair */}
            <div className="space-y-2 relative">
              <Label htmlFor="pair">Pair / Instrument *</Label>
              <Input
                id="pair"
                {...register('pair')}
                placeholder="EUR/USD, NAS100, GOLD, XAU/USD"
                className={errors.pair ? 'border-destructive' : ''}
                onChange={(e) => handlePairInputChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                autoComplete="off"
              />
              {errors.pair && (
                <p className="text-xs text-destructive">{String(errors.pair.message)}</p>
              )}
              
              {/* Suggestions Dropdown */}
              {showSuggestions && filteredInstruments.length > 0 && (
                <div 
                  ref={suggestionsRef}
                  className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
                >
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground mb-2 px-2">Suggestions:</p>
                    {['Forex', 'Indices', 'Commodities', 'Crypto'].map(category => {
                      const categoryItems = filteredInstruments.filter(
                        inst => inst.category === category
                      )
                      if (categoryItems.length === 0) return null
                      
                      return (
                        <div key={category} className="mb-2">
                          <p className="text-xs font-semibold text-muted-foreground px-2 py-1">
                            {category}
                          </p>
                          {categoryItems.map(inst => (
                            <button
                              key={inst.symbol}
                              type="button"
                              onClick={() => selectInstrument(inst.symbol)}
                              className="w-full text-left px-2 py-1.5 hover:bg-accent rounded text-sm"
                            >
                              {inst.symbol}
                            </button>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Direction */}
            <div className="space-y-2">
              <Label htmlFor="direction">Direction *</Label>
              <Select
                value={watchedDirection}
                onValueChange={(value) => setValue('direction', value as BacktestDirection)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Buy</SelectItem>
                  <SelectItem value="SELL">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Session */}
            <div className="space-y-2">
              <Label htmlFor="session">Trading Session *</Label>
              <Select
                value={watch('session')}
                onValueChange={(value) => setValue('session', value as BacktestSession)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASIAN">Asian</SelectItem>
                  <SelectItem value="LONDON">London</SelectItem>
                  <SelectItem value="NEW_YORK">New York</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Outcome */}
            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome *</Label>
              <Select
                value={watchedOutcome}
                onValueChange={(value) => setValue('outcome', value as BacktestOutcome)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WIN">Win</SelectItem>
                  <SelectItem value="LOSS">Loss</SelectItem>
                  <SelectItem value="BREAKEVEN">Breakeven</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Trading Model *</Label>
            <Select
              value={watchedModel}
              onValueChange={(value) => setValue('model', value as BacktestModel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ICT_2022">ICT 2022</SelectItem>
                <SelectItem value="MSNR">MSNR</SelectItem>
                <SelectItem value="TTFM">TTFM</SelectItem>
                <SelectItem value="PRICE_ACTION">Price Action</SelectItem>
                <SelectItem value="SUPPLY_DEMAND">Supply & Demand</SelectItem>
                <SelectItem value="SMART_MONEY">Smart Money Concepts</SelectItem>
                <SelectItem value="CUSTOM">Custom Model</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Model Name */}
          {watchedModel === 'CUSTOM' && (
            <div className="space-y-2">
              <Label htmlFor="customModel">Custom Model Name</Label>
              <Input
                id="customModel"
                {...register('customModel')}
                placeholder="Enter your custom model name"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Levels */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Price Levels & Execution</CardTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" type="button">
                  <Settings2 className="w-4 h-4 mr-2" />
                  {inputMode === 'manual' ? 'Full Manual' : 'Simple R:R'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleModeChange('manual')}>
                  <div className="flex flex-col">
                    <span className="font-semibold">Full Manual</span>
                    <span className="text-xs text-muted-foreground">Entry, Exit, Stop Loss</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleModeChange('simple')}>
                  <div className="flex flex-col">
                    <span className="font-semibold">Simple R:R</span>
                    <span className="text-xs text-muted-foreground">Just R:R and P&L</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {inputMode === 'manual' ? (
            // Manual Mode - Entry, Exit, Stop Loss
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryPrice">Entry Price *</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="0.00001"
                  {...register('entryPrice')}
                  placeholder={getPricePlaceholder()}
                  className={errors.entryPrice ? 'border-destructive' : ''}
                />
                {errors.entryPrice && (
                  <p className="text-xs text-destructive">{String(errors.entryPrice.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitPrice">Exit Price *</Label>
                <Input
                  id="exitPrice"
                  type="number"
                  step="0.00001"
                  {...register('exitPrice')}
                  placeholder={getPricePlaceholder()}
                  className={errors.exitPrice ? 'border-destructive' : ''}
                />
                {errors.exitPrice && (
                  <p className="text-xs text-destructive">{String(errors.exitPrice.message)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss *</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="0.00001"
                  {...register('stopLoss')}
                  placeholder={getPricePlaceholder()}
                  className={errors.stopLoss ? 'border-destructive' : ''}
                />
                {errors.stopLoss && (
                  <p className="text-xs text-destructive">{String(errors.stopLoss.message)}</p>
                )}
              </div>
            </div>
          ) : (
            // Simple R:R Mode - Just R:R and P&L
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="riskRewardRatio">R:R Ratio *</Label>
                <Input
                  id="riskRewardRatio"
                  type="number"
                  step="0.1"
                  {...register('riskRewardRatio')}
                  placeholder="4.5 (for 1:4.5)"
                  className={errors.riskRewardRatio ? 'border-destructive' : ''}
                />
                {errors.riskRewardRatio && (
                  <p className="text-xs text-destructive">{String(errors.riskRewardRatio.message)}</p>
                )}
                <p className="text-xs text-muted-foreground">Enter 4.5 for 1:4.5</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pnl">P&L (Points/Pips) *</Label>
                <Input
                  id="pnl"
                  type="number"
                  step="0.01"
                  {...register('pnl')}
                  placeholder="250 or -150"
                  className={errors.pnl ? 'border-destructive' : ''}
                />
                {errors.pnl && (
                  <p className="text-xs text-destructive">{String(errors.pnl.message)}</p>
                )}
                <p className="text-xs text-muted-foreground">Use - for losses (e.g., -150)</p>
              </div>
            </div>
          )}

          {/* Calculated Metrics */}
          {inputMode === 'manual' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Calculated R:R</p>
                <p className="text-lg font-bold">1:{calculateRR().toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">P&L (Points)</p>
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold ${calculatePnL() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {calculatePnL() >= 0 ? '+' : ''}{calculatePnL().toFixed(2)}
                  </p>
                  {calculatePnL() !== 0 && (
                    <Badge variant="outline" className="text-xs">
                      {calculatePnL() > 0 ? 'WIN' : calculatePnL() < 0 ? 'LOSS' : 'BE'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          {inputMode === 'simple' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">R:R Ratio</p>
                <p className="text-lg font-bold">1:{calculateRR().toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">P&L (Points)</p>
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold ${calculatePnL() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {calculatePnL() >= 0 ? '+' : ''}{calculatePnL().toFixed(2)}
                  </p>
                  {calculatePnL() !== 0 && (
                    <Badge variant="outline" className="text-xs">
                      {calculatePnL() > 0 ? 'WIN' : calculatePnL() < 0 ? 'LOSS' : 'BE'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes & Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes & Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Backtest Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Add your analysis, observations, and lessons learned from this backtest..."
              className="min-h-[150px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              {...register('tags')}
              placeholder="fibonacci, liquidity sweep, fair value gap"
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas for better organization
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Screenshots & Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Card Preview - Smaller */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Card Preview Image</Label>
            <div className="max-w-xs">
              {cardPreview ? (
                <div className="relative aspect-video group">
                  <Image
                    src={cardPreview}
                    alt="Card preview"
                    fill
                    className="object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setCardPreview('')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium">
                    Preview
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed rounded-lg aspect-video flex items-center justify-center cursor-pointer hover:border-primary transition-colors bg-muted/30">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file, true)
                    }}
                  />
                  <div className="text-center">
                    <Camera className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Upload</p>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Separator */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Additional Screenshots</Label>
            {/* Image Grid - Always show 6 slots */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className="space-y-2">
                  {images[idx] ? (
                    <div className="relative group aspect-video">
                      <Image
                        src={images[idx]}
                        alt={`Screenshot ${idx + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs">
                        #{idx + 1}
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded-lg aspect-video flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleImageUpload(file, false)
                        }}
                      />
                      <div className="text-center">
                        <Camera className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">#{idx + 1}</p>
                      </div>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            reset()
            setImages([])
            setCardPreview('')
          }}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Backtest'}
        </Button>
      </div>
    </form>
  )
}

