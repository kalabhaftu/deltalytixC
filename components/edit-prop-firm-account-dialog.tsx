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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Building2 } from "lucide-react"
import { useRegisterDialog } from "@/app/dashboard/components/auto-refresh-provider"

const editAccountSchema = z.object({
  accountName: z.string().min(1, 'Account name is required').max(100, 'Name too long'),
})

type EditAccountForm = z.infer<typeof editAccountSchema>

interface PropFirmAccountData {
  id: string
  accountName?: string
  name?: string
  displayName?: string
  propfirm?: string
  currentPhaseDetails?: {
    masterAccountId?: string
  } | null
}

interface EditPropFirmAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: PropFirmAccountData | null
  onSuccess?: () => void
}

export function EditPropFirmAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess
}: EditPropFirmAccountDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [pendingClose, setPendingClose] = useState(false)
  
  // Register dialog to pause auto-refresh while open
  useRegisterDialog(open)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch
  } = useForm<EditAccountForm>({
    resolver: zodResolver(editAccountSchema)
  })

  const formValues = watch()

  // Local storage key for draft
  const draftKey = account?.id ? `draft-prop-firm-account-edit-${account.id}` : null

  // Load draft from localStorage when account changes
  useEffect(() => {
    if (account && open && draftKey) {
      try {
        const savedDraft = localStorage.getItem(draftKey)
        if (savedDraft) {
          const draft = JSON.parse(savedDraft)
          setValue('accountName', draft.accountName)
          setHasUnsavedChanges(true)
        } else {
          // No draft, use current account values
          setValue('accountName', account.accountName || account.name || account.displayName || '')
        }
      } catch (error) {
        // If draft is corrupted, use current account values
        setValue('accountName', account.accountName || account.name || account.displayName || '')
      }
    }
  }, [account, open, setValue, draftKey])

  // Save draft to localStorage when form values change
  useEffect(() => {
    if (draftKey && isDirty && open) {
      try {
        localStorage.setItem(draftKey, JSON.stringify(formValues))
        setHasUnsavedChanges(true)
      } catch (error) {
        // Ignore localStorage errors
      }
    }
  }, [formValues, isDirty, draftKey, open])

  // Warn before closing with unsaved changes
  const handleClose = (forceClose = false) => {
    if (hasUnsavedChanges && isDirty && !forceClose) {
      setShowUnsavedWarning(true)
      setPendingClose(true)
    } else {
      // Clear draft when closing without saving
      if (draftKey && !forceClose) {
        try {
          localStorage.removeItem(draftKey)
        } catch (error) {
          // Ignore localStorage errors
        }
      }
      reset()
      setHasUnsavedChanges(false)
      setPendingClose(false)
      onOpenChange(false)
    }
  }

  const handleDiscardChanges = () => {
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey)
      } catch (error) {
        // Ignore localStorage errors
      }
    }
    reset()
    setHasUnsavedChanges(false)
    setShowUnsavedWarning(false)
    setPendingClose(false)
    onOpenChange(false)
  }

  const handleKeepEditing = () => {
    setShowUnsavedWarning(false)
    setPendingClose(false)
  }

  const onSubmit = async (data: EditAccountForm) => {
    if (!account) return

    try {
      setIsSaving(true)

      // For prop firm accounts, use master account ID
      const masterAccountId = account.currentPhaseDetails?.masterAccountId || account.id
      const endpoint = `/api/prop-firm/accounts/${masterAccountId}`

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountName: data.accountName.trim()
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update account')
      }

      toast.success('Account Updated', {
        description: 'Your prop firm account has been successfully updated.',
      })

      // Clear draft after successful save
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey)
        } catch (error) {
          // Ignore localStorage errors
        }
      }

      // Close dialog and trigger success callback
      reset()
      setHasUnsavedChanges(false)
      onOpenChange(false)
      onSuccess?.()

    } catch (error) {
      toast.error('Update Failed', {
        description: error instanceof Error ? error.message : 'Failed to update account',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!account) return null

  return (
    <>
      <Dialog open={open} onOpenChange={() => handleClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Edit Prop Firm Account
            </DialogTitle>
            <DialogDescription>
              Update your prop firm account name. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>

          <form 
            onSubmit={handleSubmit(onSubmit)} 
            onKeyDown={(e) => {
              // Prevent Enter key from submitting the form when in input fields
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                e.preventDefault()
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name *</Label>
              <Input
                id="accountName"
                placeholder="Enter account name"
                {...register('accountName')}
                disabled={isSaving}
              />
              {errors.accountName && (
                <p className="text-sm text-red-500">{errors.accountName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Prop Firm</Label>
              <Input
                value={account.propfirm || 'N/A'}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Prop firm cannot be changed
              </p>
            </div>

            {hasUnsavedChanges && isDirty && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  You have unsaved changes. They will be lost if you close without saving.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose()} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !isDirty}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this account. If you close now, your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepEditing}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDiscardChanges} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

