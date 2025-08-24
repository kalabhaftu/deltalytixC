'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/locales/client"
import { Loader2, Info, DollarSign, Target, Shield, Clock } from "lucide-react"
import { PropFirmSchemas, CreateAccountInput } from "@/lib/validation/prop-firm-schemas"
import { cn } from "@/lib/utils"

interface CreateAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

// Common timezone options
const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

// Common prop firms
const PROP_FIRMS = [
  'FTMO',
  'MyForexFunds',
  'The5ers',
  'TopstepTrader',
  'Earn2Trade',
  'OneUp Trader',
  'SurgeTrader',
  'FundedNext',
  'TrueForexFunds',
  'Equity Edge',
  'Maven',
  'Funding Pips',
  'Top Step',
  'Custom'
]

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateAccountDialogProps) {
  const t = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'basic' | 'drawdown' | 'evaluation' | 'review'>('basic')

  const form = useForm<CreateAccountInput>({
    resolver: zodResolver(PropFirmSchemas.CreateAccount),
    defaultValues: {
      number: '',
      name: '',
      propfirm: '',
      startingBalance: 0,
      dailyDrawdownType: 'percent',
      dailyDrawdownAmount: 0,
      maxDrawdownType: 'percent',
      maxDrawdownAmount: 0,
      drawdownModeMax: 'static',
      evaluationType: 'two_step',
      profitTarget: 0,
      timezone: 'UTC',
      dailyResetTime: '00:00',
    }
  })

  const watchedValues = form.watch()

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const calculateDrawdownAmount = (
    balance: number,
    percentage: number,
    type: 'percent' | 'absolute'
  ) => {
    if (type === 'percent') {
      return balance * (percentage / 100)
    }
    return percentage
  }

  const calculateProfitTarget = (balance: number, evaluationType: string, phase: 'phase_1' | 'phase_2') => {
    const targets = {
      'one_step': { 'phase_1': 0.10 },
      'two_step': { 'phase_1': 0.08, 'phase_2': 0.05 }
    }
    
    const target = (targets[evaluationType as keyof typeof targets] as any)?.[phase]
    return target ? balance * target : undefined
  }

  const onSubmit = async (data: CreateAccountInput) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/prop-firm/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        let errorMessage = 'Failed to create account'

        if (errorData.error === 'Validation Error' && errorData.details) {
          // Zod validation errors
          errorMessage = errorData.details.map((detail: any) => detail.message).join(', ')
        } else if (errorData.error === 'Business Rule Violation' && errorData.details) {
          // Business rule errors
          errorMessage = errorData.details.map((detail: any) => detail.message).join(', ')
        } else if (errorData.error === 'Duplicate Account Number' && errorData.message) {
          // Specific duplicate account error
          errorMessage = errorData.message
        } else if (errorData.message) {
          // Generic error message from backend
          errorMessage = errorData.message
        } else if (errorData.error) {
          // Fallback to error.error if no specific message
          errorMessage = errorData.error
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('Account created:', result)
      
      form.reset()
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating account:', error)
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to create account'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    const currentStep = step
    if (currentStep === 'basic') setStep('drawdown')
    else if (currentStep === 'drawdown') setStep('evaluation')
    else if (currentStep === 'evaluation') setStep('review')
  }

  const prevStep = () => {
    const currentStep = step
    if (currentStep === 'review') setStep('evaluation')
    else if (currentStep === 'evaluation') setStep('drawdown')
    else if (currentStep === 'drawdown') setStep('basic')
  }

  const canProceed = () => {
    if (step === 'basic') {
      return form.getValues('number') && form.getValues('propfirm') && form.getValues('startingBalance')
    }
    if (step === 'drawdown') {
      return true // Drawdown fields are optional
    }
    if (step === 'evaluation') {
      return true // All fields have defaults
    }
    return true
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('propFirm.account.create')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-between mb-6">
              {['basic', 'drawdown', 'evaluation', 'review'].map((stepName, index) => (
                <div
                  key={stepName}
                  className={cn(
                    "flex items-center",
                    index < ['basic', 'drawdown', 'evaluation', 'review'].indexOf(step) ? "text-primary" :
                    stepName === step ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm",
                    index < ['basic', 'drawdown', 'evaluation', 'review'].indexOf(step) ? "border-primary bg-primary text-primary-foreground" : "",
                    stepName === step ? "border-primary" : "border-muted"
                  )}>
                    {index + 1}
                  </div>
                  <span className="ml-2 text-sm hidden sm:inline">
                    {t('propFirm.account.steps.basic')}
                  </span>
                  {index < 3 && (
                    <div className={cn(
                      "w-8 sm:w-16 h-px mx-2",
                      index < ['basic', 'drawdown', 'evaluation', 'review'].indexOf(step) ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            {step === 'basic' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    {t('propFirm.account.steps.basic')}
                  </CardTitle>
                  <CardDescription>
                    {t('propFirm.account.steps.basicDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propFirm.account.number')}</FormLabel>
                          <FormControl>
                            <Input placeholder="12345" {...field} />
                          </FormControl>
                          <FormDescription>
                            {t('propFirm.account.numberDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propFirm.account.name')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('propFirm.account.namePlaceholder')} {...field} />
                          </FormControl>
                          <FormDescription>
                            {t('propFirm.account.nameDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="propfirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('propFirm.account.propfirm')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('propFirm.account.selectPropfirm')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PROP_FIRMS.map((firm) => (
                              <SelectItem key={firm} value={firm}>
                                {firm}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startingBalance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('propFirm.account.startingBalance')}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1000"
                            max="10000000"
                            step="1000"
                            placeholder="50000"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          {t('propFirm.account.startingBalanceDescription')}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            {step === 'drawdown' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    {t('propFirm.account.steps.drawdown')}
                  </CardTitle>
                  <CardDescription>
                    {t('propFirm.account.steps.drawdownDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Daily Drawdown */}
                  <div className="space-y-4">
                    <h4 className="font-medium">{t('propFirm.drawdown.daily.title')}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="dailyDrawdownType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('propFirm.drawdown.type')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'percent'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percent">{t('propFirm.drawdown.percent')}</SelectItem>
                                <SelectItem value="absolute">{t('propFirm.drawdown.absolute')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dailyDrawdownAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {watchedValues.dailyDrawdownType === 'percent' 
                                ? t('propFirm.drawdown.percentage')
                                : t('propFirm.drawdown.amount')
                              }
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max={watchedValues.dailyDrawdownType === 'percent' ? "100" : "50000"}
                                step={watchedValues.dailyDrawdownType === 'percent' ? "0.1" : "100"}
                                placeholder={watchedValues.dailyDrawdownType === 'percent' ? "5" : "2500"}
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col justify-end">
                        {watchedValues.dailyDrawdownAmount && watchedValues.startingBalance && (
                          <div className="p-3 rounded-md bg-muted">
                            <span className="text-sm text-muted-foreground">
                              {t('propFirm.drawdown.calculated')}
                            </span>
                            <div className="font-medium">
                              {formatCurrency(
                                calculateDrawdownAmount(
                                  watchedValues.startingBalance,
                                  watchedValues.dailyDrawdownAmount,
                                  watchedValues.dailyDrawdownType
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Max Drawdown */}
                  <div className="space-y-4">
                    <h4 className="font-medium">{t('propFirm.drawdown.max.title')}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="maxDrawdownType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('propFirm.drawdown.type')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'percent'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percent">{t('propFirm.drawdown.percent')}</SelectItem>
                                <SelectItem value="absolute">{t('propFirm.drawdown.absolute')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="maxDrawdownAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {watchedValues.maxDrawdownType === 'percent' 
                                ? t('propFirm.drawdown.percentage')
                                : t('propFirm.drawdown.amount')
                              }
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                max={watchedValues.maxDrawdownType === 'percent' ? "100" : "50000"}
                                step={watchedValues.maxDrawdownType === 'percent' ? "0.1" : "100"}
                                placeholder={watchedValues.maxDrawdownType === 'percent' ? "10" : "5000"}
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="drawdownModeMax"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t('propFirm.drawdown.mode')}</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'static'}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="static">{t('propFirm.drawdown.static')}</SelectItem>
                                <SelectItem value="trailing">{t('propFirm.drawdown.trailing')}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              {watchedValues.drawdownModeMax === 'static' 
                                ? t('propFirm.drawdown.staticDescription')
                                : t('propFirm.drawdown.trailingDescription')
                              }
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex flex-col justify-end">
                        {watchedValues.maxDrawdownAmount && watchedValues.startingBalance && (
                          <div className="p-3 rounded-md bg-muted">
                            <span className="text-sm text-muted-foreground">
                              {t('propFirm.drawdown.calculated')}
                            </span>
                            <div className="font-medium">
                              {formatCurrency(
                                calculateDrawdownAmount(
                                  watchedValues.startingBalance,
                                  watchedValues.maxDrawdownAmount,
                                  watchedValues.maxDrawdownType
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'evaluation' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    {t('propFirm.account.steps.evaluation')}
                  </CardTitle>
                  <CardDescription>
                    {t('propFirm.account.steps.evaluationDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="evaluationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propFirm.evaluation.type')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'two_step'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="one_step">{t('propFirm.evaluation.oneStep')}</SelectItem>
                              <SelectItem value="two_step">{t('propFirm.evaluation.twoStep')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {watchedValues.evaluationType === 'one_step'
                              ? t('propFirm.evaluation.oneStepDescription')
                              : t('propFirm.evaluation.twoStepDescription')
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="profitTarget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propFirm.evaluation.profitTarget')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              placeholder={
                                watchedValues.startingBalance
                                  ? (calculateProfitTarget(
                                      watchedValues.startingBalance,
                                      watchedValues.evaluationType,
                                      'phase_1'
                                    ) || 0).toString()
                                  : "4000"
                              }
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('propFirm.evaluation.profitTargetDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propFirm.account.timezone')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'UTC'}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dailyResetTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('propFirm.account.dailyResetTime')}</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            {t('propFirm.account.dailyResetTimeDescription')}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 'review' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t('propFirm.account.steps.review')}
                  </CardTitle>
                  <CardDescription>
                    {t('propFirm.account.steps.reviewDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-medium">{t('propFirm.account.basicInfo')}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('propFirm.account.number')}:</span>
                          <span className="font-medium">{watchedValues.number}</span>
                        </div>
                        {watchedValues.name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('propFirm.account.name')}:</span>
                            <span className="font-medium">{watchedValues.name}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('propFirm.account.propfirm')}:</span>
                          <span className="font-medium">{watchedValues.propfirm}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('propFirm.account.startingBalance')}:</span>
                          <span className="font-medium">{formatCurrency(watchedValues.startingBalance || 0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">{t('propFirm.account.drawdownLimits')}</h4>
                      <div className="space-y-1 text-sm">
                        {watchedValues.dailyDrawdownAmount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('propFirm.drawdown.daily.title')}:</span>
                            <span className="font-medium">
                              {formatCurrency(
                                calculateDrawdownAmount(
                                  watchedValues.startingBalance || 0,
                                  watchedValues.dailyDrawdownAmount,
                                  watchedValues.dailyDrawdownType
                                )
                              )}
                            </span>
                          </div>
                        )}
                        {watchedValues.maxDrawdownAmount && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('propFirm.drawdown.max.title')}:</span>
                            <span className="font-medium">
                              {formatCurrency(
                                calculateDrawdownAmount(
                                  watchedValues.startingBalance || 0,
                                  watchedValues.maxDrawdownAmount,
                                  watchedValues.maxDrawdownType
                                )
                              )}
                              <Badge variant="outline" className="ml-2">
                                {t('propFirm.drawdown.static')}
                              </Badge>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Evaluation Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium">{t('propFirm.account.evaluationSettings')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('propFirm.evaluation.type')}:</span>
                        <Badge variant="outline">
                          {t('propFirm.evaluation.oneStep')}
                        </Badge>
                      </div>
                      {watchedValues.profitTarget && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('propFirm.evaluation.phase1Target')}:</span>
                          <span className="font-medium">{formatCurrency(watchedValues.profitTarget)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('propFirm.account.timezone')}:</span>
                        <span className="font-medium">{watchedValues.timezone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('propFirm.account.dailyResetTime')}:</span>
                        <span className="font-medium">{watchedValues.dailyResetTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Error Display */}
                  {form.formState.errors.root && (
                    <div className="p-3 rounded-md bg-destructive/15 border border-destructive/20">
                      <p className="text-sm text-destructive">
                        {form.formState.errors.root.message}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navigation */}
            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                {step !== 'basic' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={isSubmitting}
                  >
                    {t('common.previous')}
                  </Button>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t('common.cancel')}
                </Button>
                
                {step !== 'review' ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={!canProceed() || isSubmitting}
                  >
                    {t('common.next')}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('propFirm.account.create')}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

