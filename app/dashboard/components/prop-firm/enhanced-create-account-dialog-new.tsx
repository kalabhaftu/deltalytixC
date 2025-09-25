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
import { Loader2, Building2, DollarSign, Target, Shield, CheckCircle, ArrowRight, Info, AlertTriangle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
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
  phase1MinTradingDays: z.number().min(0).default(0),
  phase1TimeLimitDays: z.number().min(0).default(0),
  phase1ConsistencyRulePercent: z.number().min(0).max(100).default(0),

  // Phase 2 rules (for Two Step)
  phase2ProfitTargetPercent: z.number().min(0).max(100).optional(),
  phase2DailyDrawdownPercent: z.number().min(0).max(100).optional(),
  phase2MaxDrawdownPercent: z.number().min(0).max(100).optional(),
  phase2MinTradingDays: z.number().min(0).default(0).optional(),
  phase2TimeLimitDays: z.number().min(0).default(0).optional(),
  phase2ConsistencyRulePercent: z.number().min(0).max(100).default(0).optional(),

  // Funded rules
  fundedDailyDrawdownPercent: z.number().min(1, 'Funded daily drawdown is required').max(100),
  fundedMaxDrawdownPercent: z.number().min(1, 'Funded max drawdown is required').max(100),
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
    phases: any
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
      phase1MinTradingDays: 4,
      phase1TimeLimitDays: 30,
      phase1ConsistencyRulePercent: 0,
      
      phase2ProfitTargetPercent: 5,
      phase2DailyDrawdownPercent: 5,
      phase2MaxDrawdownPercent: 10,
      phase2MinTradingDays: 4,
      phase2TimeLimitDays: 60,
      phase2ConsistencyRulePercent: 0,
      
      fundedDailyDrawdownPercent: 5,
      fundedMaxDrawdownPercent: 5,
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
  }, [watchedPropFirm, watchedEvaluationType, templates])

  // Handle evaluation type changes
  useEffect(() => {
    if (watchedEvaluationType === 'Instant') {
      setValue('phase1ProfitTargetPercent', 0)
    } else if (watchedEvaluationType === 'One Step' && watchedPropFirm && templates[watchedPropFirm]) {
      const template = templates[watchedPropFirm]?.programs?.find(p => p.evaluationType === 'One Step')
      if (template?.phases?.phase1) {
        setValue('phase1ProfitTargetPercent', template.phases.phase1.profitTargetPercent)
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
        console.error('Failed to load templates:', result.error)
      }
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  const loadTemplateRules = () => {
    const template = templates[watchedPropFirm]
    const rules = template?.programs?.find(p => p.evaluationType === watchedEvaluationType)?.phases
    
    if (rules) {
      // Phase 1 rules
      if (rules.phase1) {
        setValue('phase1ProfitTargetPercent', rules.phase1.profitTargetPercent)
        setValue('phase1DailyDrawdownPercent', rules.phase1.dailyDrawdownPercent)
        setValue('phase1MaxDrawdownPercent', rules.phase1.maxDrawdownPercent)
        setValue('phase1MinTradingDays', rules.phase1.minTradingDays)
        setValue('phase1TimeLimitDays', rules.phase1.timeLimitDays)
        setValue('phase1ConsistencyRulePercent', rules.phase1.consistencyRulePercent)
      }
      
      // Phase 2 rules (if exists)
      if (rules.phase2) {
        setValue('phase2ProfitTargetPercent', rules.phase2.profitTargetPercent)
        setValue('phase2DailyDrawdownPercent', rules.phase2.dailyDrawdownPercent)
        setValue('phase2MaxDrawdownPercent', rules.phase2.maxDrawdownPercent)
        setValue('phase2MinTradingDays', rules.phase2.minTradingDays)
        setValue('phase2TimeLimitDays', rules.phase2.timeLimitDays)
        setValue('phase2ConsistencyRulePercent', rules.phase2.consistencyRulePercent)
      }
      
      // Funded rules
      setValue('fundedDailyDrawdownPercent', rules.funded.dailyDrawdownPercent)
      setValue('fundedMaxDrawdownPercent', rules.funded.maxDrawdownPercent)
      setValue('fundedProfitSplitPercent', rules.funded.profitSplitPercent)
      setValue('fundedPayoutCycleDays', rules.funded.payoutCycleDays)
    }
  }

  const onSubmit = async (data: CreatePropFirmAccountForm) => {
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
        throw new Error(result.error || 'Failed to create prop firm account')
      }

      toast({
        title: "Prop firm account created!",
        description: `Your ${data.propFirmName} evaluation account has been added.`,
        variant: "default"
      })

      clearAccountsCache()
      reset()
      setStep('firm')
      onSuccess?.()
      onOpenChange(false)

    } catch (error) {
      console.error('Error creating prop firm account:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create account',
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
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
                                {template.programs?.map(p => p.evaluationType).join(', ')} • {template.accountSizes.length} sizes
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
              <motion.div
                key="rules"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Trading Rules</h3>
                  
                  {/* Phase 1 Rules */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Phase 1 Rules</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {watchedEvaluationType !== 'Instant' && (
                        <div>
                          <Label htmlFor="phase1ProfitTarget">Profit Target (%)</Label>
                          <Input
                            id="phase1ProfitTarget"
                            type="number"
                            {...register('phase1ProfitTargetPercent', { valueAsNumber: true })}
                          />
                        </div>
                      )}
                      <div>
                        <Label htmlFor="phase1MaxDrawdown">Max Drawdown (%)</Label>
                        <Input
                          id="phase1MaxDrawdown"
                          type="number"
                          {...register('phase1MaxDrawdownPercent', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phase1DailyDrawdown">Daily Drawdown (%)</Label>
                        <Input
                          id="phase1DailyDrawdown"
                          type="number"
                          {...register('phase1DailyDrawdownPercent', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phase1MinDays">Min Trading Days (0 = none)</Label>
                        <Input
                          id="phase1MinDays"
                          type="number"
                          {...register('phase1MinTradingDays', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phase1TimeLimit">Time Limit Days (0 = unlimited)</Label>
                        <Input
                          id="phase1TimeLimit"
                          type="number"
                          {...register('phase1TimeLimitDays', { valueAsNumber: true })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="phase1Consistency">Consistency Rule % (0 = none)</Label>
                        <Input
                          id="phase1Consistency"
                          type="number"
                          {...register('phase1ConsistencyRulePercent', { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phase 2 Rules (for Two Step) */}
                  {watchedEvaluationType === 'Two Step' && (
                    <div className="space-y-4">
                      <h4 className="font-medium">Phase 2 Rules</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="phase2ProfitTarget">Profit Target (%)</Label>
                          <Input
                            id="phase2ProfitTarget"
                            type="number"
                            {...register('phase2ProfitTargetPercent', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phase2MaxDrawdown">Max Drawdown (%)</Label>
                          <Input
                            id="phase2MaxDrawdown"
                            type="number"
                            {...register('phase2MaxDrawdownPercent', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phase2DailyDrawdown">Daily Drawdown (%)</Label>
                          <Input
                            id="phase2DailyDrawdown"
                            type="number"
                            {...register('phase2DailyDrawdownPercent', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phase2MinDays">Min Trading Days (0 = none)</Label>
                          <Input
                            id="phase2MinDays"
                            type="number"
                            {...register('phase2MinTradingDays', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phase2TimeLimit">Time Limit Days (0 = unlimited)</Label>
                          <Input
                            id="phase2TimeLimit"
                            type="number"
                            {...register('phase2TimeLimitDays', { valueAsNumber: true })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phase2Consistency">Consistency Rule % (0 = none)</Label>
                          <Input
                            id="phase2Consistency"
                            type="number"
                            {...register('phase2ConsistencyRulePercent', { valueAsNumber: true })}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 4: Payout Configuration */}
            {step === 'payout' && (
              <motion.div
                key="payout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold mb-4">Payout Configuration</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fundedMaxDrawdown">Funded Max Drawdown (%)</Label>
                      <Input
                        id="fundedMaxDrawdown"
                        type="number"
                        {...register('fundedMaxDrawdownPercent', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fundedDailyDrawdown">Funded Daily Drawdown (%)</Label>
                      <Input
                        id="fundedDailyDrawdown"
                        type="number"
                        {...register('fundedDailyDrawdownPercent', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fundedProfitSplit">Profit Split (%)</Label>
                      <Input
                        id="fundedProfitSplit"
                        type="number"
                        {...register('fundedProfitSplitPercent', { valueAsNumber: true })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="fundedPayoutCycle">Payout Cycle (days)</Label>
                      <Input
                        id="fundedPayoutCycle"
                        type="number"
                        {...register('fundedPayoutCycleDays', { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
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
                          <div><strong>Phase 1 Profit Target:</strong> {watch('phase1ProfitTargetPercent')}%</div>
                        )}
                        <div><strong>Phase 1 Max Drawdown:</strong> {watch('phase1MaxDrawdownPercent')}%</div>
                        <div><strong>Profit Split:</strong> {watch('fundedProfitSplitPercent')}%</div>
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

