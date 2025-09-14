'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/locales/client"
import { Loader2, Building2, DollarSign, Target, Shield, CheckCircle, ArrowRight, Info, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

// Base schema
const baseSchema = z.object({
  name: z.string().min(3, 'Account name must be at least 3 characters').max(50, 'Account name too long'),
  number: z.string().min(6, 'Account number must be at least 6 characters').max(20, 'Account number too long'),
  propfirm: z.string().min(1, 'Please select a prop firm'),
  customPropfirm: z.string().optional(),
  startingBalance: z.number().min(1000, 'Starting balance must be at least $1,000'),
  evaluationType: z.enum(['one_step', 'two_step', 'instant_funding']),
  profitTargetPhase1: z.number().min(1, 'Phase 1 profit target is required'),
  profitTargetPhase2: z.number().min(1, 'Phase 2 profit target is required').optional(),
  dailyDrawdown: z.number().min(1, 'Daily drawdown limit is required'),
  maxDrawdown: z.number().min(1, 'Maximum drawdown limit is required'),
  // Payout configuration
  payoutCycleDays: z.number().min(1).max(365).default(14),
  profitSplitPercent: z.number().min(0).max(100).default(80),
  minDaysToFirstPayout: z.number().min(0).max(90).default(4),
})

// Dynamic schema that validates Phase 2 target for two-step evaluations
const createPropFirmAccountSchema = baseSchema.refine(
  (data) => {
    if (data.evaluationType === 'two_step') {
      return data.profitTargetPhase2 !== undefined && data.profitTargetPhase2 > 0
    }
    return true
  },
  {
    message: 'Phase 2 profit target is required for two-step evaluations',
    path: ['profitTargetPhase2']
  }
)

type CreatePropFirmAccountForm = z.infer<typeof createPropFirmAccountSchema>

// Popular prop firms with their typical rules
const PROP_FIRMS = [
  {
    name: 'FTMO',
    category: 'Popular',
    color: 'blue',
    typical: {
      profitTarget: 10,
      dailyDrawdown: 5,
      maxDrawdown: 10,
      evaluationType: 'two_step' as const
    }
  },
  {
    name: 'MyForexFunds',
    category: 'Popular',
    color: 'green',
    typical: {
      profitTarget: 8,
      dailyDrawdown: 5,
      maxDrawdown: 12,
      evaluationType: 'one_step' as const
    }
  },
  {
    name: 'The5ers',
    category: 'Popular',
    color: 'purple',
    typical: {
      profitTarget: 8,
      dailyDrawdown: 4,
      maxDrawdown: 8,
      evaluationType: 'two_step' as const
    }
  },
  {
    name: 'TopstepTrader',
    category: 'Futures',
    color: 'orange',
    typical: {
      profitTarget: 6,
      dailyDrawdown: 3,
      maxDrawdown: 6,
      evaluationType: 'one_step' as const
    }
  },
  {
    name: 'Earn2Trade',
    category: 'Futures',
    color: 'red',
    typical: {
      profitTarget: 6,
      dailyDrawdown: 3,
      maxDrawdown: 6,
      evaluationType: 'one_step' as const
    }
  },
  {
    name: 'OneUp Trader',
    category: 'Popular',
    color: 'green',
    typical: {
      profitTarget: 8,
      dailyDrawdown: 5,
      maxDrawdown: 8,
      evaluationType: 'one_step' as const
    }
  },
  {
    name: 'SurgeTrader',
    category: 'Popular',
    color: 'blue',
    typical: {
      profitTarget: 10,
      dailyDrawdown: 5,
      maxDrawdown: 10,
      evaluationType: 'one_step' as const
    }
  },
  {
    name: 'FundedNext',
    category: 'Popular',
    color: 'purple',
    typical: {
      profitTarget: 8,
      dailyDrawdown: 5,
      maxDrawdown: 10,
      evaluationType: 'two_step' as const
    }
  },
]

const OTHER_PROP_FIRMS = [
  'TrueForexFunds', 'Equity Edge', 'Maven', 'Funding Pips', 'Top Step',
  'Apex Trader Funding', 'Leeloo Trading', 'City Traders Imperium',
  'Smart Prop Trader', 'Funded Trading Plus', 'Blue Guardian'
]

interface EnhancedCreateAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EnhancedCreateAccountDialog({
  open,
  onOpenChange,
  onSuccess
}: EnhancedCreateAccountDialogProps) {
  const t = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'propfirm' | 'details' | 'rules' | 'confirm'>('propfirm')

  const form = useForm<CreatePropFirmAccountForm>({
    resolver: zodResolver(createPropFirmAccountSchema),
    defaultValues: {
      name: '',
      number: '',
      propfirm: '',
      customPropfirm: '',
      startingBalance: 100000,
      evaluationType: 'two_step',
      profitTargetPhase1: 8,
      profitTargetPhase2: 5,
      dailyDrawdown: 5,
      maxDrawdown: 10,
    }
  })

  const { register, handleSubmit, formState: { errors, isValid }, reset, setValue, watch, getValues } = form
  
  // Debug validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log('Form validation errors:', errors)
      console.log('Form is valid:', isValid)
      console.log('Current form values:', getValues())
    }
  }, [errors, isValid, getValues])
  const watchedPropfirm = watch('propfirm')
  const watchedBalance = watch('startingBalance')
  const watchedEvaluationType = watch('evaluationType')

  // Clear Phase 2 target when switching to one-step evaluation
  useEffect(() => {
    if (watchedEvaluationType !== 'two_step') {
      setValue('profitTargetPhase2', undefined)
    }
  }, [watchedEvaluationType, setValue])

  // Auto-fill typical rules when prop firm is selected
  const handlePropFirmSelect = (propfirmName: string) => {
    setValue('propfirm', propfirmName)
    
    const propfirm = PROP_FIRMS.find(pf => pf.name === propfirmName)
    if (propfirm) {
      setValue('evaluationType', propfirm.typical.evaluationType)
      // Set profit targets based on evaluation type
      if (propfirm.typical.evaluationType === 'two_step') {
        setValue('profitTargetPhase1', 8) // Standard Phase 1: 8%
        setValue('profitTargetPhase2', 5) // Standard Phase 2: 5%
      } else {
        setValue('profitTargetPhase1', propfirm.typical.profitTarget)
        setValue('profitTargetPhase2', undefined)
      }
      setValue('dailyDrawdown', propfirm.typical.dailyDrawdown)
      setValue('maxDrawdown', propfirm.typical.maxDrawdown)
    }
  }

  const onSubmit = async (data: CreatePropFirmAccountForm) => {
    try {
      setIsSubmitting(true)
      console.log('Form submission started with data:', data)

      const finalPropfirm = data.propfirm === 'Other' ? data.customPropfirm : data.propfirm

      const payload = {
        name: data.name.trim(),
        number: data.number.trim(),
        propfirm: finalPropfirm,
        startingBalance: data.startingBalance,
        evaluationType: data.evaluationType,
        profitTarget: data.profitTargetPhase1, // Use Phase 1 target for API compatibility
        profitTargetPhase1: data.profitTargetPhase1,
        profitTargetPhase2: data.profitTargetPhase2,
        dailyDrawdownAmount: data.dailyDrawdown,
        maxDrawdownAmount: data.maxDrawdown,
        dailyDrawdownType: 'percent' as const,
        maxDrawdownType: 'percent' as const,
        drawdownModeMax: 'static' as const,
        timezone: 'UTC',
        dailyResetTime: '00:00',
      }

      console.log('Sending payload:', payload)

      const response = await fetch('/api/prop-firm/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      console.log('Response status:', response.status)
      const result = await response.json()
      console.log('Response result:', result)

      if (!response.ok) {
        console.error('API Error:', result)
        throw new Error(result.error || 'Failed to create prop firm account')
      }

      toast({
        title: "Prop firm account created!",
        description: `Your ${finalPropfirm} evaluation account has been added.`,
        variant: "default"
      })

      reset()
      setStep('propfirm')
      onSuccess?.()
      onOpenChange(false)

    } catch (error) {
      console.error('Error creating prop firm account:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      toast({
        title: "Failed to create account",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      })
    } finally {
      console.log('Form submission finished, setting isSubmitting to false')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    setStep('propfirm')
    onOpenChange(false)
  }

  const nextStep = () => {
    const currentStep = step
    if (currentStep === 'propfirm' && watchedPropfirm) {
      setStep('details')
    } else if (currentStep === 'details') {
      setStep('rules')
    } else if (currentStep === 'rules') {
      setStep('confirm')
    }
  }

  const prevStep = () => {
    if (step === 'details') {
      setStep('propfirm')
    } else if (step === 'rules') {
      setStep('details')
    } else if (step === 'confirm') {
      setStep('rules')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            Create Prop Firm Account
          </DialogTitle>
          <DialogDescription>
            Add a prop firm evaluation account to track your trading challenge progress
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          {['propfirm', 'details', 'rules', 'confirm'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === s || (['propfirm', 'details', 'rules', 'confirm'].indexOf(step) > index)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </div>
              {index < 3 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  (['propfirm', 'details', 'rules', 'confirm'].indexOf(step) > index)
                    ? "bg-primary"
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit((data) => {
          console.log('handleSubmit called with valid data:', data)
          return onSubmit(data)
        }, (errors) => {
          console.log('Form submission failed due to validation errors:', errors)
        })}>
          <AnimatePresence mode="wait">
            {/* Step 1: Prop Firm Selection */}
            {step === 'propfirm' && (
              <motion.div
                key="propfirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Select Prop Firm</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                    {PROP_FIRMS.map((propfirm) => (
                      <Card
                        key={propfirm.name}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:shadow-md",
                          watchedPropfirm === propfirm.name
                            ? "ring-2 ring-primary bg-accent"
                            : "hover:bg-accent"
                        )}
                        onClick={() => handlePropFirmSelect(propfirm.name)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{propfirm.name}</p>
                              <p className="text-xs text-muted-foreground">{propfirm.category}</p>
                            </div>
                            <div className={cn(
                              "w-3 h-3 rounded-full",
                              watchedPropfirm === propfirm.name ? "bg-primary" : "bg-muted"
                            )} />
                          </div>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {propfirm.typical.profitTarget}% target
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {propfirm.typical.dailyDrawdown}% daily DD
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {propfirm.typical.evaluationType.replace('_', ' ')}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Other Prop Firms</Label>
                    <Select onValueChange={(value) => setValue('propfirm', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Search other prop firms..." />
                      </SelectTrigger>
                      <SelectContent>
                        {OTHER_PROP_FIRMS.map((propfirm) => (
                          <SelectItem key={propfirm} value={propfirm}>
                            {propfirm}
                          </SelectItem>
                        ))}
                        <SelectItem value="Other">Other (Custom)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {watchedPropfirm === 'Other' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <Label htmlFor="customPropfirm">Custom Prop Firm Name</Label>
                      <Input
                        id="customPropfirm"
                        placeholder="Enter prop firm name"
                        {...register('customPropfirm')}
                      />
                      {errors.customPropfirm && (
                        <p className="text-sm text-red-500">{errors.customPropfirm.message}</p>
                      )}
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!watchedPropfirm}
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
                        placeholder={`${watchedPropfirm} Challenge`}
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
                        placeholder="e.g., PROP-123456"
                        {...register('number')}
                      />
                      {errors.number && (
                        <p className="text-sm text-red-500">{errors.number.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startingBalance">Account Size *</Label>
                      <Select
                        onValueChange={(value) => setValue('startingBalance', parseInt(value))}
                        defaultValue={watchedBalance?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5000">$5,000</SelectItem>
                          <SelectItem value="10000">$10,000</SelectItem>
                          <SelectItem value="25000">$25,000</SelectItem>
                          <SelectItem value="50000">$50,000</SelectItem>
                          <SelectItem value="100000">$100,000</SelectItem>
                          <SelectItem value="200000">$200,000</SelectItem>
                          <SelectItem value="300000">$300,000</SelectItem>
                          <SelectItem value="400000">$400,000</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.startingBalance && (
                        <p className="text-sm text-red-500">{errors.startingBalance.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="evaluationType">Evaluation Type *</Label>
                      <Select
                        onValueChange={(value: any) => setValue('evaluationType', value)}
                        defaultValue={watch('evaluationType')}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select evaluation type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one_step">One Step Challenge</SelectItem>
                          <SelectItem value="two_step">Two Step Challenge</SelectItem>
                          <SelectItem value="instant_funding">Instant Funding</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" onClick={nextStep}>
                    Configure Rules
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Rules Configuration */}
            {step === 'rules' && (
              <motion.div
                key="rules"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Trading Rules</h3>
                  
                  {/* Dynamic Profit Target Fields */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="profitTargetPhase1">
                          {watchedEvaluationType === 'two_step' ? 'Phase 1 Profit Target (%)' : 'Profit Target (%)'}
                        </Label>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="profitTargetPhase1"
                            type="number"
                            step="0.1"
                            min="1"
                            max="20"
                            className="pl-10"
                            {...register('profitTargetPhase1', { valueAsNumber: true })}
                          />
                        </div>
                        {errors.profitTargetPhase1 && (
                          <p className="text-sm text-red-500">{errors.profitTargetPhase1.message}</p>
                        )}
                      </div>

                      {watchedEvaluationType === 'two_step' && (
                        <div className="space-y-2">
                          <Label htmlFor="profitTargetPhase2">Phase 2 Profit Target (%)</Label>
                          <div className="relative">
                            <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="profitTargetPhase2"
                              type="number"
                              step="0.1"
                              min="1"
                              max="20"
                              className="pl-10"
                              {...register('profitTargetPhase2', { valueAsNumber: true })}
                            />
                          </div>
                          {errors.profitTargetPhase2 && (
                            <p className="text-sm text-red-500">{errors.profitTargetPhase2.message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Drawdown Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-2">
                      <Label htmlFor="dailyDrawdown">Daily Drawdown (%)</Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="dailyDrawdown"
                          type="number"
                          step="0.1"
                          min="1"
                          max="10"
                          className="pl-10"
                          {...register('dailyDrawdown', { valueAsNumber: true })}
                        />
                      </div>
                      {errors.dailyDrawdown && (
                        <p className="text-sm text-red-500">{errors.dailyDrawdown.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxDrawdown">Max Drawdown (%)</Label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="maxDrawdown"
                          type="number"
                          step="0.1"
                          min="1"
                          max="15"
                          className="pl-10"
                          {...register('maxDrawdown', { valueAsNumber: true })}
                        />
                      </div>
                      {errors.maxDrawdown && (
                        <p className="text-sm text-red-500">{errors.maxDrawdown.message}</p>
                      )}
                    </div>
                  </div>

                  <Card className="bg-muted/50 border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h4 className="font-medium text-foreground mb-1">
                            Rules Summary
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {watchedEvaluationType === 'two_step' ? (
                              <>
                                <li>• Phase 1: Reach ${((watchedBalance || 0) * (watch('profitTargetPhase1') || 0) / 100).toLocaleString()} profit target</li>
                                <li>• Phase 2: Reach ${((watchedBalance || 0) * (watch('profitTargetPhase2') || 0) / 100).toLocaleString()} profit target</li>
                              </>
                            ) : (
                              <li>• Reach ${((watchedBalance || 0) * (watch('profitTargetPhase1') || 0) / 100).toLocaleString()} profit target</li>
                            )}
                            <li>• Don&apos;t lose more than ${((watchedBalance || 0) * (watch('dailyDrawdown') || 0) / 100).toLocaleString()} in a single day</li>
                            <li>• Don&apos;t lose more than ${((watchedBalance || 0) * (watch('maxDrawdown') || 0) / 100).toLocaleString()} total</li>
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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

            {/* Step 4: Confirmation */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Review & Create</h3>
                  
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
                          <p className="text-sm text-muted-foreground">Prop Firm</p>
                          <p className="font-medium">
                            {getValues('propfirm') === 'Other' ? getValues('customPropfirm') : getValues('propfirm')}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Account Name</p>
                          <p className="font-medium">{getValues('name')}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Account Size</p>
                          <p className="font-medium text-chart-2">
                            ${getValues('startingBalance')?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Evaluation Type</p>
                          <p className="font-medium">
                            {getValues('evaluationType')?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Profit Target</p>
                          <p className="font-medium">{getValues('profitTarget')}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Daily Drawdown</p>
                          <p className="font-medium text-destructive">{getValues('dailyDrawdown')}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Validation Summary */}
                  {Object.keys(errors).length > 0 && (
                    <Card className="bg-destructive/10 border-destructive/20">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                          <div>
                            <h4 className="font-medium text-destructive mb-2">
                              Please fix the following errors:
                            </h4>
                            <ul className="text-sm text-destructive space-y-1">
                              {Object.entries(errors).map(([field, error]) => (
                                <li key={field}>
                                  • {error.message}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      onClick={() => {
                        console.log('Create Account button clicked, isSubmitting:', isSubmitting)
                        console.log('Form is valid:', isValid)
                        console.log('Current errors:', errors)
                        
                        // Show helpful message if form is invalid
                        if (!isValid && Object.keys(errors).length > 0) {
                          toast({
                            title: "Please fix form errors",
                            description: "Make sure all required fields are filled correctly before submitting.",
                            variant: "destructive"
                          })
                        }
                      }}
                    >
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

