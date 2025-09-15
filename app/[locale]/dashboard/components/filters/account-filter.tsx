"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/locales/client"
import { useState, useEffect } from "react"
import { Building2, User, X, Filter } from "lucide-react"
import { useData } from "@/context/data-provider"
import { useAccounts } from "@/hooks/use-accounts"

interface AccountFilterProps {
  showAccountNumbers: boolean
  className?: string
}

interface DashboardFilters {
  accountId?: string
  phaseId?: string
  accountType?: 'all' | 'live' | 'prop-firm'
  showAll: boolean
}

export function AccountFilter({ showAccountNumbers, className }: AccountFilterProps) {
  const { accountNumbers = [], setAccountNumbers } = useData()
  const { accounts } = useAccounts()
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<DashboardFilters>({ showAll: true, accountType: 'all' })
  const t = useI18n()

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dashboardAccountFilters')
      if (saved) {
        const parsedFilters = JSON.parse(saved)
        setFilters(parsedFilters)
        applyFilters(parsedFilters)
      }
    } catch (error) {
      console.error('Failed to load saved dashboard filters:', error)
    }
  }, [])

  // Apply filters to account numbers
  const applyFilters = (filterState: DashboardFilters) => {
    if (!accounts) return

    if (filterState.showAll) {
      // Show all accounts
      setAccountNumbers([])
    } else {
      // Apply specific filters
      let filteredAccountNumbers: string[] = []

      if (filterState.accountId) {
        // Single account selected
        const selectedAccount = accounts.find(a => a.id === filterState.accountId)
        if (selectedAccount) {
          filteredAccountNumbers = [selectedAccount.number]
        }
      } else if (filterState.accountType && filterState.accountType !== 'all') {
        // Filter by account type
        filteredAccountNumbers = accounts
          .filter(account => account.accountType === filterState.accountType)
          .map(account => account.number)
      }

      setAccountNumbers(filteredAccountNumbers)
    }
  }

  // Save filters to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('dashboardAccountFilters', JSON.stringify(filters))
      applyFilters(filters)
    } catch (error) {
      console.error('Failed to save dashboard filters:', error)
    }
  }, [filters])

  const handleAccountTypeChange = (value: string) => {
    if (value === 'all') {
      setFilters({ showAll: true, accountType: 'all' })
    } else {
      setFilters(prev => ({ 
        ...prev, 
        accountType: value as 'live' | 'prop-firm',
        accountId: undefined,
        phaseId: undefined,
        showAll: false 
      }))
    }
  }

  const handleAccountChange = (value: string) => {
    if (value === 'all') {
      setFilters(prev => ({ ...prev, accountId: undefined, phaseId: undefined, showAll: true }))
    } else {
      setFilters(prev => ({ 
        ...prev, 
        accountId: value, 
        phaseId: undefined, 
        showAll: false 
      }))
    }
  }

  const handlePhaseChange = (value: string) => {
    if (value === 'all') {
      setFilters(prev => ({ ...prev, phaseId: undefined }))
    } else {
      setFilters(prev => ({ ...prev, phaseId: value }))
    }
  }

  const clearFilters = () => {
    setFilters({ showAll: true, accountType: 'all' })
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'active': return 'outline'
      case 'funded': return 'default'
      case 'failed': return 'destructive'
      case 'passed': return 'secondary'
      default: return 'outline'
    }
  }

  const getPhaseColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'passed': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const selectedAccount = accounts?.find(a => a.id === filters.accountId)
  const availablePhases = selectedAccount?.phases || []

  // Filter accounts by type and search
  const filteredAccountsByType = accounts?.filter(account => {
    if (filters.accountType === 'all') return true
    return account.accountType === filters.accountType
  }).filter(account => {
    if (!searchTerm) return true
    return account.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (account.name && account.name.toLowerCase().includes(searchTerm.toLowerCase()))
  }) || []

  return (
    <div className="space-y-4">
      {/* Quick Filter Controls */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Account Filter</Label>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={filters.showAll ? "default" : "outline"}
            size="sm"
            onClick={clearFilters}
            className="text-xs"
          >
            Show All Data
          </Button>
        </div>

        <Select
          value={filters.accountType || "all"}
          onValueChange={handleAccountTypeChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Account Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="live">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Live Accounts
              </div>
            </SelectItem>
            <SelectItem value="prop-firm">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Prop Firm
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {!filters.showAll && filteredAccountsByType.length > 0 && (
          <Select
            value={filters.accountId || "all"}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select account..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All {filters.accountType === 'all' ? 'Accounts' : filters.accountType === 'live' ? 'Live Accounts' : 'Prop Firm Accounts'}</SelectItem>
              {filteredAccountsByType.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{account.number}</span>
                    {account.name && (
                      <span className="text-muted-foreground">({account.name})</span>
                    )}
                    {account.status && (
                      <Badge variant={getStatusVariant(account.status)} className="text-xs">
                        {account.status?.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {selectedAccount && selectedAccount.accountType === 'prop-firm' && availablePhases.length > 0 && (
          <Select
            value={filters.phaseId || "all"}
            onValueChange={handlePhaseChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {availablePhases.map((phase: any) => (
                <SelectItem key={phase.id} value={phase.id}>
                  <div className="flex items-center gap-2">
                    <span className="capitalize">
                      {phase.phaseType.replace('_', ' ')}
                    </span>
                    <Badge className={getPhaseColor(phase.phaseStatus)} variant="secondary">
                      {phase.phaseStatus}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!filters.showAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filter Summary */}
      {!filters.showAll && (
        <div className="pt-3 border-t">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Currently showing:</Label>
            <div className="flex flex-wrap items-center gap-1">
              {filters.accountType && filters.accountType !== 'all' && (
                <Badge variant="outline" className="text-xs capitalize">
                  {filters.accountType === 'prop-firm' ? 'Prop Firm' : filters.accountType} Accounts
                </Badge>
              )}
              {selectedAccount && (
                <Badge variant="outline" className="text-xs">
                  {selectedAccount.number}
                  {selectedAccount.name && ` (${selectedAccount.name})`}
                </Badge>
              )}
              {filters.phaseId && (
                <Badge variant="outline" className="text-xs">
                  {availablePhases.find((p: any) => p.id === filters.phaseId)?.phaseType?.replace('_', ' ') || 'Unknown Phase'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}