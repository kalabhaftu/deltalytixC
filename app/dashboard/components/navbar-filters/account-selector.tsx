"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { Search, ChevronDown, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { useData } from "@/context/data-provider"
import { useAccounts } from "@/hooks/use-accounts"
import { toast } from "sonner"

interface AccountSelectorProps {
  onSave?: () => void
}

export function AccountSelector({ onSave }: AccountSelectorProps) {
  const { accountNumbers, setAccountNumbers } = useData()
  const { accounts, isLoading } = useAccounts()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set())
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)

  // Initialize selected accounts from context on mount
  useEffect(() => {
    if (accountNumbers && accountNumbers.length > 0 && accounts) {
      // Find all accounts that match the saved account numbers BY PHASE ID ONLY
      const matchingAccountIds = accounts
        .filter(acc => accountNumbers.includes(acc.number))
        .map(acc => acc.id)
      
      if (matchingAccountIds.length > 0) {
        setSelectedAccounts(new Set(matchingAccountIds))
      }
    }
  }, [accountNumbers, accounts])

  // Server now returns clean data without master account duplicates
  const filteredAccountsList = useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) return []
    return accounts
  }, [accounts])

  // Group accounts by master account name (hierarchical structure)
  const groupedAccountsByName = useMemo(() => {
    if (!filteredAccountsList || filteredAccountsList.length === 0) {
      return {}
    }

    const grouped: Record<string, {
      accountName: string
      propFirm: string
      phases: Array<{
        id: string
        number: string
        status: string
        tradeCount: number
        phaseDetails: any
        phaseId?: string
        currentPhase?: number
      }>
    }> = {}

    // Group by account name
    filteredAccountsList.forEach(account => {
      // For prop firm accounts, use the account name (which is the master account name)
      // For regular accounts, use the account name directly
      const accountName = account.accountType === 'prop-firm' ? account.name : account.name

      if (!grouped[accountName]) {
        grouped[accountName] = {
          accountName,
          propFirm: account.propfirm || '',
          phases: []
        }
      }

      grouped[accountName].phases.push({
        id: account.id,
        number: account.number,
        status: account.status,
        tradeCount: account.tradeCount || 0,
        phaseDetails: account.currentPhaseDetails,
        phaseId: account.currentPhaseDetails?.phaseId || account.number,
        currentPhase: account.currentPhase || account.currentPhaseDetails?.phaseNumber
      })
    })

    return grouped
  }, [filteredAccountsList])

  // Filter accounts by search query
  const filteredGroupedAccounts = useMemo(() => {
    if (!searchQuery) return groupedAccountsByName

      const query = searchQuery.toLowerCase()
    const filtered: Record<string, any> = {}

    Object.entries(groupedAccountsByName).forEach(([accountName, accountData]) => {
      // Check if account name matches
      if (accountName.toLowerCase().includes(query)) {
        filtered[accountName] = accountData
        return
      }

      // Check if any phase matches
      const matchingPhases = accountData.phases.filter((phase: any) =>
        phase.number.toLowerCase().includes(query) ||
        phase.status.toLowerCase().includes(query) ||
        accountData.propFirm.toLowerCase().includes(query)
      )

      if (matchingPhases.length > 0) {
        filtered[accountName] = {
          ...accountData,
          phases: matchingPhases
        }
      }
    })

    return filtered
  }, [groupedAccountsByName, searchQuery])

  // Get only active accounts for default selection
  const activeAccounts = useMemo(() => {
    if (!filteredAccountsList) return []
    return filteredAccountsList.filter(account => account.status === 'active')
  }, [filteredAccountsList])

  // Restore saved account selection from settings and auto-expand parent groups
  useEffect(() => {
    if (!accounts || accounts.length === 0) return
    
    // If accountNumbers are already set from saved settings, find and expand parent groups
    if (accountNumbers.length > 0 && selectedAccounts.size === 0) {
      const matchingAccounts = accounts.filter(acc => 
        accountNumbers.includes(acc.number) || 
        accountNumbers.includes(acc.id)
      )
      
      if (matchingAccounts.length > 0) {
        // Set selected accounts
        setSelectedAccounts(new Set(matchingAccounts.map(acc => acc.id)))
        
        // Auto-expand all parent groups for selected accounts
        const accountNames = new Set(matchingAccounts.map(acc => acc.name || acc.number))
        setExpandedAccounts(accountNames)
      }
    }
  }, [accounts, accountNumbers, selectedAccounts.size])

  // Auto-select all active accounts ONLY for new users (no saved selections)
  useEffect(() => {
    // Only auto-select if:
    // 1. Has active accounts
    // 2. No local selections
    // 3. No saved selections in context
    // 4. Not already initialized (to prevent race conditions)
    if (
      activeAccounts.length > 0 && 
      selectedAccounts.size === 0 && 
      accountNumbers.length === 0 &&
      accounts && accounts.length > 0
    ) {
      // Wait a bit to ensure settings have loaded
      const timer = setTimeout(() => {
        // Double-check no selections loaded in the meantime
        if (accountNumbers.length === 0 && selectedAccounts.size === 0) {
          // Select ALL active accounts (better UX for new users)
          const activeIds = activeAccounts.map(acc => acc.id)
          setSelectedAccounts(new Set(activeIds))
          
          // Auto-expand all parent groups for active accounts
          const accountNames = new Set(activeAccounts.map(acc => acc.name || acc.number))
          setExpandedAccounts(accountNames)
          
          // Get all active account numbers (phaseIds) for filtering
          const activeAccountNumbers = activeAccounts.map(acc => acc.number)

          // CRITICAL: Preserve existing settings when auto-selecting
          fetch('/api/settings/account-filters', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          })
            .then(response => response.json())
            .then(data => {
              const currentSettings = data.data || {}
              
              // Only save if still no selections (prevent overwriting user actions)
              if (accountNumbers.length === 0) {
                return fetch('/api/settings/account-filters', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...currentSettings,
                    showMode: 'active-only', // Ensure active-only mode for new users
                    selectedAccounts: activeIds,
                    selectedPhaseAccountIds: activeAccountNumbers,
                    updatedAt: new Date().toISOString()
                  })
                })
              }
            })
            .then(() => {
              setAccountNumbers(activeAccountNumbers)
            })
            .catch(console.error)
        }
      }, 500) // 500ms delay to let settings load first

      return () => clearTimeout(timer)
    }
  }, [activeAccounts, selectedAccounts.size, accountNumbers, setAccountNumbers, accounts])

  const handleToggleAccount = (accountId: string, checked: boolean) => {
    const newSelected = new Set(selectedAccounts)
    
    if (checked) {
      newSelected.add(accountId)
    } else {
      newSelected.delete(accountId)
    }
    
    setSelectedAccounts(newSelected)
    
    // Auto-expand the parent group for the toggled account
    const accountData = accounts?.find(acc => acc.id === accountId)
    if (accountData && checked) {
      const accountName = accountData.name || accountData.number
      setExpandedAccounts(prev => new Set([...prev, accountName]))
    }
  }

  const handleApplySelection = async () => {
    if (selectedAccounts.size === 0) {
      toast.error("Please select at least one account")
      return
    }
    
    try {
      setIsSaving(true)
      
      // Get all selected account numbers (phaseIds) for filtering
      const accountNumbersToSave = Array.from(selectedAccounts)
        .map(accountId => {
          const account = accounts?.find(acc => acc.id === accountId)
          return account?.number || accountId
        })
        .filter(Boolean)

      // CRITICAL FIX: Fetch current settings first, then merge with new selections
      // This prevents overwriting other settings like showMode, includeStatuses, etc.
      const currentSettingsResponse = await fetch('/api/settings/account-filters', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      let currentSettings = {}
      if (currentSettingsResponse.ok) {
        const data = await currentSettingsResponse.json()
        currentSettings = data.data || {}
      }

      const response = await fetch('/api/settings/account-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentSettings, // Preserve existing settings
          selectedAccounts: Array.from(selectedAccounts),
          selectedPhaseAccountIds: accountNumbersToSave,
          updatedAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        // Set accountNumbers to the account numbers (phaseIds) for proper trade filtering
        setAccountNumbers(accountNumbersToSave)
        toast.success(`${selectedAccounts.size} account(s) selected`)
        onSave?.()
      } else {
        toast.error("Failed to save account selection")
      }
    } catch (error) {
      console.error('Error saving account selection:', error)
      toast.error("Failed to save account selection")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSelectAllPhasesForAccount = (accountName: string) => {
    const accountData = groupedAccountsByName[accountName]
    if (!accountData) return
    
    const phaseIds = accountData.phases.map(p => p.id)
    const newSelected = new Set(selectedAccounts)
    
    // Add all phases of this account
    phaseIds.forEach(id => newSelected.add(id))
    
    setSelectedAccounts(newSelected)
    
    // Ensure expanded
    setExpandedAccounts(prev => new Set([...prev, accountName]))
  }

  const toggleAccountExpansion = (accountName: string) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(accountName)) {
        newSet.delete(accountName)
      } else {
        newSet.add(accountName)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    // Select all phase accounts (not master accounts)
    const allIds = filteredAccountsList.map(acc => acc.id)
    setSelectedAccounts(new Set(allIds))
  }

  const handleClearAll = async () => {
    // Clear all selections
    setSelectedAccounts(new Set())
    
    // Also clear from the data provider and save to backend
    try {
      setIsSaving(true)
      
      // CRITICAL FIX: Preserve existing settings when clearing selections
      const currentSettingsResponse = await fetch('/api/settings/account-filters', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      let currentSettings = {}
      if (currentSettingsResponse.ok) {
        const data = await currentSettingsResponse.json()
        currentSettings = data.data || {}
      }
      
      const response = await fetch('/api/settings/account-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentSettings, // Preserve existing settings
          selectedAccounts: [],
          selectedPhaseAccountIds: [],
          updatedAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        setAccountNumbers([])
        toast.success("Selection cleared")
        onSave?.()
      }
    } catch (error) {
      console.error('Error clearing selection:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleActiveOnly = () => {
    // Select only active accounts
    const activeIds = activeAccounts.map(acc => acc.id)
    setSelectedAccounts(new Set(activeIds))
  }

  // Calculate display counts
  const totalAccounts = filteredAccountsList.length

  return (
    <div className="w-full min-w-[280px] sm:min-w-[300px] max-w-[400px] sm:max-w-[450px] p-3 sm:p-4 space-y-3">
      <div className="space-y-2">
        <h4 className="font-semibold text-sm sm:text-base">Account Filter</h4>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Filter dashboard by accounts. Persists across sessions.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search accounts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-8 sm:h-9 text-sm"
          disabled={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={isLoading}
          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
        >
          Select All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleActiveOnly}
          disabled={activeAccounts.length === 0}
          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
        >
          Active Only
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={selectedAccounts.size === 0}
          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
        >
          Clear
        </Button>
      </div>
      
      {/* Selection Count */}
      {selectedAccounts.size > 0 && (
        <div className="text-xs text-muted-foreground text-center">
          {selectedAccounts.size} account{selectedAccounts.size !== 1 ? 's' : ''} selected
        </div>
      )}

      <Separator />

      {/* Account List */}
      <ScrollArea className="h-[220px] sm:h-[260px]">
        <div className="pr-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-foreground mb-2 sm:mb-3"></div>
              <p className="text-xs sm:text-sm text-muted-foreground">Loading accounts...</p>
            </div>
          ) : totalAccounts === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">No accounts found</p>
              <p className="text-xs text-muted-foreground mt-1">Create an account to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(filteredGroupedAccounts).map(([accountName, accountData]) => {
                const selectedPhasesCount = accountData.phases.filter((p: any) => selectedAccounts.has(p.id)).length
                const totalPhasesCount = accountData.phases.filter((p: any) => p.status !== 'pending').length
                
                return (
                  <Collapsible key={accountName} open={expandedAccounts.has(accountName)} onOpenChange={() => toggleAccountExpansion(accountName)}>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="flex-1 justify-between p-2 h-auto text-left hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            {expandedAccounts.has(accountName) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <div>
                              <div className="font-medium text-sm">{accountName}</div>
                              {accountData.propFirm && (
                                <div className="text-xs text-muted-foreground">{accountData.propFirm}</div>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-xs h-4 px-1.5">
                            {totalPhasesCount}
                          </Badge>
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent className="ml-6 space-y-1 overflow-visible">
                      {accountData.phases
                        .filter((phase: any) => phase.status && phase.status !== 'pending') // Filter out pending phases that don't exist
                        .map((phase: any) => (
                        <div key={phase.id} className="flex items-center gap-2 py-1">
                        <Checkbox
                            checked={selectedAccounts.has(phase.id)}
                            onCheckedChange={(checked) => handleToggleAccount(phase.id, checked as boolean)}
                            id={phase.id}
                        />
                        <Label
                            htmlFor={phase.id}
                            className="flex-1 text-xs sm:text-sm cursor-pointer leading-tight"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{phase.number}</span>
                              <Badge
                                variant={
                                  phase.status === 'active' ? 'outline' :
                                  phase.status === 'funded' || phase.status === 'passed' ? 'default' :
                                  phase.status === 'failed' || phase.status === 'archived' ? 'destructive' : 'secondary'
                                }
                                className="text-[10px] h-4 px-1.5 min-w-[3rem] justify-center"
                              >
                                {phase.status === 'archived' ? 'failed' : phase.status}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 min-w-[2.5rem] justify-center">
                                Phase {phase.currentPhase || phase.phaseDetails?.phaseNumber || 'N/A'}
                              </Badge>
                              {phase.tradeCount > 0 && (
                                <span className="text-muted-foreground text-xs">• {phase.tradeCount} trades</span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          )}

          {Object.keys(filteredGroupedAccounts).length === 0 && searchQuery && (
            <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
              No accounts match &quot;{searchQuery}&quot;
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Apply Button */}
      <div className="space-y-2">
            <Button
          className="w-full h-9 sm:h-10" 
          onClick={handleApplySelection}
          disabled={isSaving || selectedAccounts.size === 0}
        >
          {isSaving ? "Applying..." : `Apply Filter ${selectedAccounts.size > 0 ? `(${selectedAccounts.size})` : ''}`}
        </Button>
      </div>
    </div>
  )
}
