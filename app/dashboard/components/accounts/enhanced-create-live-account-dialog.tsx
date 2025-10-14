'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { clearAccountsCache } from "@/hooks/use-accounts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Loader2, User, DollarSign, Building, CheckCircle, ArrowRight, HelpCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

// Enhanced schema with better validation
const createLiveAccountSchema = z.object({
  name: z.string().min(3, 'Account name must be at least 3 characters').max(50, 'Account name too long'),
  number: z.string().min(6, 'Account number must be at least 6 characters').max(20, 'Account number too long'),
  startingBalance: z.number().min(10, 'Starting balance must be at least $10').max(1000000, 'Starting balance too high'),
  broker: z.string().min(1, 'Please select a broker'),
  customBroker: z.string().optional(),
})

type CreateLiveAccountForm = z.infer<typeof createLiveAccountSchema>

// Popular brokers - Desktop shows all, Mobile shows only first 5
const POPULAR_BROKERS = [
  { name: 'Exness', category: 'Forex/CFD' },
  { name: 'FBS', category: 'Forex/CFD' },
  { name: 'IC Markets', category: 'Forex/CFD' },
  { name: 'MetaTrader 5', category: 'Platform' },
  { name: 'NinjaTrader', category: 'Platform' },
  { name: 'cTrader', category: 'Platform' },
  { name: 'TradingView', category: 'Platform' },
]

// Mobile shows only first 5, rest go here
const MOBILE_BROKER_COUNT = 5

const OTHER_BROKERS = [
  'cTrader', 'TradingView', // Desktop popular brokers that don't fit on mobile
  'Alpaca', 'Robinhood', 'Webull', 'Tastyworks', 'TradeStation', 
  'Thinkorswim', 'OANDA', 'FXCM', 'Pepperstone', 'XTB',
  'eToro', 'Plus500', 'AvaTrade', 'XM', 'Admiral Markets'
]

