'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Loader2, Building2, DollarSign, Target, Shield, CheckCircle, ArrowRight, Info, AlertTriangle, TrendingDown, Calendar, Percent, HelpCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn, formatPercent } from "@/lib/utils"
import { toast } from "sonner"
import { clearAccountsCache } from "@/hooks/use-accounts"

// Updated schema for new MasterAccount/PhaseAccount system
const baseSchema = z.object({
  // Master account info
  accountName: z.string().min(3, 'Account name must be at least 3 characters').max(50, 'Account name too long'),
  propFirmName: z.string().min(1, 'Please select a prop firm'),
  accountSize: z.number().min(1000, 'Account size must be at least $1,000'),
  evaluationType: z.enum(['One Step', 'Two Step', 'Instant']),

  // Required Phase 1 ID
  phase1AccountId: z.string().min(1, 'ID for Phase 1 is required'),

  // Phase 1 rules
  phase1ProfitTargetPercent: z.number().min(0, 'Phase 1 profit target is required').max(100),
  phase1DailyDrawdownPercent: z.number().min(1, 'Phase 1 daily drawdown is required').max(100),
  phase1MaxDrawdownPercent: z.number().min(1, 'Phase 1 max drawdown is required').max(100),
  phase1MaxDrawdownType: z.enum(['static', 'trailing']).default('static'),
  phase1MinTradingDays: z.number().min(0).default(0),
  phase1TimeLimitDays: z.number().min(0).default(0).nullable(),
  phase1ConsistencyRulePercent: z.number().min(0).max(100).default(0),

  // Phase 2 rules (for Two Step)
  phase2ProfitTargetPercent: z.number().min(0).max(100).optional(),
  phase2DailyDrawdownPercent: z.number().min(0).max(100).optional(),
  phase2MaxDrawdownPercent: z.number().min(0).max(100).optional(),
  phase2MaxDrawdownType: z.enum(['static', 'trailing']).default('static').optional(),
  phase2MinTradingDays: z.number().min(0).default(0).optional(),
  phase2TimeLimitDays: z.number().min(0).default(0).nullable().optional(),
  phase2ConsistencyRulePercent: z.number().min(0).max(100).default(0).optional(),

  // Funded rules
  fundedDailyDrawdownPercent: z.number().min(1, 'Funded daily drawdown is required').max(100),
  fundedMaxDrawdownPercent: z.number().min(1, 'Funded max drawdown is required').max(100),
  fundedMaxDrawdownType: z.enum(['static', 'trailing']).default('static'),
  fundedProfitSplitPercent: z.number().min(0).max(100).default(80),
  fundedPayoutCycleDays: z.number().min(1).max(365).default(14),
})

// Dynamic schema that validates Phase 2 rules for Two Step evaluations
const createPropFirmAccountSchema = baseSchema.refine(
  (data) => {
    if (data.evaluationType === 'Two Step') {
      return data.phase2ProfitTargetPercent !== undefined && 
             data.phase2DailyDrawdownPercent !== undefined && 
             data.phase2MaxDrawdownPercent !== undefined
    }
    return true
  },
  {
    message: 'Phase 2 rules are required for Two Step evaluations',
    path: ['phase2ProfitTargetPercent']
  }
).refine(
  (data) => {
    if (data.evaluationType === 'Instant') {
      return data.phase1ProfitTargetPercent === 0
    }
    return true
  },
  {
    message: 'Instant accounts should not have profit targets',
    path: ['phase1ProfitTargetPercent']
  }
)

type CreatePropFirmAccountForm = z.infer<typeof createPropFirmAccountSchema>

