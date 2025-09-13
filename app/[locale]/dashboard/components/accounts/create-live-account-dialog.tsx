'use client'

import { useState } from 'react'
import { useI18n } from "@/locales/client"
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
  DialogFooter,
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
import { Loader2 } from "lucide-react"
import { LiveAccountSchema, type LiveAccountInput } from "@/lib/validation/enhanced-schemas"
import { FormFieldWrapper, FormValidationSummary } from "@/components/ui/enhanced-form"

// Common brokers list
const BROKERS = [
  'Exness',
  'IC Markets',
  'FTMO',
  'MyForexFunds',
  'The5ers',
  'Funded Trading Plus',
  'Apex Trader Funding',
  'TopStep',
  'Earn2Trade',
  'SurgeTrader',
  'Interactive Brokers',
  'TD Ameritrade',
  'E*TRADE',
  'Charles Schwab',
  'Fidelity',
  'MetaTrader 4',
  'MetaTrader 5',
  'cTrader',
  'NinjaTrader',
  'TradingView',
  'Other'
]

// Extended schema for the form (includes string fields for form handling)
const createLiveAccountFormSchema = LiveAccountSchema.extend({
  startingBalance: z.string().min(1, 'Starting balance is required').refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 100,
    'Starting balance must be at least $100'
  ),
  customBroker: z.string().optional(),
})

type CreateLiveAccountForm = z.infer<typeof createLiveAccountFormSchema>

interface CreateLiveAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateLiveAccountDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateLiveAccountDialogProps) {
  const t = useI18n()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedBroker, setSelectedBroker] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<CreateLiveAccountForm>({
    resolver: zodResolver(createLiveAccountFormSchema)
  })

  const watchedBroker = watch('broker')

  const onSubmit = async (data: CreateLiveAccountForm) => {
    try {
      setIsSubmitting(true)

      // Use custom broker if "Other" is selected
      const finalBroker = data.broker === 'Other' ? data.customBroker : data.broker

      const payload = {
        name: data.name.trim(),
        number: data.number.trim(),
        startingBalance: parseFloat(data.startingBalance),
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
        title: t('accounts.toast.createSuccess'),
        description: t('accounts.toast.createSuccessDescription'),
        variant: "default"
      })

      reset()
      setSelectedBroker('')
      onSuccess()
      onOpenChange(false)

    } catch (error) {
      console.error('Error creating live account:', error)
      toast({
        title: t('accounts.toast.createError'),
        description: error instanceof Error ? error.message : t('accounts.toast.createErrorDescription'),
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    reset()
    setSelectedBroker('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('accounts.createLiveAccount')}</DialogTitle>
          <DialogDescription>
            {t('accounts.createLiveAccountDescription')}
          </DialogDescription>
        </DialogHeader>

        <FormValidationSummary form={{ formState: { errors }, getFieldState: () => ({ isDirty: false, isValidating: false }) } as any} />
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormFieldWrapper 
            error={errors.name}
            hint="Choose a descriptive name for your trading account"
          >
            <Label htmlFor="name">{t('accounts.accountName')} *</Label>
            <Input
              id="name"
              placeholder={t('accounts.accountNamePlaceholder')}
              {...register('name')}
              disabled={isSubmitting}
            />
          </FormFieldWrapper>

          <FormFieldWrapper 
            error={errors.number}
            hint="6-20 characters, letters, numbers, and hyphens only"
          >
            <Label htmlFor="number">{t('accounts.accountNumber')} *</Label>
            <Input
              id="number"
              placeholder={t('accounts.accountNumberPlaceholder')}
              {...register('number')}
              disabled={isSubmitting}
            />
          </FormFieldWrapper>

          <FormFieldWrapper 
            error={errors.startingBalance}
            hint="Enter the initial account balance (minimum $100)"
          >
            <Label htmlFor="startingBalance">Starting Balance *</Label>
            <Input
              id="startingBalance"
              type="number"
              step="0.01"
              min="100"
              placeholder="10000.00"
              {...register('startingBalance')}
              disabled={isSubmitting}
            />
          </FormFieldWrapper>

          <div className="space-y-2">
            <Label htmlFor="broker">{t('accounts.broker')} *</Label>
            <Select
              onValueChange={(value) => {
                setValue('broker', value)
                setSelectedBroker(value)
              }}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('accounts.selectBroker')} />
              </SelectTrigger>
              <SelectContent>
                {BROKERS.map((broker) => (
                  <SelectItem key={broker} value={broker}>
                    {broker}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.broker && (
              <p className="text-sm text-red-500">{errors.broker.message}</p>
            )}
          </div>

          {watchedBroker === 'Other' && (
            <div className="space-y-2">
              <Label htmlFor="customBroker">{t('accounts.customBroker')} *</Label>
              <Input
                id="customBroker"
                placeholder={t('accounts.customBrokerPlaceholder')}
                {...register('customBroker', { 
                  required: watchedBroker === 'Other' ? 'Custom broker name is required' : false 
                })}
                disabled={isSubmitting}
              />
              {errors.customBroker && (
                <p className="text-sm text-red-500">{errors.customBroker.message}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('accounts.createAccount')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
