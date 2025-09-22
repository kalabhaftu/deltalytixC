'use client'

import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calculator, TrendingUp, TrendingDown } from 'lucide-react'
import { Trade } from '@prisma/client'
import { generateTradeHash } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { useRouter } from 'next/navigation'

// Common instruments for quick selection
const COMMON_INSTRUMENTS = [
  'ES', 'NQ', 'YM', 'RTY', // Futures
  'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', // Forex majors
  'XAUUSD', 'XAGUSD', // Metals
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', // Stocks
  'BTC/USD', 'ETH/USD', // Crypto
] as const

// Trading sessions
const TRADING_SESSIONS = [
  { value: 'asian', label: 'Asian Session' },
  { value: 'london', label: 'London Session' }, 
  { value: 'new-york', label: 'New York Session' },
  { value: 'overlap', label: 'Session Overlap' },
] as const

// Market bias options
const MARKET_BIAS = [
  { value: 'bullish', label: 'Bullish' },
  { value: 'bearish', label: 'Bearish' },
  { value: 'neutral', label: 'Neutral' },
] as const

// Trade types
const TRADE_TYPES = [
  { value: 'scalp', label: 'Scalp' },
  { value: 'intraday', label: 'Intraday' },
  { value: 'swing', label: 'Swing' },
  { value: 'position', label: 'Position' },
] as const

// Emotional states
const EMOTIONAL_STATES = [
  { value: 'confident', label: 'Confident' },
  { value: 'calm', label: 'Calm' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'fomo', label: 'FOMO' },
  { value: 'frustrated', label: 'Frustrated' },
  { value: 'overconfident', label: 'Overconfident' },
  { value: 'anxious', label: 'Anxious' },
] as const

