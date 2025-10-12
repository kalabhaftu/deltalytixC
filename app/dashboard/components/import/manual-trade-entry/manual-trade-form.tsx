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
import { toast } from 'sonner'
import { Calculator, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { Trade } from '@prisma/client'
import { generateTradeHash } from '@/lib/utils'
import { useUserStore } from '@/store/user-store'
import { useTradesStore } from '@/store/trades-store'
import { useAccounts } from '@/hooks/use-accounts'

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
  
  // Risk management (required)
  stopLoss: z.string().min(1, 'Stop Loss is required'),
  takeProfit: z.string().min(1, 'Take Profit is required'),
  
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

interface ManualTradeFormProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7

const TOTAL_STEPS = 7

export default function ManualTradeForm({ setIsOpen }: ManualTradeFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [phaseValidationError, setPhaseValidationError] = useState<string | null>(null)
  const [calculatedPnL, setCalculatedPnL] = useState<number | null>(null)
  const [calculatedDuration, setCalculatedDuration] = useState<string>('')
  
  const user = useUserStore(state => state.user)
  const supabaseUser = useUserStore(state => state.supabaseUser)
  const trades = useTradesStore(state => state.trades)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    mode: 'onChange',
    defaultValues: {
      entryDate: new Date().toISOString().split('T')[0],
      entryTime: new Date().toTimeString().split(' ')[0].slice(0, 5),   
      closeDate: new Date().toISOString().split('T')[0],
      closeTime: new Date().toTimeString().split(' ')[0].slice(0, 5),
      quantity: 1,
      commission: 0,
      pnl: 0,
      stopLoss: '',
      takeProfit: '',
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

  // Get unified accounts for dropdown - same as CSV import
  const { accounts: allAccounts, isLoading: isLoadingAccounts } = useAccounts()
  
  // For manual trade entry, only show active phases (where user can add trades)
  // Use same logic as account-selection component
  const unifiedAccounts = React.useMemo(() => {
    return allAccounts.filter(acc => {
      // Show all live accounts
      if (acc.accountType === 'live') return true
      
      // For prop-firm accounts: only show active phases (NOT passed or failed)
      if (acc.accountType === 'prop-firm') {
        // Check phase status - must be active (not passed, not failed)
        const phaseStatus = (acc as any).currentPhase?.status || acc.status
        return phaseStatus === 'active'
      }
      
      return false
    })
  }, [allAccounts])

  const existingAccounts = unifiedAccounts.map(account => account.number)

  // Step validation
  const validateStep = (step: Step): boolean => {
    const values = watchedValues
    
    switch (step) {
      case 1: // Account & Instrument
        return !!(values.accountNumber && values.instrument)
      case 2: // Trade Execution
        return !!(values.side && values.quantity && values.entryPrice && values.closePrice)
      case 3: // Timing
        return !!(values.entryDate && values.entryTime && values.closeDate && values.closeTime)
      case 4: // Risk Management
        return !!(values.stopLoss && values.takeProfit)
      case 5: // Financial Details
        return true // Commission is optional, defaults to 0
      case 6: // Analysis (all optional)
        return true
      case 7: // Review
        return true
      default:
        return false
    }
  }

  const canProceedToNext = validateStep(currentStep)

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && canProceedToNext) {
      setCurrentStep((currentStep + 1) as Step)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  const getStepTitle = (step: Step): string => {
    switch (step) {
      case 1: return 'Select Account & Instrument'
      case 2: return 'Trade Execution Details'
      case 3: return 'Entry & Exit Timing'
      case 4: return 'Risk Management'
      case 5: return 'Financial Details'
      case 6: return 'Trade Analysis'
      case 7: return 'Review & Confirm'
      default: return ''
    }
  }

  const onSubmit = async (data: TradeFormData) => {
    const currentUser = user || supabaseUser
    if (!currentUser?.id) {
      toast.error('Authentication Error', {
        description: 'Please sign in to add trades.',
      })
      return
    }

    setIsSubmitting(true)
    setPhaseValidationError(null)
    
    try {
      // Check if this is a prop firm account and validate phase ID
      if (data.accountNumber) {
        try {
          const phaseCheckResponse = await fetch(`/api/prop-firm-v2/accounts/validate-trade`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accountNumber: data.accountNumber
            })
          })
          
          const phaseResult = await phaseCheckResponse.json()
          
          if (!phaseCheckResponse.ok) {
            if (phaseCheckResponse.status === 403) {
              setPhaseValidationError(phaseResult.error || 'Please set the ID for the current phase before adding trades.')
              toast.error("Phase ID Required", {
                description: phaseResult.error || "Please set the ID for the current phase before adding trades.",
              })
              return
            }
          }
        } catch (error) {
          // If it's not a prop firm account or validation API doesn't exist, continue normally
        }
      }
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
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        comment: data.comment || null,
        userId: currentUser.id,
        entryId: null,
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

      // Find account by number to get accountId
      const targetAccount = unifiedAccounts.find(acc => acc.number === data.accountNumber)
      
      if (!targetAccount) {
        toast.error('Account Not Found', {
          description: 'Could not find the selected account. Please try again.',
        })
        return
      }

      // Atomic save and link operation
      const { saveAndLinkTrades } = await import("@/server/accounts")
      const result = await saveAndLinkTrades(targetAccount.id, [completeTrade])

      // Handle duplicate trades case
      if (result.isDuplicate) {
        toast.info("Trade Already Exists", {
          description: 'message' in result ? result.message : "This trade already exists in the account",
          duration: 5000,
        })
        return
      }

      toast.success('Trade Added', {
        description: `Trade successfully saved and linked to ${'accountName' in result ? result.accountName : 'the account'}`,
      })

      // Invalidate accounts cache to trigger refresh
      const { invalidateAccountsCache } = await import("@/hooks/use-accounts")
      invalidateAccountsCache('trade saved')

      // Close the dialog
      setIsOpen(false)

    } catch (error) {
      console.error('Error in save and link trade:', error)
      
      // Provide more specific error messages based on error type
      let errorMessage = 'An error occurred while saving the trade. Please try again.'
      let errorTitle = 'Save Failed'
      
      if (error instanceof Error) {
        if (error.message.includes('phase transition')) {
          errorTitle = "Phase Transition Required"
          errorMessage = error.message
        } else if (error.message.includes('account')) {
          errorTitle = "Account Error"
          errorMessage = error.message
        } else if (error.message.includes('authentication')) {
          errorTitle = "Authentication Error"
          errorMessage = "Please log in again and try saving your trade."
        } else {
          errorMessage = error.message
        }
      }
      
      toast.error(errorTitle, {
        description: errorMessage,
        duration: 8000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Select Account & Instrument</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account *</Label>
                {isLoadingAccounts ? (
                  <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                    Loading accounts...
                  </div>
                ) : (
                  <Controller
                    name="accountNumber"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value} disabled={existingAccounts.length === 0}>
                        <SelectTrigger>
                          <SelectValue placeholder={existingAccounts.length === 0 ? "No active accounts found" : "Select account"} />
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
                )}
                {errors.accountNumber && (
                  <p className="text-sm text-red-500">{errors.accountNumber.message}</p>
                )}
                {!isLoadingAccounts && existingAccounts.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No active accounts found. Please create a live account or ensure your prop firm account is in an active phase.
                  </p>
                )}
              </div>

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
                <Input
                  placeholder="Or type custom instrument"
                  {...register('instrument')}
                  className="mt-2"
                />
                {errors.instrument && (
                  <p className="text-sm text-red-500">{errors.instrument.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trade Execution Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
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
        )

      case 3:
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Entry & Exit Timing</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
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

              {calculatedDuration && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Trade Duration</Label>
                  <div className="p-3 bg-muted rounded-md text-sm font-medium">
                    {calculatedDuration}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 4:
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="stopLoss">Stop Loss *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter stop loss price"
                  {...register('stopLoss')}
                />
                {errors.stopLoss && (
                  <p className="text-sm text-red-500">{errors.stopLoss.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="takeProfit">Take Profit *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Enter take profit price"
                  {...register('takeProfit')}
                />
                {errors.takeProfit && (
                  <p className="text-sm text-red-500">{errors.takeProfit.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case 5:
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
              <div className="space-y-2">
                <Label htmlFor="commission">Commission (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...register('commission', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label>P&L (Auto-calculated)</Label>
                <div className={`p-3 rounded-md text-sm font-medium ${
                  calculatedPnL !== null 
                    ? calculatedPnL >= 0 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-muted'
                }`}>
                  {calculatedPnL !== null ? `$${calculatedPnL.toFixed(2)}` : 'Calculating...'}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 6:
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Trade Analysis (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-0">
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="comment">Trade Notes</Label>
                <Textarea
                  placeholder="Analysis, confluence factors, market conditions, lessons learned..."
                  className="min-h-[80px]"
                  {...register('comment')}
                />
              </div>
            </CardContent>
          </Card>
        )

      case 7:
        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Review & Confirm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {phaseValidationError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{phaseValidationError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Account</p>
                  <p className="font-medium">{watchedValues.accountNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Instrument</p>
                  <p className="font-medium">{watchedValues.instrument}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Direction</p>
                  <p className="font-medium">{watchedValues.side}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Quantity</p>
                  <p className="font-medium">{watchedValues.quantity}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entry Price</p>
                  <p className="font-medium">${watchedValues.entryPrice}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Close Price</p>
                  <p className="font-medium">${watchedValues.closePrice}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Entry Date & Time</p>
                  <p className="font-medium">{watchedValues.entryDate} {watchedValues.entryTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Close Date & Time</p>
                  <p className="font-medium">{watchedValues.closeDate} {watchedValues.closeTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Stop Loss</p>
                  <p className="font-medium">${watchedValues.stopLoss}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Take Profit</p>
                  <p className="font-medium">${watchedValues.takeProfit}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Commission</p>
                  <p className="font-medium">${watchedValues.commission || 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">P&L</p>
                  <p className={`font-medium ${calculatedPnL !== null && calculatedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${calculatedPnL?.toFixed(2) || '0.00'}
                  </p>
                </div>
                {calculatedDuration && (
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{calculatedDuration}</p>
                  </div>
                )}
                {watchedValues.session && (
                  <div>
                    <p className="text-muted-foreground">Session</p>
                    <p className="font-medium">{watchedValues.session}</p>
                  </div>
                )}
                {watchedValues.comment && (
                  <div className="md:col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{watchedValues.comment}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="text-center mb-3 px-6 pt-1">
        <h3 className="text-base font-semibold">Add Single Trade</h3>
        <p className="text-xs text-muted-foreground">
          Step {currentStep} of {TOTAL_STEPS}: {getStepTitle(currentStep)}
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="px-6 mb-4">
        <div className="flex items-center justify-center space-x-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-colors ${
                step === currentStep
                  ? 'bg-primary'
                  : step < currentStep
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        <form id="manual-trade-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {renderStepContent()}
        </form>
      </div>
      
      {/* Form Actions - Navigation Buttons */}
      <div className="flex justify-between bg-background border-t px-6 py-3 mt-auto">
        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
            >
              Back
            </Button>
          )}
        </div>
        <div>
          {currentStep < TOTAL_STEPS ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceedToNext}
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              form="manual-trade-form"
              disabled={isSubmitting || !canProceedToNext}
            >
              {isSubmitting ? 'Adding Trade...' : 'Add Trade'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
