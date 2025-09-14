'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Filter, X } from "lucide-react"

interface AdvancedAccountFilterProps {
  accounts: any[]
  onFilterChange: (filters: AccountFilters) => void
  className?: string
}

export interface AccountFilters {
  accountId?: string
  phaseId?: string
  status?: string
  showAll: boolean
}

export function AdvancedAccountFilter({ accounts, onFilterChange, className }: AdvancedAccountFilterProps) {
  const [filters, setFilters] = useState<AccountFilters>({ showAll: true })

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('propFirmAccountFilters')
      if (saved) {
        const parsedFilters = JSON.parse(saved)
        setFilters(parsedFilters)
        onFilterChange(parsedFilters)
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error)
    }
  }, [onFilterChange])

  // Save filters to localStorage when changed
  useEffect(() => {
    try {
      localStorage.setItem('propFirmAccountFilters', JSON.stringify(filters))
      onFilterChange(filters)
    } catch (error) {
      console.error('Failed to save filters:', error)
    }
  }, [filters, onFilterChange])

  const selectedAccount = accounts.find(a => a.id === filters.accountId)
  const availablePhases = selectedAccount?.phases || []

  const handleAccountChange = (value: string) => {
    if (value === 'all') {
      setFilters({ showAll: true })
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
    setFilters({ showAll: true })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'funded': return 'bg-blue-100 text-blue-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'passed': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
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

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter Accounts:</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={filters.showAll ? "default" : "outline"}
              size="sm"
              onClick={clearFilters}
            >
              Show All
            </Button>
          </div>

          <Select
            value={filters.showAll ? "all" : (filters.accountId || "")}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select account..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{account.number}</span>
                    {account.name && (
                      <span className="text-muted-foreground">({account.name})</span>
                    )}
                    <Badge className={getStatusColor(account.status)} variant="secondary">
                      {account.status?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedAccount && availablePhases.length > 0 && (
            <Select
              value={filters.phaseId || "all"}
              onValueChange={handlePhaseChange}
            >
              <SelectTrigger className="w-40">
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
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Active Filter Summary */}
        {!filters.showAll && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Showing:</span>
              {selectedAccount && (
                <Badge variant="outline">
                  {selectedAccount.number}
                  {selectedAccount.name && ` (${selectedAccount.name})`}
                </Badge>
              )}
              {filters.phaseId && (
                <Badge variant="outline">
                  {availablePhases.find((p: any) => p.id === filters.phaseId)?.phaseType?.replace('_', ' ') || 'Unknown Phase'}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}



