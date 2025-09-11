'use client'

/**
 * Accounts wrapper component using the shared hook
 * Prevents duplicate API calls across different components
 */

import { useAccounts } from '@/hooks/use-accounts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

interface AccountsWrapperProps {
  children: (props: {
    accounts: any[]
    propFirmAccounts: any[]
    allAccounts: any[]
    isLoading: boolean
    isPropFirmLoading: boolean
    error: string | null
    propFirmError: string | null
    refetch: () => Promise<void>
    refetchPropFirm: () => Promise<void>
  }) => React.ReactNode
}

export function AccountsWrapper({ children }: AccountsWrapperProps) {
  const accountsData = useAccounts()

  return (
    <div className="space-y-4">
      {/* Error handling for live accounts */}
      {accountsData.error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Live Accounts: {accountsData.error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={accountsData.refetch}
              disabled={accountsData.isLoading}
            >
              {accountsData.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Retry'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Error handling for prop firm accounts */}
      {accountsData.propFirmError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Prop Firm Accounts: {accountsData.propFirmError}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={accountsData.refetchPropFirm}
              disabled={accountsData.isPropFirmLoading}
            >
              {accountsData.isPropFirmLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Retry'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {(accountsData.isLoading || accountsData.isPropFirmLoading) && (
        <Card>
          <CardContent className="flex items-center justify-center p-6">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading accounts...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Render children with accounts data */}
      {children(accountsData)}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
            <CardDescription className="text-xs">
              This card only appears in development
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div>Live Accounts: {accountsData.accounts.length} loaded</div>
            <div>Prop Firm Accounts: {accountsData.propFirmAccounts.length} loaded</div>
            <div>Total Accounts: {accountsData.allAccounts.length}</div>
            <div>Live Loading: {accountsData.isLoading ? 'Yes' : 'No'}</div>
            <div>Prop Firm Loading: {accountsData.isPropFirmLoading ? 'Yes' : 'No'}</div>
            <div>Live Error: {accountsData.error || 'None'}</div>
            <div>Prop Firm Error: {accountsData.propFirmError || 'None'}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

