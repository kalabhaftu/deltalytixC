'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from 'zod'
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft,
  Save,
  User
} from "lucide-react"

interface LiveAccountEditProps {
  params: {
    id: string
  }
}

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
  displayName: string
  startingBalance: number
  status: string
  accountType: 'live'
}

export default function LiveAccountEditPage({ params }: LiveAccountEditProps) {
  const router = useRouter()
  const [account, setAccount] = useState<LiveAccountData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const accountId = params.id

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<EditAccountForm>({
    resolver: zodResolver(editAccountSchema)
  })

  // Fetch account data
  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch('/api/accounts')
        if (!response.ok) throw new Error('Failed to fetch accounts')
        
        const data = await response.json()
        if (data.success) {
          const foundAccount = data.data.find((acc: LiveAccountData) => 
            acc.id === accountId && acc.accountType === 'live'
          )
          
          if (foundAccount) {
            setAccount(foundAccount)
            // Set form values
            setValue('name', foundAccount.name || foundAccount.displayName)
            setValue('broker', foundAccount.broker || '')
          } else {
            router.push('/dashboard/accounts')
          }
        }
      } catch (error) {
        console.error('Error fetching account:', error)
        router.push('/dashboard/accounts')
      } finally {
        setIsLoading(false)
      }
    }

    if (accountId) {
      fetchAccount()
    }
  }, [accountId, router, setValue])

  const onSubmit = async (data: EditAccountForm) => {
    if (!account) return

    try {
      setIsSaving(true)

      const response = await fetch(`/api/accounts/${accountId}`, {
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

      // Navigate back to account detail page
      router.push(`/dashboard/accounts/${accountId}`)

    } catch (error) {
      console.error('Error updating account:', error)
      toast('Update Failed', {
        description: error instanceof Error ? error.message : 'Failed to update account',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="p-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="h-8 bg-muted rounded w-64 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-32 mt-2 animate-pulse"></div>
            </div>
          </div>
          
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-10 bg-muted rounded"></div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Account Not Found</h1>
          <Button onClick={() => router.push('/dashboard/accounts')}>
            Return to Accounts
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/accounts/${accountId}`)}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Account</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{account.displayName} ({account.number})</span>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  value={`$${account.startingBalance.toLocaleString()}`}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Starting balance cannot be changed
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/accounts/${accountId}`)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && <Save className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