// Form schema
const tradeFormSchema = z.object({
  // Basic execution details
  instrument: z.string().min(1, 'Instrument is required'),
  accountNumber: z.string().min(1, 'Account is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  side: z.enum(['LONG', 'SHORT']),
  entryPrice: z.string().min(1, 'Entry price is required'),
  closePrice: z.string().min(1, 'Close price is required'),
  entryDate: z.string().min(1, 'Entry date is required'),
  entryTime: z.string().min(1, 'Entry time is required'),
  closeDate: z.string().min(1, 'Close date is required'),
  closeTime: z.string().min(1, 'Close time is required'),
  pnl: z.number(),
  commission: z.number().default(0),
  
  // Analysis fields (optional)
  session: z.string().optional(),
  bias: z.string().optional(),
  tradeType: z.string().optional(),
  emotionalState: z.string().optional(),
  riskPercent: z.number().optional(),
  
  // Notes
  comment: z.string().optional(),
})

type TradeFormData = z.infer<typeof tradeFormSchema>

interface ManualTradeFormCardProps {
  accountId: string
  accountNumber?: string
}

export default function ManualTradeFormCard({ accountId, accountNumber: propFirmAccountNumber }: ManualTradeFormCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calculatedPnL, setCalculatedPnL] = useState<number | null>(null)
  const [calculatedDuration, setCalculatedDuration] = useState<string>('')
  
  const { toast } = useToast()
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const trades = useTradesStore(state => state.trades)
  const router = useRouter()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      entryDate: new Date().toISOString().split('T')[0],
      entryTime: new Date().toTimeString().split('T')[0].slice(0, 5),
      closeDate: new Date().toISOString().split('T')[0],
      closeTime: new Date().toTimeString().split('T')[0].slice(0, 5),
      quantity: 1,
      commission: 0,
      pnl: 0,
      accountNumber: propFirmAccountNumber || '',
    }
  })

  // Watch form values for calculations
  const watchedValues = watch()

  // Auto-calculate P&L when prices change
  useEffect(() => {
    const { entryPrice, closePrice, quantity, side, commission } = watchedValues
    
    if (entryPrice && closePrice && quantity) {
      const entry = parseFloat(entryPrice)
      const close = parseFloat(closePrice)
      const qty = quantity
      const comm = commission || 0
      
      let pnl = 0
      if (side === 'LONG') {
        pnl = (close - entry) * qty - comm
      } else if (side === 'SHORT') {
        pnl = (entry - close) * qty - comm
      }
      
      setCalculatedPnL(pnl)
      setValue('pnl', pnl)
    }
  }, [watchedValues.entryPrice, watchedValues.closePrice, watchedValues.quantity, watchedValues.side, watchedValues.commission, setValue])

  // Auto-calculate duration
  useEffect(() => {
    const { entryDate, entryTime, closeDate, closeTime } = watchedValues
    
    if (entryDate && entryTime && closeDate && closeTime) {
      try {
        const entryDateTime = new Date(`${entryDate}T${entryTime}`)
        const closeDateTime = new Date(`${closeDate}T${closeTime}`)
        
        const diffMs = closeDateTime.getTime() - entryDateTime.getTime()
        if (diffMs > 0) {
          const hours = Math.floor(diffMs / (1000 * 60 * 60))
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
          
          if (hours > 0) {
            setCalculatedDuration(`${hours}h ${minutes}m`)
          } else {
            setCalculatedDuration(`${minutes}m`)
          }
        }
      } catch (error) {
        setCalculatedDuration('')
      }
    }
  }, [watchedValues.entryDate, watchedValues.entryTime, watchedValues.closeDate, watchedValues.closeTime, watchedValues])

  // Get unified accounts for dropdown
  const [unifiedAccounts, setUnifiedAccounts] = useState<Array<{id: string, number: string, displayName: string, accountType: string}>>([])
  
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch('/api/accounts')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUnifiedAccounts(data.data)
          }
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      }
    }
    fetchAccounts()
  }, [])

  const existingAccounts = unifiedAccounts.map(account => account.number)

  const onSubmit = async (data: TradeFormData) => {
    const currentUser = user || supabaseUser
    if (!currentUser?.id) {
      toast({
        title: 'Authentication Error',
        description: 'Please sign in to add trades.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Combine date and time for entry/close timestamps
      const entryDateTime = `${data.entryDate} ${data.entryTime}`
      const closeDateTime = `${data.closeDate} ${data.closeTime}`
      
      // Calculate time in position (in hours)
      const entryDate = new Date(`${data.entryDate}T${data.entryTime}`)
      const closeDate = new Date(`${data.closeDate}T${data.closeTime}`)
      const timeInPosition = (closeDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60)

      // Create trade object
      const tradeData: Partial<Trade> = {
        accountNumber: data.accountNumber,
        instrument: data.instrument,
        quantity: data.quantity,
        side: data.side,
        entryPrice: data.entryPrice,
        closePrice: data.closePrice,
        entryDate: entryDateTime,
        closeDate: closeDateTime,
        pnl: data.pnl,
        commission: data.commission,
        timeInPosition,
        comment: data.comment || null,
        userId: currentUser.id,
        tags: [], // Can be extended later
        entryId: null,
        closeId: null,
        videoUrl: null,
        imageBase64: null,
        imageBase64Second: null,
        imageBase64Third: null,
        imageBase64Fourth: null,
        groupId: null,
      }

      // Generate unique ID for the trade
      const tradeId = generateTradeHash({ ...tradeData, userId: currentUser.id })
      const completeTrade: Trade = {
        ...tradeData,
        id: tradeId,
        createdAt: new Date(),
      } as Trade

      // Import the save function
      const { saveTradesAction } = await import("@/server/database")
      
      // Save trade
      const result = await saveTradesAction([completeTrade])
      
      if (result.error) {
        if (result.error === "DUPLICATE_TRADES") {
          toast({
            title: 'Duplicate Trade',
            description: 'A trade with these details already exists.',
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Save Failed', 
            description: 'Failed to save trade. Please try again.',
            variant: 'destructive',
          })
        }
        return
      }

      toast({
        title: 'Trade Added',
        description: 'Your trade has been successfully added to the journal.',
      })

      // Navigate back to trades list
      router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)

    } catch (error) {
      console.error('Error saving trade:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-h-none">
      <CardHeader>
        <CardTitle className="text-base">Add Single Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <form id="manual-trade-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Basic Trade Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trade Execution</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="instrument">Instrument *</Label>
              <Controller
                name="instrument"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select or type instrument" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_INSTRUMENTS.map(instrument => (
                        <SelectItem key={instrument} value={instrument}>
                          {instrument}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {!COMMON_INSTRUMENTS.includes(watchedValues.instrument as any) && (
                <Input
                  placeholder="Or type custom instrument"
                  {...register('instrument')}
                />
              )}
              {errors.instrument && (
                <p className="text-sm text-red-500">{errors.instrument.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account *</Label>
              <Controller
                name="accountNumber"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {existingAccounts.map(account => (
                        <SelectItem key={account} value={account}>
                          {account}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.accountNumber && (
                <p className="text-sm text-red-500">{errors.accountNumber.message}</p>
              )}
              {existingAccounts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No accounts found. Please create an account first.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="side">Direction *</Label>
              <Controller
                name="side"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select direction" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LONG">
                        <div className="flex items-center">
                          <TrendingUp className="w-4 h-4 mr-2 text-green-500" />
                          Long
                        </div>
                      </SelectItem>
                      <SelectItem value="SHORT">
                        <div className="flex items-center">
                          <TrendingDown className="w-4 h-4 mr-2 text-red-500" />
                          Short
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.side && (
                <p className="text-sm text-red-500">{errors.side.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && (
                <p className="text-sm text-red-500">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price *</Label>
              <Input
                type="number"
                step="0.01"
                {...register('entryPrice')}
              />
              {errors.entryPrice && (
                <p className="text-sm text-red-500">{errors.entryPrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="closePrice">Close Price *</Label>
              <Input
                type="number"
                step="0.01"
                {...register('closePrice')}
              />
              {errors.closePrice && (
                <p className="text-sm text-red-500">{errors.closePrice.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Date & Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Timing</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="entryDate">Entry Date *</Label>
              <Input
                type="date"
                {...register('entryDate')}
              />
              {errors.entryDate && (
                <p className="text-sm text-red-500">{errors.entryDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entryTime">Entry Time *</Label>
              <Input
                type="time"
                {...register('entryTime')}
              />
              {errors.entryTime && (
                <p className="text-sm text-red-500">{errors.entryTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="closeDate">Close Date *</Label>
              <Input
                type="date"
                {...register('closeDate')}
              />
              {errors.closeDate && (
                <p className="text-sm text-red-500">{errors.closeDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="closeTime">Close Time *</Label>
              <Input
                type="time"
                {...register('closeTime')}
              />
              {errors.closeTime && (
                <p className="text-sm text-red-500">{errors.closeTime.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* P&L and Commission */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Calculator className="w-4 h-4 mr-2" />
              Financial Results
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="pnl">P&L</Label>
              <Input
                type="number"
                step="0.01"
                {...register('pnl', { valueAsNumber: true })}
                className={calculatedPnL !== null ? (calculatedPnL >= 0 ? 'border-green-500' : 'border-red-500') : ''}
              />
              {calculatedPnL !== null && (
                <p className={`text-sm ${calculatedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Auto-calculated: ${calculatedPnL.toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="commission">Commission</Label>
              <Input
                type="number"
                step="0.01"
                {...register('commission', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <div className="p-2 bg-muted rounded text-sm">
                {calculatedDuration || 'Will calculate automatically'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analysis & Context (Optional) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Analysis & Context (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-0">
            <div className="space-y-2">
              <Label htmlFor="session">Trading Session</Label>
              <Controller
                name="session"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select session" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADING_SESSIONS.map(session => (
                        <SelectItem key={session.value} value={session.value}>
                          {session.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bias">Market Bias</Label>
              <Controller
                name="bias"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bias" />
                    </SelectTrigger>
                    <SelectContent>
                      {MARKET_BIAS.map(bias => (
                        <SelectItem key={bias.value} value={bias.value}>
                          {bias.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradeType">Trade Type</Label>
              <Controller
                name="tradeType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TRADE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emotionalState">Emotional State</Label>
              <Controller
                name="emotionalState"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select emotion" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMOTIONAL_STATES.map(emotion => (
                        <SelectItem key={emotion.value} value={emotion.value}>
                          {emotion.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2 md:col-span-2 lg:col-span-4">
              <Label htmlFor="comment">Trade Notes</Label>
              <Textarea
                placeholder="Analysis, confluence factors, market conditions, lessons learned..."
                className="min-h-[60px]"
                {...register('comment')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="manual-trade-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding Trade...' : 'Add Trade'}
          </Button>
        </div>
        </form>
      </CardContent>
    </Card>
  )
}