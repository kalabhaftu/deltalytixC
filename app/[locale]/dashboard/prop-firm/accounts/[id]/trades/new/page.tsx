'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useI18n } from "@/locales/client"
import { useAuth } from "@/context/auth-provider"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Save } from 'lucide-react'

// Trade creation schema
const tradeSchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9./-]+$/, {
    message: "Symbol contains invalid characters"
  }),
  side: z.enum(['long', 'short']),
  quantity: z.number().int().min(1).max(1000000),
  entryPrice: z.number().min(0.0001).max(1000000),
  exitPrice: z.number().min(0.0001).max(1000000).optional(),
  entryTime: z.string().min(1),
  exitTime: z.string().optional(),
  fees: z.number().min(0).optional(),
  commission: z.number().min(0).optional(),
  strategy: z.string().min(1).max(50).optional(),
  comment: z.string().max(1000).optional(),
})

type TradeFormData = z.infer<typeof tradeSchema>

interface AccountData {
  id: string
  number: string
  name?: string
  propfirm: string
  startingBalance: number
  status: string
  currentPhase?: {
    id: string
    phaseType: string
    phaseStatus: string
    currentEquity: number
  }
}

export default function NewTradePage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const t = useI18n()
  const [account, setAccount] = useState<AccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const accountId = params.id as string

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      side: 'long',
      fees: 0,
      commission: 0,
    }
  })

  const watchedValues = watch()

  // Fetch account details
  const fetchAccount = async () => {
    try {
      const response = await fetch(`/api/prop-firm/accounts/${accountId}`)
      
             if (!response.ok) {
         throw new Error('Failed to fetch account details')
       }

       const data = await response.json()
       if (data.success) {
         setAccount(data.data.account)
       } else {
         throw new Error(data.error || 'Failed to fetch account details')
       }
     } catch (error) {
       console.error('Error fetching account details:', error)
       toast({
         title: t('propFirm.trade.new.fetchError'),
         description: t('propFirm.trade.new.fetchErrorDescription'),
         variant: "destructive"
       })
    } finally {
      setIsLoading(false)
    }
  }

  // Load account on mount
  useEffect(() => {
    if (user && accountId) {
      fetchAccount()
    }
  }, [user, accountId])

  const onSubmit = async (data: TradeFormData) => {
    if (!account) return

    setIsSubmitting(true)
    try {
      // Prepare trade data
      const tradeData = {
        ...data,
        accountId,
        entryTime: new Date(data.entryTime),
        exitTime: data.exitTime ? new Date(data.exitTime) : undefined,
      }

      const response = await fetch(`/api/prop-firm/accounts/${accountId}/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create trade')
      }

      const result = await response.json()
      
             if (result.success) {
         toast({
           title: t('propFirm.trade.new.success'),
           description: t('propFirm.trade.new.successDescription', { symbol: data.symbol }),
         })
         
         // Navigate back to trades list
         router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)
       } else {
         throw new Error(result.error || 'Failed to create trade')
       }
     } catch (error) {
       console.error('Error creating trade:', error)
       toast({
         title: t('propFirm.trade.new.error'),
         description: error instanceof Error ? error.message : t('propFirm.trade.new.errorDescription'),
         variant: "destructive"
       })
    } finally {
      setIsSubmitting(false)
    }
  }

     if (isLoading) {
     return (
       <div className="container mx-auto p-6">
         <div className="flex items-center justify-center h-64">
           <div className="text-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
             <p className="text-muted-foreground">{t('propFirm.trade.new.loading')}</p>
           </div>
         </div>
       </div>
     )
   }

   if (!account) {
     return (
       <div className="container mx-auto p-6">
         <div className="flex items-center justify-center h-64">
           <div className="text-center">
             <ArrowLeft className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
             <h3 className="text-lg font-semibold mb-2">{t('propFirm.trade.new.accountNotFound')}</h3>
             <p className="text-muted-foreground">{t('propFirm.trade.new.accountNotFoundDescription')}</p>
             <Button onClick={() => router.back()} className="mt-4">
               <ArrowLeft className="h-4 w-4 mr-2" />
               {t('propFirm.trade.new.goBack')}
             </Button>
           </div>
         </div>
       </div>
     )
   }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
                     <Button
             variant="ghost"
             size="sm"
             onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)}
           >
             <ArrowLeft className="h-4 w-4 mr-2" />
             {t('propFirm.trade.new.backToTrades')}
           </Button>
           <div>
             <h1 className="text-3xl font-bold">{t('propFirm.trade.new.title')}</h1>
             <p className="text-muted-foreground">
               {account.name || account.number} • {account.propfirm}
             </p>
           </div>
        </div>
      </div>

             {/* Account Info */}
       <Card>
         <CardHeader>
           <CardTitle>{t('propFirm.trade.new.accountInfo')}</CardTitle>
           <CardDescription>{t('propFirm.trade.new.accountInfoDescription')}</CardDescription>
         </CardHeader>
         <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div>
             <Label className="text-sm font-medium text-muted-foreground">{t('propFirm.trade.new.accountNumber')}</Label>
             <p className="text-lg font-semibold">{account.number}</p>
           </div>
           <div>
             <Label className="text-sm font-medium text-muted-foreground">{t('propFirm.trade.new.status')}</Label>
             <p className="text-lg font-semibold capitalize">{account.status}</p>
           </div>
           <div>
             <Label className="text-sm font-medium text-muted-foreground">{t('propFirm.trade.new.currentPhase')}</Label>
             <p className="text-lg font-semibold capitalize">
               {account.currentPhase?.phaseType?.replace('_', ' ') || t('propFirm.trade.new.noActivePhase')}
             </p>
           </div>
         </CardContent>
       </Card>

             {/* Trade Form */}
       <Card>
         <CardHeader>
           <CardTitle>{t('propFirm.trade.new.tradeDetails')}</CardTitle>
           <CardDescription>{t('propFirm.trade.new.description')}</CardDescription>
         </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                         {/* Basic Trade Info */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="symbol">{t('propFirm.trade.form.symbol')} *</Label>
                 <Input
                   id="symbol"
                   {...register('symbol')}
                   placeholder={t('propFirm.trade.placeholders.symbol')}
                   className={errors.symbol ? 'border-red-500' : ''}
                 />
                 {errors.symbol && (
                   <p className="text-sm text-red-500">{t('propFirm.trade.form.symbolRequired')}</p>
                 )}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="side">{t('propFirm.trade.form.side')} *</Label>
                 <Select
                   value={watchedValues.side}
                   onValueChange={(value) => setValue('side', value as 'long' | 'short')}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder={`Select ${t('propFirm.trade.form.side').toLowerCase()}`} />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="long">{t('propFirm.trade.form.sideLong')}</SelectItem>
                     <SelectItem value="short">{t('propFirm.trade.form.sideShort')}</SelectItem>
                   </SelectContent>
                 </Select>
                 {errors.side && (
                   <p className="text-sm text-red-500">{errors.side.message}</p>
                 )}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="quantity">{t('propFirm.trade.form.quantity')} *</Label>
                 <Input
                   id="quantity"
                   type="number"
                   {...register('quantity', { valueAsNumber: true })}
                   placeholder={t('propFirm.trade.placeholders.quantity')}
                   min="1"
                   className={errors.quantity ? 'border-red-500' : ''}
                 />
                 {errors.quantity && (
                   <p className="text-sm text-red-500">{t('propFirm.trade.form.quantityRequired')}</p>
                 )}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="strategy">{t('propFirm.trade.form.strategy')}</Label>
                 <Input
                   id="strategy"
                   {...register('strategy')}
                   placeholder={t('propFirm.trade.placeholders.strategy')}
                 />
                 {errors.strategy && (
                   <p className="text-sm text-red-500">{errors.strategy.message}</p>
                 )}
               </div>
             </div>

                         {/* Pricing */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="entryPrice">{t('propFirm.trade.form.entryPrice')} *</Label>
                 <Input
                   id="entryPrice"
                   type="number"
                   step="0.000001"
                   {...register('entryPrice', { valueAsNumber: true })}
                   placeholder={t('propFirm.trade.placeholders.entryPrice')}
                   className={errors.entryPrice ? 'border-red-500' : ''}
                 />
                 {errors.entryPrice && (
                   <p className="text-sm text-red-500">{t('propFirm.trade.form.entryPriceRequired')}</p>
                 )}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="exitPrice">{t('propFirm.trade.form.exitPrice')}</Label>
                 <Input
                   id="exitPrice"
                   type="number"
                   step="0.000001"
                   {...register('exitPrice', { valueAsNumber: true })}
                   placeholder={t('propFirm.trade.placeholders.exitPrice')}
                   className={errors.exitPrice ? 'border-red-500' : ''}
                 />
                 {errors.exitPrice && (
                   <p className="text-sm text-red-500">{t('propFirm.trade.form.exitPriceRequired')}</p>
                 )}
               </div>
             </div>

                         {/* Timing */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="entryTime">{t('propFirm.trade.form.entryTime')} *</Label>
                 <Input
                   id="entryTime"
                   type="datetime-local"
                   {...register('entryTime')}
                   className={errors.entryTime ? 'border-red-500' : ''}
                 />
                 {errors.entryTime && (
                   <p className="text-sm text-red-500">{t('propFirm.trade.form.entryTimeRequired')}</p>
                 )}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="exitTime">{t('propFirm.trade.form.exitTime')}</Label>
                 <Input
                   id="exitTime"
                   type="datetime-local"
                   {...register('exitTime')}
                   className={errors.exitTime ? 'border-red-500' : ''}
                 />
                 {errors.exitTime && (
                   <p className="text-sm text-red-500">{errors.exitTime.message}</p>
                 )}
               </div>
             </div>

                         {/* Fees */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="fees">{t('propFirm.trade.form.fees')}</Label>
                 <Input
                   id="fees"
                   type="number"
                   step="0.01"
                   {...register('fees', { valueAsNumber: true })}
                   placeholder={t('propFirm.trade.placeholders.fees')}
                 />
                 {errors.fees && (
                   <p className="text-sm text-red-500">{errors.fees.message}</p>
                 )}
               </div>

               <div className="space-y-2">
                 <Label htmlFor="commission">{t('propFirm.trade.form.commission')}</Label>
                 <Input
                   id="commission"
                   type="number"
                   step="0.01"
                   {...register('commission', { valueAsNumber: true })}
                   placeholder={t('propFirm.trade.placeholders.commission')}
                 />
                 {errors.commission && (
                   <p className="text-sm text-red-500">{errors.commission.message}</p>
                 )}
               </div>
             </div>

                         {/* Notes */}
             <div className="space-y-2">
               <Label htmlFor="comment">{t('propFirm.trade.form.comment')}</Label>
               <Textarea
                 id="comment"
                 {...register('comment')}
                 placeholder={t('propFirm.trade.form.commentPlaceholder')}
                 rows={3}
               />
               {errors.comment && (
                 <p className="text-sm text-red-500">{errors.comment.message}</p>
                 )}
             </div>

                         {/* Submit */}
             <div className="flex justify-end gap-4">
               <Button
                 type="button"
                 variant="outline"
                 onClick={() => router.push(`/dashboard/prop-firm/accounts/${accountId}/trades`)}
               >
                 {t('propFirm.trade.new.cancel')}
               </Button>
               <Button type="submit" disabled={isSubmitting}>
                 {isSubmitting ? (
                   <>
                     <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                     {t('propFirm.trade.new.creating')}
                   </>
                 ) : (
                   <>
                     <Save className="h-4 w-4 mr-2" />
                     {t('propFirm.trade.new.submit')}
                   </>
                 )}
               </Button>
             </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
