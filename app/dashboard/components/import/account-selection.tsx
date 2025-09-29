import React, { useState, useEffect } from 'react'
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Building2, User, AlertCircle, RefreshCw, Target, Clock, AlertTriangle } from 'lucide-react'
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAccounts } from "@/hooks/use-accounts"
import { useRealtimeAccounts } from "@/hooks/use-realtime-accounts"
import { OptimizedAccountSelectionLoading } from "@/components/ui/optimized-loading"
import { getCurrentActivePhase } from "@/server/accounts"

// Temporary translation function
const useTranslations = () => {
  const t = (key: string) => key
  return { t }
}

interface UnifiedAccount {
  id: string
  number: string
  name?: string
  broker?: string
  displayName: string
  accountType: 'prop-firm' | 'live'
  startingBalance: number
  status: string
  currentPhase?: {
    phaseNumber: number
    status: string
    phaseId: string | null
  }
}

interface AccountSelectionProps {
  accountNumber: string
  setAccountNumber: React.Dispatch<React.SetStateAction<string>>
  selectedAccountId?: string
  setSelectedAccountId?: React.Dispatch<React.SetStateAction<string>>
}

export default function AccountSelection({
  accountNumber,
  setAccountNumber,
  selectedAccountId,
  setSelectedAccountId
}: AccountSelectionProps) {
  const { accounts, isLoading, error, refetch } = useAccounts()
  const [hasError, setHasError] = useState(false)
  const [accountsWithPhases, setAccountsWithPhases] = useState<UnifiedAccount[]>([])
  const [isLoadingPhases, setIsLoadingPhases] = useState(false)
  
  // Enable real-time updates for better UX
  const { isConnected } = useRealtimeAccounts({
    enabled: true,
    onUpdate: () => {
      // Accounts will auto-update via the useAccounts hook
    }
  })

  // Update error state when hook error changes
  useEffect(() => {
    if (error) {
      setHasError(true)
      toast.error("Error", {
        description: error,
      })
    } else {
      setHasError(false)
    }
  }, [error, toast])

  // Optimized phase loading with better error handling and performance
  useEffect(() => {
    const loadPhases = async () => {
      if (accounts.length === 0) {
        setAccountsWithPhases([])
        return
      }

      setIsLoadingPhases(true)
      
      try {
        // Process accounts in smaller batches for better performance
        const batchSize = 5
        const batches = []
        for (let i = 0; i < accounts.length; i += batchSize) {
          batches.push(accounts.slice(i, i + batchSize))
        }

        let allUpdatedAccounts: UnifiedAccount[] = []
        
        for (const batch of batches) {
          const batchResults = await Promise.allSettled(
            batch.map(async (account) => {
              if (account.accountType === 'prop-firm') {
                try {
                  const currentPhase = await getCurrentActivePhase(account.id)
                  if (currentPhase) {
                    return {
                      ...account,
                      currentPhase: {
                        phaseNumber: currentPhase.phaseNumber,
                        status: currentPhase.status,
                        phaseId: currentPhase.phaseId
                      }
                    }
                  }
                } catch (phaseError) {
                  console.warn(`Failed to load phase for account ${account.id}:`, phaseError)
                }
              }
              return account
            })
          )

          // Extract successful results
          const batchAccounts = batchResults
            .filter((result): result is PromiseFulfilledResult<UnifiedAccount> => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<UnifiedAccount>).value)
          
          allUpdatedAccounts = [...allUpdatedAccounts, ...batchAccounts]
          
          // Update UI progressively for better UX
          setAccountsWithPhases([...allUpdatedAccounts])
          
          // Small delay between batches to prevent overwhelming the server
          if (batches.length > 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      } catch (error) {
        console.error('Error loading account phases:', error)
        // Fallback to accounts without phase data
        setAccountsWithPhases(accounts)
      } finally {
        setIsLoadingPhases(false)
      }
    }

    loadPhases()
  }, [accounts])

  if (isLoading || isLoadingPhases) {
    return (
      <OptimizedAccountSelectionLoading 
        accountCount={isLoading ? 3 : Math.max(3, accountsWithPhases.length)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">
            Select Account
          </Label>
          <p className="text-sm text-muted-foreground">
            {accounts.length === 0
              ? "No accounts found"
              : "Choose an existing account or create a new one"
            }
          </p>
        </div>

      {accounts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {hasError ? "Failed to fetch accounts" : "No accounts found"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {hasError
                ? "There was an error loading your accounts. Please try again."
                : "You need to create an account first before importing trades"
              }
            </p>
            {hasError ? (
              <Button
                onClick={() => refetch()}
                disabled={isLoading}
                className="mb-4"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                {isLoading ? 'Retrying...' : 'Retry'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Go to Accounts page to create new accounts
              </p>
            )}
          </Card>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto mt-4 py-2 min-h-[200px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accountsWithPhases.map((account) => (
              <Card
                key={account.id}
                className={cn(
                  "p-6 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 relative group",
                  selectedAccountId === account.id ? "border-primary bg-primary/5 shadow-md" : "border-border"
                )}
                onClick={() => {
                  setAccountNumber(account.number)
                  setSelectedAccountId?.(account.id)
                }}
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
                        ? account.displayName || "Unknown Prop Firm"
                        : (account as any).broker || "Unknown Broker"
                      }
                    </p>
                    {account.accountType === 'prop-firm' && account.currentPhase && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant={
                            account.currentPhase.status === 'active' ? 'default' :
                            account.currentPhase.status === 'passed' ? 'secondary' :
                            'destructive'
                          }
                          className="text-xs"
                        >
                          {account.currentPhase.status === 'active' && <Target className="h-3 w-3 mr-1" />}
                          {account.currentPhase.status === 'passed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {account.currentPhase.status === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {account.currentPhase.phaseNumber >= 3 ? 'FUNDED' : 
                           account.currentPhase.phaseNumber === 2 ? 'PHASE 2' : 
                           'PHASE 1'}
                        </Badge>
                        {account.currentPhase.phaseId && (
                          <span className="text-xs font-mono text-muted-foreground">
                            #{account.currentPhase.phaseId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedAccountId === account.id && (
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