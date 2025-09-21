'use client'

import { useState } from 'react'
import { useI18n } from "@/lib/translations/client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "@/hooks/use-toast"
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
import { Loader2, User, DollarSign, Building, CheckCircle, ArrowRight } from "lucide-react"
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

// Popular brokers with logos/colors
const POPULAR_BROKERS = [
  { name: 'Interactive Brokers', category: 'Professional', color: 'blue' },
  { name: 'TD Ameritrade', category: 'US Retail', color: 'green' },
  { name: 'E*TRADE', category: 'US Retail', color: 'purple' },
  { name: 'Charles Schwab', category: 'US Retail', color: 'blue' },
  { name: 'Fidelity', category: 'US Retail', color: 'green' },
  { name: 'IC Markets', category: 'Forex/CFD', color: 'orange' },
  { name: 'Exness', category: 'Forex/CFD', color: 'red' },
  { name: 'MetaTrader 4', category: 'Platform', color: 'blue' },
  { name: 'MetaTrader 5', category: 'Platform', color: 'blue' },
  { name: 'cTrader', category: 'Platform', color: 'green' },
  { name: 'NinjaTrader', category: 'Platform', color: 'purple' },
  { name: 'TradingView', category: 'Platform', color: 'blue' },
]

const OTHER_BROKERS = [
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
  const t = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'broker' | 'details' | 'confirm'>('broker')
  const [selectedBroker, setSelectedBroker] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    getValues
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

  const onSubmit = async (data: CreateLiveAccountForm) => {
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

      toast({
        title: "Account created successfully!",
        description: `Your ${finalBroker} account has been added to your dashboard.`,
        variant: "default"
      })

      reset()
      setStep('broker')
      setSelectedBroker('')
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error creating live account:', error)
      toast({
        title: "Failed to create account",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    setStep('broker')
    setSelectedBroker('')
    onOpenChange(false)
  }

  const nextStep = () => {
    if (step === 'broker' && watchedBroker) {
      setStep('details')
    } else if (step === 'details') {
      setStep('confirm')
    }
  }

  const prevStep = () => {
    if (step === 'details') {
      setStep('broker')
    } else if (step === 'confirm') {
      setStep('details')
    }
  }

  // Removed getBrokerColor function as we'll use consistent theme colors

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
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
              <motion.div
                key="broker"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Select your broker</h3>
                  
                  {/* Popular Brokers */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Popular Brokers</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {POPULAR_BROKERS.map((broker) => (
                        <Card
                          key={broker.name}
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:shadow-md",
                            watchedBroker === broker.name
                              ? "ring-2 ring-primary bg-accent"
                              : "hover:bg-accent"
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
                  </div>

                  {/* Other Brokers Dropdown */}
                  <div className="space-y-2">
                    <Label>Or select from other brokers</Label>
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
                      className="space-y-2"
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
            )}

            {/* Step 2: Account Details */}
            {step === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Account Details</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Account Name *</Label>
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
                      <Label htmlFor="number">Account Number *</Label>
                      <Input
                        id="number"
                        placeholder="e.g., LIVE-123456"
                        {...register('number')}
                      />
                      {errors.number && (
                        <p className="text-sm text-red-500">{errors.number.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        6-20 characters, letters, numbers, and hyphens only
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startingBalance">Starting Balance *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="startingBalance"
                          type="number"
                          step="0.01"
                          min="10"
                          placeholder="10000.00"
                          className="pl-10"
                          {...register('startingBalance', { valueAsNumber: true })}
                        />
                      </div>
                      {errors.startingBalance && (
                        <p className="text-sm text-red-500">{errors.startingBalance.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Minimum $10 required
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Review
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Confirmation */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Review & Confirm</h3>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-chart-2" />
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
                          <p className="font-medium text-chart-2">
                            ${getValues('startingBalance')?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
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

