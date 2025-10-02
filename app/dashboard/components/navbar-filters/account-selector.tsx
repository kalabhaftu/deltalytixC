"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
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
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Initialize selected accounts from context on mount
  useEffect(() => {
    if (accountNumbers && accountNumbers.length > 0) {
      setSelectedAccounts(accountNumbers)
    }
  }, [accountNumbers])

  // Group accounts by type
  const groupedAccounts = useMemo(() => {
    if (!accounts || !Array.isArray(accounts) || accounts.length === 0) {
      return { live: [], propFirm: [] }
    }
    const live = accounts.filter(acc => acc.accountType === 'live')
    const propFirm = accounts.filter(acc => acc.accountType === 'prop-firm')
    return { live, propFirm }
  }, [accounts])

  // Filter accounts by search query
  const filteredAccounts = useMemo(() => {
    const filterFn = (acc: typeof accounts[0]) => {
      if (!searchQuery) return true
      const query = searchQuery.toLowerCase()
      return (
        acc.number.toLowerCase().includes(query) ||
        acc.name?.toLowerCase().includes(query) ||
        acc.broker?.toLowerCase().includes(query) ||
        acc.propfirm?.toLowerCase().includes(query)
      )
    }

    return {
      live: groupedAccounts.live.filter(filterFn),
      propFirm: groupedAccounts.propFirm.filter(filterFn)
    }
  }, [groupedAccounts, searchQuery])

  const handleToggleAccount = (accountNumber: string) => {
    setSelectedAccounts(prev =>
      prev.includes(accountNumber)
        ? prev.filter(num => num !== accountNumber)
        : [...prev, accountNumber]
    )
  }

  const handleSelectAll = () => {
    setSelectedAccounts([])
  }

  const handleClearAll = () => {
    if (accounts && Array.isArray(accounts)) {
      setSelectedAccounts(accounts.map(acc => acc.number))
    }
  }

  const handleSelectGroup = (type: 'live' | 'prop-firm') => {
    if (!accounts || !Array.isArray(accounts)) return
    
    const groupAccounts = accounts
      .filter(acc => acc.accountType === type)
      .map(acc => acc.number)
    
    setSelectedAccounts(prev => {
      const allSelected = groupAccounts.every(num => prev.includes(num))
      if (allSelected) {
        return prev.filter(num => !groupAccounts.includes(num))
      } else {
        return [...new Set([...prev, ...groupAccounts])]
      }
    })
  }

  const handleApply = async () => {
    try {
      setIsSaving(true)
      
      // Save to database via API
      const response = await fetch('/api/settings/account-filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedAccounts: selectedAccounts,
          updatedAt: new Date().toISOString()
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save account selection')
      }

      // Update local state
      setAccountNumbers(selectedAccounts)
      
      toast.success(
        selectedAccounts.length === 0
          ? "Showing all accounts"
          : `Filtering ${selectedAccounts.length} account${selectedAccounts.length > 1 ? 's' : ''}`
      )
      
      onSave?.()
    } catch (error) {
      console.error('Error saving account selection:', error)
      toast.error("Failed to save account selection")
    } finally {
      setIsSaving(false)
    }
  }

  const isGroupSelected = (type: 'live' | 'prop-firm') => {
    if (!accounts || !Array.isArray(accounts)) return false
    const groupAccounts = accounts
      .filter(acc => acc.accountType === type)
      .map(acc => acc.number)
    return groupAccounts.length > 0 && groupAccounts.every(num => selectedAccounts.includes(num))
  }

  const isGroupPartial = (type: 'live' | 'prop-firm') => {
    if (!accounts || !Array.isArray(accounts)) return false
    const groupAccounts = accounts
      .filter(acc => acc.accountType === type)
      .map(acc => acc.number)
    const selectedCount = groupAccounts.filter(num => selectedAccounts.includes(num)).length
    return selectedCount > 0 && selectedCount < groupAccounts.length
  }

  // Calculate display counts
  const totalAccounts = accounts?.length || 0
  const displayedCount = selectedAccounts.length === 0 ? totalAccounts : selectedAccounts.length

  return (
    <div className="w-full min-w-[380px] max-w-[480px] p-4 space-y-4">
      <div className="space-y-2">
        <h4 className="font-semibold text-base">Account Filter</h4>
        <p className="text-sm text-muted-foreground">
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
          className="pl-9 h-9"
          disabled={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={selectedAccounts.length === 0 || isLoading}
          className="flex-1 h-8 text-xs"
        >
          All Accounts
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearAll}
          disabled={selectedAccounts.length === totalAccounts && totalAccounts > 0 || isLoading}
          className="flex-1 h-8 text-xs"
        >
          None
        </Button>
      </div>

      <Separator />

      {/* Account List */}
      <ScrollArea className="h-[320px] pr-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          </div>
        ) : totalAccounts === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No accounts found</p>
            <p className="text-xs text-muted-foreground mt-1">Create an account to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Live Accounts */}
            {filteredAccounts.live.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-live"
                      checked={isGroupSelected('live')}
                      onCheckedChange={() => handleSelectGroup('live')}
                      className={cn(
                        isGroupPartial('live') && "data-[state=checked]:bg-primary/50"
                      )}
                    />
                    <Label htmlFor="select-live" className="text-sm font-semibold cursor-pointer">
                      Live Accounts
                    </Label>
                  </div>
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {filteredAccounts.live.length}
                  </Badge>
                </div>
                
                <div className="ml-6 space-y-1.5">
                  {filteredAccounts.live.map((account) => (
                    <div key={account.id} className="flex items-start gap-2 py-1">
                      <Checkbox
                        id={`account-${account.id}`}
                        checked={selectedAccounts.includes(account.number) || selectedAccounts.length === 0}
                        onCheckedChange={() => handleToggleAccount(account.number)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={`account-${account.id}`}
                        className="flex-1 text-sm cursor-pointer leading-tight"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{account.number}</span>
                          {account.name && (
                            <span className="text-muted-foreground text-xs">• {account.name}</span>
                          )}
                          {account.broker && (
                            <span className="text-muted-foreground text-xs">• {account.broker}</span>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prop Firm Accounts */}
            {filteredAccounts.propFirm.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-propfirm"
                      checked={isGroupSelected('prop-firm')}
                      onCheckedChange={() => handleSelectGroup('prop-firm')}
                      className={cn(
                        isGroupPartial('prop-firm') && "data-[state=checked]:bg-primary/50"
                      )}
                    />
                    <Label htmlFor="select-propfirm" className="text-sm font-semibold cursor-pointer">
                      Prop Firm Accounts
                    </Label>
                  </div>
                  <Badge variant="secondary" className="text-xs h-5 px-2">
                    {filteredAccounts.propFirm.length}
                  </Badge>
                </div>
                
                <div className="ml-6 space-y-1.5">
                  {filteredAccounts.propFirm.map((account) => (
                    <div key={account.id} className="flex items-start gap-2 py-1">
                      <Checkbox
                        id={`account-${account.id}`}
                        checked={selectedAccounts.includes(account.number) || selectedAccounts.length === 0}
                        onCheckedChange={() => handleToggleAccount(account.number)}
                        className="mt-0.5"
                      />
                      <Label
                        htmlFor={`account-${account.id}`}
                        className="flex-1 text-sm cursor-pointer leading-tight"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{account.number}</span>
                          {account.name && (
                            <span className="text-muted-foreground text-xs">• {account.name}</span>
                          )}
                          {account.propfirm && (
                            <span className="text-muted-foreground text-xs">• {account.propfirm}</span>
                          )}
                          {account.status && (
                            <Badge
                              variant={
                                account.status === 'active' ? 'outline' :
                                account.status === 'funded' ? 'default' :
                                account.status === 'failed' ? 'destructive' : 'secondary'
                              }
                              className="text-[10px] h-4 px-1.5"
                            >
                              {account.status}
                            </Badge>
                          )}
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredAccounts.live.length === 0 && filteredAccounts.propFirm.length === 0 && searchQuery && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No accounts match "{searchQuery}"
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Selected Summary & Apply */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedAccounts.length === 0
              ? `All ${totalAccounts} accounts`
              : `${selectedAccounts.length} of ${totalAccounts} accounts`}
          </span>
          {selectedAccounts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-6 text-xs px-2"
              disabled={isLoading}
            >
              Reset
            </Button>
          )}
        </div>
        
        <Button
          onClick={handleApply}
          disabled={isSaving || isLoading || totalAccounts === 0}
          className="w-full h-9"
        >
          {isSaving ? "Saving..." : "Apply Filter"}
        </Button>
      </div>
    </div>
  )
}
