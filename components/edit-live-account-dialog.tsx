'use client'

import { useState, useEffect } from 'react'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from 'zod'
import { toast } from "sonner"
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
  Save,
  User
} from "lucide-react"

const editAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100, 'Name too long'),
  broker: z.string().min(1, 'Broker is required').max(100, 'Broker name too long'),
})

type EditAccountForm = z.infer<typeof editAccountSchema>

interface LiveAccountData {
  id: string
  number: string
  name?: string
  broker?: string
  displayName?: string
  startingBalance?: number
  status?: string
  accountType?: 'live' | 'prop-firm'
}

interface EditLiveAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: LiveAccountData | null
  onSuccess?: () => void
}

export function EditLiveAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess
}: EditLiveAccountDialogProps) {
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<EditAccountForm>({
    resolver: zodResolver(editAccountSchema)
  })

  // Reset form when account changes
  useEffect(() => {
    if (account && open) {
      setValue('name', account.name || account.displayName || account.number)
      setValue('broker', account.broker || '')
    }
  }, [account, open, setValue])

  const onSubmit = async (data: EditAccountForm) => {
    if (!account) return

    try {
      setIsSaving(true)

      const response = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name.trim(),
          broker: data.broker.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update account')
      }

      toast('Account Updated', {
        description: 'Your account has been successfully updated.',
      })

      // Close dialog and trigger success callback
      onOpenChange(false)
      onSuccess?.()

    } catch (error) {
      toast('Update Failed', {
        description: error instanceof Error ? error.message : 'Failed to update account',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    reset()
    onOpenChange(false)
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Edit Account
          </DialogTitle>
          <DialogDescription>
            Update your live account settings. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name *</Label>
            <Input
              id="name"
              placeholder="Enter account name"
              {...register('name')}
              disabled={isSaving}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="broker">Broker *</Label>
            <Input
              id="broker"
              placeholder="Enter broker name"
              {...register('broker')}
              disabled={isSaving}
            />
            {errors.broker && (
              <p className="text-sm text-red-500">{errors.broker.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={account.number}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Account number cannot be changed
            </p>
          </div>

          <div className="space-y-2">
            <Label>Starting Balance</Label>
            <Input
              value={`$${(account.startingBalance || 0).toLocaleString()}`}    
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Starting balance cannot be changed
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Save className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