interface EnhancedCreateLiveAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EnhancedCreateLiveAccountDialog({
  open,
  onOpenChange,
  onSuccess
}: EnhancedCreateLiveAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'broker' | 'details' | 'confirm'>('broker')
  const [selectedBroker, setSelectedBroker] = useState('')
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues,
    trigger
  } = useForm<CreateLiveAccountForm>({
    resolver: zodResolver(createLiveAccountSchema),
    defaultValues: {
      name: '',
      number: '',
      startingBalance: 10000,
      broker: '',
      customBroker: ''
    }
  })

  const watchedBroker = watch('broker')
  const watchedBalance = watch('startingBalance')

  const onSubmit = useCallback(async (data: CreateLiveAccountForm) => {
    try {
      setIsSubmitting(true)

      const finalBroker = data.broker === 'Other' ? data.customBroker : data.broker

      const payload = {
        name: data.name.trim(),
        number: data.number.trim(),
        startingBalance: data.startingBalance,
        broker: finalBroker
      }

      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account')
      }

      toast.success("Account created successfully!", {
        description: `Your ${finalBroker} account has been added to your dashboard.`,
      })

      // Clear cache to ensure immediate refresh
      clearAccountsCache()

      reset()
      setStep('broker')
      setSelectedBroker('')
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error creating live account:', error)
      toast.error("Failed to create account", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      })
    } finally {
      setIsSubmitting(false)
    }
  }, [reset, onSuccess, onOpenChange])

  const handleCancel = () => {
    reset()
    setStep('broker')
    setSelectedBroker('')
    onOpenChange(false)
  }

  const nextStep = async () => {
    if (step === 'broker' && watchedBroker) {
      setStep('details')
    } else if (step === 'details') {
      // Validate the form before proceeding to confirm
      const isValid = await trigger(['name', 'number', 'startingBalance'])
      if (isValid) {
        setStep('confirm')
      }
    }
  }

  // Auto-submit when reaching confirmation step (like prop firm dialog behavior)
  useEffect(() => {
    if (step === 'confirm' && !isSubmitting) {
      // Small delay to show the confirmation step briefly, then auto-submit
      const timer = setTimeout(() => {
        handleSubmit(onSubmit)()
      }, 1500) // 1.5 second delay to let user see the summary
      
      return () => clearTimeout(timer)
    }
  }, [step, isSubmitting, handleSubmit, onSubmit])

  const prevStep = () => {
    if (step === 'details') {
      setStep('broker')
    } else if (step === 'confirm') {
      setStep('details')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Create Live Trading Account
          </DialogTitle>
          <DialogDescription>
            Add your live trading account to track performance and analyze trades
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          {['broker', 'details', 'confirm'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === s || (['broker', 'details', 'confirm'].indexOf(step) > index)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </div>
              {index < 2 && (
                <div className={cn(
                  "w-12 h-0.5 mx-2",
                  (['broker', 'details', 'confirm'].indexOf(step) > index)
                    ? "bg-primary"
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* Step 1: Broker Selection */}
            {step === 'broker' && (
              <TooltipProvider>
                <motion.div
                  key="broker"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Broker Selection
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Choose your trading broker to connect your live account
                    </p>
                    
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          Popular Brokers
                        </CardTitle>
                        <CardDescription>
                          Select from commonly used trading platforms
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                          {(isMobile ? POPULAR_BROKERS.slice(0, MOBILE_BROKER_COUNT) : POPULAR_BROKERS).map((broker) => (
                            <Card
                              key={broker.name}
                              className={cn(
                                "cursor-pointer transition-all duration-200 hover:shadow-md",
                                watchedBroker === broker.name
                                  ? "ring-2 ring-foreground bg-muted"
                                  : "hover:bg-muted/50"
                              )}
                              onClick={() => setValue('broker', broker.name)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{broker.name}</p>
                                    <p className="text-xs text-muted-foreground">{broker.category}</p>
                                  </div>
                                  <div className={cn(
                                    "w-3 h-3 rounded-full",
                                    watchedBroker === broker.name ? "bg-primary" : "bg-muted"
                                  )} />
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Other Brokers Dropdown */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium">Other Brokers</Label>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Can&apos;t find your broker? Select from our extended list</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Select onValueChange={(value) => setValue('broker', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Search other brokers..." />
                            </SelectTrigger>
                            <SelectContent>
                              {OTHER_BROKERS.map((broker) => (
                                <SelectItem key={broker} value={broker}>
                                  {broker}
                                </SelectItem>
                              ))}
                              <SelectItem value="Other">Other (Custom)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Custom Broker Input */}
                        {watchedBroker === 'Other' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2 mt-4"
                          >
                            <Label htmlFor="customBroker">Custom Broker Name</Label>
                            <Input
                              id="customBroker"
                              placeholder="Enter your broker name"
                              {...register('customBroker')}
                            />
                            {errors.customBroker && (
                              <p className="text-sm text-red-500">{errors.customBroker.message}</p>
                            )}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!watchedBroker}
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              </TooltipProvider>
            )}

            {/* Step 2: Account Details */}
            {step === 'details' && (
              <TooltipProvider>
                <motion.div
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Account Details
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure your live trading account information
                    </p>
                    
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Account Information
                        </CardTitle>
                        <CardDescription>
                          Basic details for your trading account
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label htmlFor="name" className="text-sm font-medium">Account Name</Label>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>A friendly name to identify this account</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Input
                              id="name"
                              placeholder="e.g., My Trading Account"
                              {...register('name')}
                            />
                            {errors.name && (
                              <p className="text-sm text-red-500">{errors.name.message}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label htmlFor="number" className="text-sm font-medium">Account Number</Label>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Your broker&apos;s account identifier (6-20 characters)</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Input
                              id="number"
                              placeholder="e.g., LIVE-123456"
                              {...register('number')}
                            />
                            {errors.number && (
                              <p className="text-sm text-red-500">{errors.number.message}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              6-20 characters, letters, numbers, and hyphens only
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <Label htmlFor="startingBalance" className="text-sm font-medium">Starting Balance</Label>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Your account&apos;s initial balance (minimum $10)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="startingBalance"
                              type="number"
                              step="0.01"
                              min="10"
                              max="1000000"
                              placeholder="10000.00"
                              className="pl-10"
                              {...register('startingBalance', { valueAsNumber: true })}
                            />
                          </div>
                          {errors.startingBalance && (
                            <p className="text-sm text-red-500">{errors.startingBalance.message}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Current balance: ${(watchedBalance || 0).toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={prevStep}>
                      Back
                    </Button>
                    <Button type="button" onClick={nextStep}>
                      Review & Create
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              </TooltipProvider>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Review & Confirm
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {isSubmitting ? 'Creating your account...' : 'Please review your account details - creating automatically...'}
                  </p>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Account Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Account Name</p>
                          <p className="font-medium">{getValues('name')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Account Number</p>
                          <p className="font-medium">{getValues('number')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Broker</p>
                          <p className="font-medium">
                            {getValues('broker') === 'Other' ? getValues('customBroker') : getValues('broker')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Starting Balance</p>
                          <p className="font-medium">${getValues('startingBalance')?.toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <div className="space-x-2">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </DialogContent>
    </Dialog>
  )
}
