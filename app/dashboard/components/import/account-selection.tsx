import React, { useState, useEffect } from 'react'
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Building2, User, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useAccounts } from "@/hooks/use-accounts"

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
  const { accounts, isLoading, error, refetch } = useAccounts()
  const [hasError, setHasError] = useState(false)
  const { toast } = useToast()

  // Update error state when hook error changes
  useEffect(() => {
    if (error) {
      setHasError(true)
      toast({
        title: "Loading...",
        description: error,
        variant: "destructive"
      })
    } else {
      setHasError(false)
    }
  }, [error, toast])

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="space-y-2">
          <Label className="text-lg font-semibold">
            Select Account
          </Label>
          <p className="text-sm text-muted-foreground">
            Choose the account to import data into
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
          Select Account
        </Label>
        <p className="text-sm text-muted-foreground">
          {accounts.length === 0 
            ? "No accounts available"
            : "Choose the account to import data into"
          }
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {hasError ? "Loading..." : "Loading..."}
            </h3>
            <p className="text-muted-foreground mb-4">
              {hasError 
                ? "Loading..."
                : "Loading..."
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
                Unable to load accounts
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
                        ? account.propfirm || "Loading..."
                        : (account as any).broker || "Loading..."
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