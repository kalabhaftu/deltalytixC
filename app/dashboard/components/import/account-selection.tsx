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
  currentPhase?: number | {
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

  // Filter accounts for import - only show active phases and all live accounts
  useEffect(() => {
    const prepareAccounts = () => {
      if (accounts.length === 0) {
        setAccountsWithPhases([])
        return
      }

      setIsLoadingPhases(true)
      
      try {
        // For import: only show active phases for prop-firm accounts
        const filteredAccounts = accounts.filter(acc => {
          // Show all live accounts
          if (acc.accountType === 'live') return true
          
          // For prop-firm accounts: only show active phases (NOT passed or failed)
          if (acc.accountType === 'prop-firm') {
            // Check phase status - must be active (not passed, not failed)
            const phaseStatus = acc.currentPhase?.status || acc.status
            return phaseStatus === 'active'
          }
          
          return false
        })

        // Map to include phase details in the expected format
        const accountsWithPhaseData = filteredAccounts.map((account) => {
          // Use phaseDetails that's already loaded from server
          if (account.accountType === 'prop-firm') {
            const phaseDetails = (account as any).phaseDetails
            if (phaseDetails) {
              return {
                ...account,
                currentPhase: {
                  phaseNumber: phaseDetails.phaseNumber || (account as any).currentPhase,
                  status: phaseDetails.status || account.status,
                  phaseId: phaseDetails.phaseId || account.number
                }
              }
            }
          }
          return account
        })
        
        setAccountsWithPhases(accountsWithPhaseData)
      } catch (error) {
        console.error('Error preparing accounts:', error)
        setAccountsWithPhases(accounts) // Fallback to accounts without phase formatting
      } finally {
        setIsLoadingPhases(false)
      }
    }

    prepareAccounts()
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
                    {account.broker && account.accountType === 'live' && (
                      <p className="text-xs text-muted-foreground">
                        {account.broker}
                      </p>
                    )}
                    {account.accountType === 'prop-firm' && account.currentPhase && (
                      <div className="flex items-center gap-2 mt-2">
                        {(() => {
                          const phaseInfo = account.currentPhase;
                          const phaseNumber = typeof phaseInfo === 'number' ? phaseInfo : phaseInfo?.phaseNumber || 1;
                          const phaseStatus = typeof phaseInfo === 'object' ? phaseInfo?.status : 'active';
                          const phaseId = typeof phaseInfo === 'object' ? phaseInfo?.phaseId : null;

                          return (
                            <Badge
                              variant={
                                phaseStatus === 'active' ? 'default' :
                                phaseStatus === 'passed' ? 'secondary' :
                                'destructive'
                              }
                              className="text-xs"
                            >
                              {phaseStatus === 'active' && <Target className="h-3 w-3 mr-1" />}
                              {phaseStatus === 'passed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                              {phaseStatus === 'failed' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {phaseNumber >= 3 ? 'FUNDED' :
                               phaseNumber === 2 ? 'PHASE 2' :
                               'PHASE 1'}
                              {phaseId && (
                                <span className="text-xs font-mono text-muted-foreground ml-1">
                                  #{phaseId}
                                </span>
                              )}
                            </Badge>
                          );
                        })()}
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