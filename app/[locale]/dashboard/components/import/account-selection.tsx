import React, { useState, useEffect } from 'react'
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Building2, User, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useI18n } from "@/locales/client"
import { useToast } from "@/hooks/use-toast"
import { fetchWithFallback } from "@/lib/network-fallback"

interface UnifiedAccount {
  id: string
  number: string
  name?: string
  broker?: string
  propfirm: string
  accountType: 'prop-firm' | 'live'
  displayName: string
  startingBalance: number
  status: string
}

interface AccountSelectionProps {
  accountNumber: string
  setAccountNumber: React.Dispatch<React.SetStateAction<string>>
}

export default function AccountSelection({
  accountNumber,
  setAccountNumber
}: AccountSelectionProps) {
  const [accounts, setAccounts] = useState<UnifiedAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [isRequestInProgress, setIsRequestInProgress] = useState(false)
  const t = useI18n()
  const { toast } = useToast()

  // Fetch all accounts with retry logic and network fallbacks
  const fetchAccounts = async (retryCount = 0) => {
    // Prevent multiple simultaneous requests
    if (isRequestInProgress) {
      return
    }
    
    try {
      setIsRequestInProgress(true)
      setIsLoading(true)
      setHasError(false)
      
      // Use network-aware fetch with automatic retries
      const response = await fetchWithFallback('/api/accounts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, 2)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch accounts'}`)
      }

      const data = await response.json()
      if (data.success) {
        setAccounts(data.data || [])
        setHasError(false)
      } else {
        throw new Error(data.error || 'Failed to fetch accounts')
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      
      // Simplified retry logic to prevent loops
      if (retryCount < 1 && error instanceof Error && 
          (error.message.includes('HTTP 5') || error.message.includes('503'))) {
        console.log(`Retrying fetchAccounts in 3 seconds...`)
        setTimeout(() => {
          fetchAccounts(retryCount + 1)
        }, 3000)
        return
      }
      
      setHasError(true)
      toast({
        title: t('import.error.fetchAccounts'),
        description: error instanceof Error ? error.message : t('import.error.fetchAccountsDescription'),
        variant: "destructive"
      })
      
      // Set empty accounts array on error to show the no accounts state
      setAccounts([])
    } finally {
      setIsLoading(false)
      setIsRequestInProgress(false)
    }
  }

  useEffect(() => {
    fetchAccounts()
  }, []) // Remove fetchAccounts dependency to prevent loops

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">
            {t('import.account.selectAccount')}
          </Label>
          <p className="text-sm text-muted-foreground">
            {t('import.account.loadingAccounts')}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto mt-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-2">
        <Label className="text-lg font-semibold">
          {t('import.account.selectAccount')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {accounts.length === 0 
            ? t('import.account.noAccountsDescription')
            : t('import.account.selectFromExistingAccounts')
          }
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {hasError ? t('import.error.fetchAccounts') : t('import.account.noAccounts')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {hasError 
                ? t('import.error.fetchAccountsDescription')
                : t('import.account.createAccountFirst')
              }
            </p>
            {hasError ? (
              <Button 
                onClick={() => fetchAccounts()} 
                disabled={isLoading}
                className="mb-4"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                {isLoading ? 'Retrying...' : 'Retry'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('import.account.goToAccountsPage')}
              </p>
            )}
          </Card>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto mt-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <Card
                key={account.id}
                className={cn(
                  "p-6 cursor-pointer hover:border-primary transition-colors relative group",
                  accountNumber === account.number ? "border-primary bg-primary/5" : ""
                )}
                onClick={() => setAccountNumber(account.number)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {account.accountType === 'prop-firm' ? (
                        <Building2 className="h-4 w-4 text-blue-500" />
                      ) : (
                        <User className="h-4 w-4 text-green-500" />
                      )}
                      <p className="font-medium">{account.displayName}</p>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {account.number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {account.accountType === 'prop-firm' 
                        ? account.propfirm || t('import.account.propFirm')
                        : account.broker || t('import.account.liveBroker')
                      }
                    </p>
                  </div>
                  {accountNumber === account.number && (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}