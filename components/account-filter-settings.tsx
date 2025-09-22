'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Building2, User, CheckCircle2, XCircle, Clock, Trophy } from 'lucide-react'
import { useAccountFilterSettings } from '@/hooks/use-account-filter-settings'
import { useAccounts } from '@/hooks/use-accounts'
import { useToast } from '@/hooks/use-toast'
import { AccountFilterSettings } from '@/types/account-filter-settings'

interface AccountFilterSettingsProps {
  className?: string
}

export function AccountFilterSettingsCard({ className }: AccountFilterSettingsProps) {
  const { settings, isLoading, isSaving, updateSettings, resetToDefaults } = useAccountFilterSettings()
  const { accounts, isLoading: accountsLoading } = useAccounts({ includeFailed: true }) // Get all accounts for display
  const { toast } = useToast()

  const handleModeChange = async (mode: AccountFilterSettings['showMode']) => {
    try {
      await updateSettings({ showMode: mode })
      
      const modeMessages = {
        'active-only': 'Now showing only active and funded accounts',
        'all-accounts': 'Now showing all accounts including passed and failed',
        'custom': 'Custom filtering mode enabled'
      }
      
      toast({
        title: "Filter Updated",
        description: modeMessages[mode],
        duration: 3000,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update filter settings",
        variant: "destructive",
      })
    }
  }

  const handleStatusToggle = async (status: string, enabled: boolean) => {
    try {
      const newStatuses = enabled 
        ? [...settings.includeStatuses, status as any]
        : settings.includeStatuses.filter(s => s !== status)
      
      await updateSettings({ includeStatuses: newStatuses })
      
      toast({
        title: "Status Filter Updated",
        description: `${status.charAt(0).toUpperCase() + status.slice(1)} accounts ${enabled ? 'included' : 'excluded'}`,
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status filter",
        variant: "destructive",
      })
    }
  }

  const handleAccountTypeToggle = async (type: string, enabled: boolean) => {
    try {
      const updates: Partial<AccountFilterSettings> = {}
      
      switch (type) {
        case 'live':
          updates.showLiveAccounts = enabled
          break
        case 'prop-firm':
          updates.showPropFirmAccounts = enabled
          break
        case 'phase-1':
          updates.showPhase1Accounts = enabled
          break
        case 'phase-2':
          updates.showPhase2Accounts = enabled
          break
        case 'funded':
          updates.showFundedAccounts = enabled
          break
        case 'passed':
          updates.showPassedAccounts = enabled
          break
        case 'failed':
          updates.showFailedAccounts = enabled
          break
      }
      
      await updateSettings(updates)
      
      const typeMessages: Record<string, string> = {
        'live': 'Live accounts',
        'prop-firm': 'Prop firm accounts',
        'phase-1': 'Phase 1 accounts',
        'phase-2': 'Phase 2 accounts',
        'funded': 'Funded accounts',
        'passed': 'Passed accounts',
        'failed': 'Failed accounts'
      }
      
      toast({
        title: "Account Type Updated",
        description: `${typeMessages[type]} ${enabled ? 'included' : 'excluded'} from view`,
        duration: 2000,
      })
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update account type filter",
        variant: "destructive",
      })
    }
  }

  if (isLoading || accountsLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Account Filtering</CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Group accounts by type and status for display
  const liveAccounts = accounts.filter(acc => acc.accountType === 'live')
  const propFirmAccounts = accounts.filter(acc => acc.accountType === 'prop-firm')
  
  const accountsByStatus = {
    active: accounts.filter(acc => acc.status === 'active'),
    funded: accounts.filter(acc => acc.status === 'funded'),
    passed: accounts.filter(acc => acc.status === 'passed'),
    failed: accounts.filter(acc => acc.status === 'failed'),
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Clock className="h-3 w-3" />
      case 'funded': return <Trophy className="h-3 w-3" />
      case 'passed': return <CheckCircle2 className="h-3 w-3" />
      case 'failed': return <XCircle className="h-3 w-3" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'outline'
      case 'funded': return 'default'
      case 'passed': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Account Filtering Settings
        </CardTitle>
        <CardDescription>
          Control which accounts and data are shown across the dashboard and tables.
          These settings sync across all your devices.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Global Mode Selection */}
        <div className="space-y-4">
          <Label className="text-base font-medium">Display Mode</Label>
          <RadioGroup 
            value={settings.showMode} 
            onValueChange={handleModeChange}
            className="grid gap-3"
            disabled={isSaving}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="active-only" id="active-only" />
              <Label htmlFor="active-only" className="flex-1">
                <div className="font-medium">Active Accounts Only</div>
                <div className="text-sm text-muted-foreground">
                  Show only active and funded accounts (recommended)
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all-accounts" id="all-accounts" />
              <Label htmlFor="all-accounts" className="flex-1">
                <div className="font-medium">All Accounts</div>
                <div className="text-sm text-muted-foreground">
                  Show all accounts including passed and failed
                </div>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="flex-1">
                <div className="font-medium">Custom Selection</div>
                <div className="text-sm text-muted-foreground">
                  Choose specific accounts and statuses to show
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Custom Settings - Only show when custom mode is selected */}
        {settings.showMode === 'custom' && (
          <>
            <Separator />
            
            {/* Account Type Filters */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Account Types</Label>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-500" />
                    <Label>Live Accounts ({liveAccounts.length})</Label>
                  </div>
                  <Switch
                    checked={settings.showLiveAccounts}
                    onCheckedChange={(checked) => handleAccountTypeToggle('live', checked)}
                    disabled={isSaving}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <Label>Prop Firm Accounts ({propFirmAccounts.length})</Label>
                  </div>
                  <Switch
                    checked={settings.showPropFirmAccounts}
                    onCheckedChange={(checked) => handleAccountTypeToggle('prop-firm', checked)}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Status Filters */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Account Status</Label>
              <div className="grid gap-3">
                {Object.entries(accountsByStatus).map(([status, statusAccounts]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      <Label className="capitalize">{status} Accounts</Label>
                      <Badge variant={getStatusColor(status)} className="text-xs">
                        {statusAccounts.length}
                      </Badge>
                    </div>
                    <Switch
                      checked={
                        status === 'passed' ? settings.showPassedAccounts :
                        status === 'failed' ? settings.showFailedAccounts :
                        settings.includeStatuses.includes(status as any)
                      }
                      onCheckedChange={(checked) => {
                        if (status === 'passed') {
                          handleAccountTypeToggle('passed', checked)
                        } else if (status === 'failed') {
                          handleAccountTypeToggle('failed', checked)
                        } else {
                          handleStatusToggle(status, checked)
                        }
                      }}
                      disabled={isSaving}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Prop Firm Phase Filters */}
            {settings.showPropFirmAccounts && (
              <>
                <Separator />
                <div className="space-y-4">
                  <Label className="text-base font-medium">Prop Firm Phases</Label>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <Label>Phase 1 Accounts</Label>
                      <Switch
                        checked={settings.showPhase1Accounts}
                        onCheckedChange={(checked) => handleAccountTypeToggle('phase-1', checked)}
                        disabled={isSaving}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Phase 2 Accounts</Label>
                      <Switch
                        checked={settings.showPhase2Accounts}
                        onCheckedChange={(checked) => handleAccountTypeToggle('phase-2', checked)}
                        disabled={isSaving}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label>Funded Accounts</Label>
                      <Switch
                        checked={settings.showFundedAccounts}
                        onCheckedChange={(checked) => handleAccountTypeToggle('funded', checked)}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={async () => {
              try {
                await resetToDefaults()
                toast({
                  title: "Settings Reset",
                  description: "Filter settings have been reset to defaults (active accounts only)",
                  duration: 3000,
                })
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to reset settings",
                  variant: "destructive",
                })
              }
            }}
            size="sm"
            disabled={isSaving}
          >
            Reset to Defaults
          </Button>
          
          <div className="text-xs text-muted-foreground">
            {isSaving ? (
              <span className="flex items-center gap-1">
                <div className="h-3 w-3 border border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              `Last updated: ${new Date(settings.updatedAt).toLocaleString()}`
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