// Template interface for prop firms
interface PropFirmTemplate {
  name: string
  accountSizes: number[]
  programs: Array<{
    name: string
    evaluationType: string
    phases: {
      phase1?: {
        profitTargetPercent: number
        maxDrawdownPercent: number
        maxDrawdownType: string
        dailyDrawdownPercent: number
        minTradingDays: number
        timeLimitDays: number | null
        notes?: string
      }
      phase2?: {
        profitTargetPercent: number
        maxDrawdownPercent: number
        maxDrawdownType: string
        dailyDrawdownPercent: number
        minTradingDays: number
        timeLimitDays: number | null
      }
      funded: {
        maxDrawdownPercent: number
        maxDrawdownType: string
        dailyDrawdownPercent: number
        profitSplitPercent: number
      }
    }
  }>
}

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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [step, setStep] = useState<'firm' | 'details' | 'rules' | 'payout' | 'confirm'>('firm')
  const [templates, setTemplates] = useState<Record<string, PropFirmTemplate>>({})
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)

  const form = useForm<CreatePropFirmAccountForm>({
    resolver: zodResolver(createPropFirmAccountSchema),
    defaultValues: {
      accountName: '',
      propFirmName: '',
      accountSize: 100000,
      evaluationType: 'Two Step',
      phase1AccountId: '',
      
      phase1ProfitTargetPercent: 10,
      phase1DailyDrawdownPercent: 5,
      phase1MaxDrawdownPercent: 10,
      phase1MaxDrawdownType: 'static' as const,
      phase1MinTradingDays: 4,
      phase1TimeLimitDays: 30,
      phase1ConsistencyRulePercent: 0,
      
      phase2ProfitTargetPercent: 5,
      phase2DailyDrawdownPercent: 5,
      phase2MaxDrawdownPercent: 10,
      phase2MaxDrawdownType: 'static' as const,
      phase2MinTradingDays: 4,
      phase2TimeLimitDays: 60,
      phase2ConsistencyRulePercent: 0,
      
      fundedDailyDrawdownPercent: 5,
      fundedMaxDrawdownPercent: 5,
      fundedMaxDrawdownType: 'static' as const,
      fundedProfitSplitPercent: 80,
      fundedPayoutCycleDays: 14,
    }
  })

  const { register, handleSubmit, formState: { errors, isValid }, reset, setValue, watch, getValues } = form
  
  const watchedPropFirm = watch('propFirmName')
  const watchedEvaluationType = watch('evaluationType')
  const watchedAccountSize = watch('accountSize')

  // Load templates on mount
  useEffect(() => {
    loadTemplates()
  }, [])

  // Load template rules when firm or evaluation type changes
  useEffect(() => {
    if (watchedPropFirm && watchedEvaluationType && templates[watchedPropFirm]) {
      loadTemplateRules()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPropFirm, watchedEvaluationType, templates])

  // Handle evaluation type changes
  useEffect(() => {
    if (watchedEvaluationType === 'Instant') {
      setValue('phase1ProfitTargetPercent', 0)
    } else if (watchedEvaluationType === 'One Step' && watchedPropFirm && templates[watchedPropFirm]) {
      const propFirmTemplate = templates[watchedPropFirm]
      const template = propFirmTemplate?.programs?.find(p => p.evaluationType === 'One Step')?.phases
      if (template?.phase1) {
        setValue('phase1ProfitTargetPercent', template.phase1.profitTargetPercent)
      }
    }
  }, [watchedEvaluationType, setValue, watchedPropFirm, templates])

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/prop-firm-templates')
      const result = await response.json()
      
      if (result.success) {
        setTemplates(result.data)
      } else {
      }
    } catch (error) {
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const loadTemplateRules = () => {
    const template = templates[watchedPropFirm]
    const selectedProgram = template?.programs?.find(p => p.evaluationType === watchedEvaluationType)
    const rules = selectedProgram?.phases
    
    if (rules) {
      // Phase 1 rules
      if (rules.phase1) {
        setValue('phase1ProfitTargetPercent', rules.phase1.profitTargetPercent)
        setValue('phase1DailyDrawdownPercent', rules.phase1.dailyDrawdownPercent)
        setValue('phase1MaxDrawdownPercent', rules.phase1.maxDrawdownPercent)
        setValue('phase1MaxDrawdownType', rules.phase1.maxDrawdownType as 'static' | 'trailing')
        setValue('phase1MinTradingDays', rules.phase1.minTradingDays || 0)
        setValue('phase1TimeLimitDays', rules.phase1.timeLimitDays || 0)
        setValue('phase1ConsistencyRulePercent', 0) // Not in new template
      }
      
      // Phase 2 rules (if exists)
      if (rules.phase2) {
        setValue('phase2ProfitTargetPercent', rules.phase2.profitTargetPercent)
        setValue('phase2DailyDrawdownPercent', rules.phase2.dailyDrawdownPercent)
        setValue('phase2MaxDrawdownPercent', rules.phase2.maxDrawdownPercent)
        setValue('phase2MaxDrawdownType', rules.phase2.maxDrawdownType as 'static' | 'trailing')
        setValue('phase2MinTradingDays', rules.phase2.minTradingDays || 0)
        setValue('phase2TimeLimitDays', rules.phase2.timeLimitDays || 0)
        setValue('phase2ConsistencyRulePercent', 0)
      }
      
      // Funded rules
      setValue('fundedDailyDrawdownPercent', rules.funded.dailyDrawdownPercent)
      setValue('fundedMaxDrawdownPercent', rules.funded.maxDrawdownPercent)
      setValue('fundedMaxDrawdownType', rules.funded.maxDrawdownType as 'static' | 'trailing')
      setValue('fundedProfitSplitPercent', rules.funded.profitSplitPercent)
      setValue('fundedPayoutCycleDays', 14) // Default as not in template
    }
  }

  const submitWithRetry = async (data: CreatePropFirmAccountForm, retryCount = 0) => {
    try {
      setIsSubmitting(true)

      const response = await fetch('/api/prop-firm-v2/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle retryable errors (connectivity/timeout issues)
        if ((response.status === 503 || response.status === 408) && result.retryable && retryCount < 2) {
          toast.info("Connection issue", {
            description: `Retrying... (Attempt ${retryCount + 2}/3)`,
          })
          
          // Wait 2 seconds before retry
          await new Promise(resolve => setTimeout(resolve, 2000))
          return submitWithRetry(data, retryCount + 1)
        }

        throw new Error(result.error || 'Failed to create prop firm account')
      }

      toast.success("Prop firm account created!", {
        description: `Your ${data.propFirmName} evaluation account has been added.`,
      })

      clearAccountsCache()
      reset()
      setStep('firm')
      onSuccess?.()
      onOpenChange(false)

    } catch (error) {
      
      // Show specific messages for different error types
      let title = "Error"
      let description = "Failed to create account"
      
      if (error instanceof Error) {
        if (error.message.includes('Database connection failed')) {
          title = "Connection Error"
          description = "Unable to connect to database. Please check your internet connection and try again."
        } else if (error.message.includes('timed out')) {
          title = "Timeout Error"
          description = "Request timed out. This may be due to slow internet connection. Please try again."
        } else {
          description = error.message
        }
      }

      toast.error(title, {
        description,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onSubmit = async (data: CreatePropFirmAccountForm) => {
    return submitWithRetry(data, 0)
  }

  const nextStep = () => {
    if (step === 'firm') {
      setStep('details')
    } else if (step === 'details') {
      setStep('rules')
    } else if (step === 'rules') {
      setStep('payout')
    } else if (step === 'payout') {
      setStep('confirm')
    }
  }

  const prevStep = () => {
    if (step === 'details') {
      setStep('firm')
    } else if (step === 'rules') {
      setStep('details')
    } else if (step === 'payout') {
      setStep('rules')
    } else if (step === 'confirm') {
      setStep('payout')
    }
  }

  const getAvailableAccountSizes = () => {
    if (!watchedPropFirm || !templates[watchedPropFirm]) return []
    return templates[watchedPropFirm].accountSizes
  }

  const getAvailableEvaluationTypes = () => {
    if (!watchedPropFirm || !templates[watchedPropFirm]) return []
    return templates[watchedPropFirm].programs?.map(p => p.evaluationType) || []
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
          {['firm', 'details', 'rules', 'payout', 'confirm'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  step === s || (['firm', 'details', 'rules', 'payout', 'confirm'].indexOf(step) > index)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {index + 1}
              </div>
              {index < 4 && (
                <div className={cn(
                  "w-8 h-0.5 mx-1",
                  (['firm', 'details', 'rules', 'payout', 'confirm'].indexOf(step) > index)
                    ? "bg-primary"
                    : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* Step 1: Select Firm */}
            {step === 'firm' && (
              <motion.div
                key="firm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Select Prop Firm</h3>
                  {isLoadingTemplates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading prop firms...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.keys(templates).map((firmName) => {
                        const template = templates[firmName]
                        return (
                          <Card
                            key={firmName}
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-md",
                              watchedPropFirm === firmName ? "ring-2 ring-primary" : ""
                            )}
                            onClick={() => setValue('propFirmName', firmName)}
                          >
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">{template.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {template.programs?.map(p => p.evaluationType).join(', ') || 'N/A'} • {template.accountSizes.length} sizes
                              </CardDescription>
                            </CardHeader>
                          </Card>
                        )
                      })}
                    </div>
                  )}
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
                    <div>
                      <Label htmlFor="accountName">Account Name *</Label>
                      <Input
                        id="accountName"
                        {...register('accountName')}
                        placeholder="e.g., FTMO $100k Challenge"
                      />
                      {errors.accountName && (
                        <p className="text-sm text-red-500 mt-1">{errors.accountName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="evaluationType">Evaluation Type</Label>
                      <Select 
                        value={watchedEvaluationType} 
                        onValueChange={(value) => setValue('evaluationType', value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableEvaluationTypes().map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="accountSize">Account Size</Label>
                      <Select 
                        value={watchedAccountSize.toString()} 
                        onValueChange={(value) => setValue('accountSize', parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableAccountSizes().map((size) => (
                            <SelectItem key={size} value={size.toString()}>
                              ${size.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="phase1AccountId">ID for Phase 1 *</Label>
                      <Input
                        id="phase1AccountId"
                        {...register('phase1AccountId')}
                        placeholder="Enter your Phase 1 account ID"
                      />
                      {errors.phase1AccountId && (
                        <p className="text-sm text-red-500 mt-1">{errors.phase1AccountId.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        This is required to link your trades to the correct phase.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Trading Rules */}
            {step === 'rules' && (
              <TooltipProvider>
                <motion.div
                  key="rules"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Trading Rules Configuration
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure risk management and evaluation criteria for each phase
                    </p>
                    
                    {/* Phase 1 Rules */}
                    <Card className="mb-6">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Phase 1 Rules
                        </CardTitle>
                        <CardDescription>
                          Initial evaluation phase requirements and risk limits
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Profit Target Section */}
                        {watchedEvaluationType !== 'Instant' && (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4" />
                              <h5 className="font-medium text-sm">Profit Target</h5>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor="phase1ProfitTarget" className="text-sm font-medium">
                                    Target Percentage
                                  </Label>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Profit percentage required to pass this phase (typically 8-12%)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="relative">
                                  <Input
                                    id="phase1ProfitTarget"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    className="pr-8"
                                    {...register('phase1ProfitTargetPercent', { valueAsNumber: true })}
                                  />
                                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Target: ${((watch('accountSize') || 0) * (watch('phase1ProfitTargetPercent') || 0) / 100).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Drawdown Rules Section */}
                        <div className="space-y-4 p-4 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <h5 className="font-medium text-sm">Risk Management</h5>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Max Drawdown */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Max Drawdown</Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Maximum loss allowed from starting balance or high-water mark</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="space-y-3">
                                <div className="relative">
                                  <Input
                                    id="phase1MaxDrawdown"
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="100"
                                    className="pr-8"
                                    {...register('phase1MaxDrawdownPercent', { valueAsNumber: true })}
                                  />
                                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <Select
                                  value={watch('phase1MaxDrawdownType')}
                                  onValueChange={(value: 'static' | 'trailing') => setValue('phase1MaxDrawdownType', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="static">
                                      Static (from starting balance)
                                    </SelectItem>
                                    <SelectItem value="trailing">
                                      Trailing (from high-water mark)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Limit: ${((watch('accountSize') || 0) * (watch('phase1MaxDrawdownPercent') || 0) / 100).toLocaleString()}
                                </p>
                                {(watch('phase1MaxDrawdownPercent') || 0) > 15 && (
                                  <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    High drawdown limit (typical: 6-12%)
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Daily Drawdown */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Daily Drawdown</Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Maximum loss allowed in a single trading day</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="space-y-3">
                                <div className="relative">
                                  <Input
                                    id="phase1DailyDrawdown"
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="100"
                                    className="pr-8"
                                    {...register('phase1DailyDrawdownPercent', { valueAsNumber: true })}
                                  />
                                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Daily limit: ${((watch('accountSize') || 0) * (watch('phase1DailyDrawdownPercent') || 0) / 100).toLocaleString()}
                                </p>
                                {(watch('phase1DailyDrawdownPercent') || 0) > (watch('phase1MaxDrawdownPercent') || 0) && (watch('phase1MaxDrawdownPercent') || 0) > 0 && (
                                  <p className="text-xs text-red-600 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Daily drawdown cannot exceed max drawdown
                                  </p>
                                )}
                                {(watch('phase1DailyDrawdownPercent') || 0) > 8 && (
                                  <p className="text-xs text-amber-600 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    High daily limit (typical: 3-6%)
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Time and Consistency Rules */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <Label htmlFor="phase1MinDays" className="text-sm font-medium">
                                Min Trading Days
                              </Label>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Minimum days you must trade before advancing (0 = no minimum)</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Input
                              id="phase1MinDays"
                              type="number"
                              min="0"
                              max="365"
                              {...register('phase1MinTradingDays', { valueAsNumber: true })}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              <Label htmlFor="phase1TimeLimit" className="text-sm font-medium">
                                Time Limit (Days)
                              </Label>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Maximum days to complete this phase (0 = unlimited)</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Input
                              id="phase1TimeLimit"
                              type="number"
                              min="0"
                              max="365"
                              {...register('phase1TimeLimitDays', { valueAsNumber: true })}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4" />
                              <Label htmlFor="phase1Consistency" className="text-sm font-medium">
                                Consistency Rule
                              </Label>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Max percentage of profit from single best day (0 = no limit)</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="relative">
                              <Input
                                id="phase1Consistency"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                className="pr-8"
                                {...register('phase1ConsistencyRulePercent', { valueAsNumber: true })}
                              />
                              <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Phase 2 Rules (for Two Step) */}
                    {watchedEvaluationType === 'Two Step' && (
                      <Card className="mb-6">
                        <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Target className="h-4 w-4" />
                          Phase 2 Rules
                        </CardTitle>
                          <CardDescription>
                            Final evaluation phase requirements before funding
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          {/* Profit Target Section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-4 w-4" />
                              <h5 className="font-medium text-sm">Profit Target</h5>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label htmlFor="phase2ProfitTarget" className="text-sm font-medium">
                                    Target Percentage
                                  </Label>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Profit percentage required to pass phase 2 (typically 4-8%)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="relative">
                                  <Input
                                    id="phase2ProfitTarget"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    className="pr-8"
                                    {...register('phase2ProfitTargetPercent', { valueAsNumber: true })}
                                  />
                                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Target: ${((watch('accountSize') || 0) * (watch('phase2ProfitTargetPercent') || 0) / 100).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Drawdown Rules Section */}
                          <div className="space-y-4 p-4 rounded-lg border">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4" />
                              <h5 className="font-medium text-sm">Risk Management</h5>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Max Drawdown */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-medium">Max Drawdown</Label>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Maximum loss allowed from starting balance or high-water mark</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="space-y-3">
                                  <div className="relative">
                                    <Input
                                      id="phase2MaxDrawdown"
                                      type="number"
                                      step="0.1"
                                      min="1"
                                      max="100"
                                      className="pr-8"
                                      {...register('phase2MaxDrawdownPercent', { valueAsNumber: true })}
                                    />
                                    <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <Select
                                    value={watch('phase2MaxDrawdownType')}
                                    onValueChange={(value: 'static' | 'trailing') => setValue('phase2MaxDrawdownType', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="static">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 bg-foreground rounded-full" />
                                          Static (from starting balance)
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="trailing">
                                        <div className="flex items-center gap-2">
                                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                                          Trailing (from high-water mark)
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-muted-foreground">
                                    Limit: ${((watch('accountSize') || 0) * (watch('phase2MaxDrawdownPercent') || 0) / 100).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Daily Drawdown */}
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Label className="text-sm font-medium">Daily Drawdown</Label>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Maximum loss allowed in a single trading day</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="space-y-3">
                                  <div className="relative">
                                    <Input
                                      id="phase2DailyDrawdown"
                                      type="number"
                                      step="0.1"
                                      min="1"
                                      max="100"
                                      className="pr-8"
                                      {...register('phase2DailyDrawdownPercent', { valueAsNumber: true })}
                                    />
                                    <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Daily limit: ${((watch('accountSize') || 0) * (watch('phase2DailyDrawdownPercent') || 0) / 100).toLocaleString()}
                                  </p>
                                  {(watch('phase2DailyDrawdownPercent') || 0) > (watch('phase2MaxDrawdownPercent') || 0) && (watch('phase2MaxDrawdownPercent') || 0) > 0 && (
                                    <p className="text-xs text-red-600 flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" />
                                      Daily drawdown cannot exceed max drawdown
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Time and Consistency Rules */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <Label htmlFor="phase2MinDays" className="text-sm font-medium">
                                  Min Trading Days
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Minimum days you must trade before advancing (0 = no minimum)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Input
                                id="phase2MinDays"
                                type="number"
                                min="0"
                                max="365"
                                {...register('phase2MinTradingDays', { valueAsNumber: true })}
                              />
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <Label htmlFor="phase2TimeLimit" className="text-sm font-medium">
                                  Time Limit (Days)
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Maximum days to complete this phase (0 = unlimited)</p>
                                  </TooltipContent>
                                  </Tooltip>
                                </div>
                                <Input
                                  id="phase2TimeLimit"
                                  type="number"
                                  min="0"
                                  max="365"
                                  {...register('phase2TimeLimitDays', { valueAsNumber: true })}
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4" />
                                  <Label htmlFor="phase2Consistency" className="text-sm font-medium">
                                    Consistency Rule
                                  </Label>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Max percentage of profit from single best day (0 = no limit)</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <div className="relative">
                                  <Input
                                    id="phase2Consistency"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    className="pr-8"
                                    {...register('phase2ConsistencyRulePercent', { valueAsNumber: true })}
                                  />
                                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </motion.div>
                </TooltipProvider>
              )}

            {/* Step 4: Payout Configuration */}
            {step === 'payout' && (
              <TooltipProvider>
                <motion.div
                  key="payout"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Payout Configuration
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Configure funded account rules and payout structure
                    </p>

                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Funded Account Rules
                        </CardTitle>
                        <CardDescription>
                          Risk management rules for funded trading accounts
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Drawdown Rules Section */}
                        <div className="space-y-4 p-4 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <h5 className="font-medium text-sm">Risk Management</h5>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Max Drawdown */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Max Drawdown</Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Maximum loss allowed on funded account</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="space-y-3">
                                <div className="relative">
                                  <Input
                                    id="fundedMaxDrawdown"
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="100"
                                    className="pr-8"
                                    {...register('fundedMaxDrawdownPercent', { valueAsNumber: true })}
                                  />
                                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <Select
                                  value={watch('fundedMaxDrawdownType')}
                                  onValueChange={(value: 'static' | 'trailing') => setValue('fundedMaxDrawdownType', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="static">
                                      Static (from starting balance)
                                    </SelectItem>
                                    <SelectItem value="trailing">
                                      Trailing (from high-water mark)
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                  Limit: ${((watch('accountSize') || 0) * (watch('fundedMaxDrawdownPercent') || 0) / 100).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Daily Drawdown */}
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Daily Drawdown</Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Maximum daily loss allowed on funded account</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="space-y-3">
                                <div className="relative">
                                  <Input
                                    id="fundedDailyDrawdown"
                                    type="number"
                                    step="0.1"
                                    min="1"
                                    max="100"
                                    className="pr-8"
                                    {...register('fundedDailyDrawdownPercent', { valueAsNumber: true })}
                                  />
                                  <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Daily limit: ${((watch('accountSize') || 0) * (watch('fundedDailyDrawdownPercent') || 0) / 100).toLocaleString()}
                                </p>
                                {(watch('fundedDailyDrawdownPercent') || 0) > (watch('fundedMaxDrawdownPercent') || 0) && (watch('fundedMaxDrawdownPercent') || 0) > 0 && (
                                  <p className="text-xs text-red-600 flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Daily drawdown cannot exceed max drawdown
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Payout Structure */}
                        <div className="space-y-4 p-4 rounded-lg border">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <h5 className="font-medium text-sm">Payout Structure</h5>
                          </div>
                          
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Label htmlFor="fundedProfitSplit" className="text-sm font-medium">
                                  Profit Split
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Percentage of profits paid to trader (typically 80-90%)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="relative">
                                <Input
                                  id="fundedProfitSplit"
                                  type="number"
                                  step="1"
                                  min="50"
                                  max="100"
                                  className="pr-8"
                                  {...register('fundedProfitSplitPercent', { valueAsNumber: true })}
                                />
                                <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              </div>
                              {(watch('fundedProfitSplitPercent') || 0) < 70 && (
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Low profit split (typical: 80-90%)
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <Label htmlFor="fundedPayoutCycle" className="text-sm font-medium">
                                  Payout Cycle
                                </Label>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>How often payouts are processed (in days)</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="relative">
                                <Input
                                  id="fundedPayoutCycle"
                                  type="number"
                                  min="1"
                                  max="365"
                                  className="pr-12"
                                  {...register('fundedPayoutCycleDays', { valueAsNumber: true })}
                                />
                                <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">days</span>
                              </div>
                              {(watch('fundedPayoutCycleDays') || 0) > 30 && (
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  Long payout cycle (typical: 7-30 days)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TooltipProvider>
            )}

            {/* Step 5: Confirmation */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Confirm Details</h3>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">{watch('accountName')}</CardTitle>
                      <CardDescription>
                        {watch('propFirmName')} • {watch('evaluationType')} • ${watch('accountSize').toLocaleString()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div><strong>Phase 1 ID:</strong> {watch('phase1AccountId')}</div>
                        {watchedEvaluationType !== 'Instant' && (
                          <div><strong>Phase 1 Profit Target:</strong> {formatPercent(watch('phase1ProfitTargetPercent') || 0)}</div>
                        )}
                        <div><strong>Phase 1 Max Drawdown:</strong> {formatPercent(watch('phase1MaxDrawdownPercent') || 0)}</div>
                        <div><strong>Profit Split:</strong> {formatPercent(watch('fundedProfitSplitPercent') || 0)}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 'firm'}
            >
              Previous
            </Button>
            
            {step !== 'confirm' ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!watchedPropFirm && step === 'firm'}
              >
                Next
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}