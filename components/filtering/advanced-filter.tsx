'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { CalendarIcon, Filter, Save, Trash2, Star, Settings, Plus, Search } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export interface FilterConfig {
  dateRange?: {
    from?: Date
    to?: Date
  }
  accounts?: string[]
  instruments?: string[]
  sides?: ('long' | 'short')[]
  pnlRange?: {
    min?: number
    max?: number
  }
  timeInPosition?: {
    min?: number
    max?: number
  }
  tags?: string[]
  commissionRange?: {
    min?: number
    max?: number
  }
  quantityRange?: {
    min?: number
    max?: number
  }
  winLoss?: 'win' | 'loss' | 'breakeven' | 'all'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  searchTerm?: string
}

export interface FilterPreset {
  id: string
  name: string
  description?: string
  filters: FilterConfig
  isDefault: boolean
  isPublic: boolean
  category: string
  createdAt: string
  updatedAt: string
}

interface AdvancedFilterProps {
  onFiltersChange: (filters: FilterConfig) => void
  availableAccounts?: string[]
  availableInstruments?: string[]
  availableTags?: string[]
  initialFilters?: FilterConfig
  category?: string
  className?: string
}

export function AdvancedFilter({
  onFiltersChange,
  availableAccounts = [],
  availableInstruments = [],
  availableTags = [],
  initialFilters = {},
  category = 'trades',
  className = '',
}: AdvancedFilterProps) {
  const [filters, setFilters] = useState<FilterConfig>(initialFilters)
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [presetDescription, setPresetDescription] = useState('')
  const [makeDefault, setMakeDefault] = useState(false)
  const [makePublic, setMakePublic] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  // Load presets on mount
  useEffect(() => {
    loadPresets()
  }, [category])

  // Update filters when they change
  useEffect(() => {
    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const loadPresets = async () => {
    try {
      const response = await fetch(`/api/filter-presets?category=${category}`)
      if (response.ok) {
        const data = await response.json()
        setPresets(data)
      }
    } catch (error) {
      console.error('Failed to load presets:', error)
    }
  }

  const updateFilter = useCallback((key: keyof FilterConfig, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }))
  }, [])

  const addArrayFilter = useCallback((key: keyof FilterConfig, value: string) => {
    setFilters(prev => {
      const currentArray = (prev[key] as string[]) || []
      if (!currentArray.includes(value)) {
        return {
          ...prev,
          [key]: [...currentArray, value],
        }
      }
      return prev
    })
  }, [])

  const removeArrayFilter = useCallback((key: keyof FilterConfig, value: string) => {
    setFilters(prev => {
      const currentArray = (prev[key] as string[]) || []
      return {
        ...prev,
        [key]: currentArray.filter(item => item !== value),
      }
    })
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
  }, [])

  const savePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Error', {
        description: 'Please enter a preset name',
      })
      return
    }

    try {
      const response = await fetch('/api/filter-presets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: presetName,
          description: presetDescription,
          filters,
          isDefault: makeDefault,
          isPublic: makePublic,
          category,
        }),
      })

      if (response.ok) {
        const newPreset = await response.json()
        setPresets(prev => [...prev, newPreset])
        setIsPresetDialogOpen(false)
        setPresetName('')
        setPresetDescription('')
        setMakeDefault(false)
        setMakePublic(false)
        
        toast.success('Success', {
          description: 'Filter preset saved successfully',
        })
      } else {
        throw new Error('Failed to save preset')
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to save preset',
      })
    }
  }

  const loadPreset = (preset: FilterPreset) => {
    setFilters(preset.filters)
    toast.success('Preset loaded', {
      description: `Applied "${preset.name}" filter preset`,
    })
  }

  const deletePreset = async (presetId: string) => {
    try {
      const response = await fetch(`/api/filter-presets/${presetId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setPresets(prev => prev.filter(p => p.id !== presetId))
        toast.success('Success', {
          description: 'Preset deleted successfully',
        })
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to delete preset',
      })
    }
  }

  const activeFilterCount = Object.values(filters).filter(value => {
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== undefined && v !== null)
    }
    return value !== undefined && value !== null && value !== ''
  }).length

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Advanced Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} active</Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Filter Preset</DialogTitle>
                  <DialogDescription>
                    Save your current filter configuration for future use.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="preset-name">Preset Name</Label>
                    <Input
                      id="preset-name"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      placeholder="e.g., Profitable Long Trades"
                    />
                  </div>
                  <div>
                    <Label htmlFor="preset-description">Description (optional)</Label>
                    <Textarea
                      id="preset-description"
                      value={presetDescription}
                      onChange={(e) => setPresetDescription(e.target.value)}
                      placeholder="Describe what this filter shows..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="make-default"
                      checked={makeDefault}
                      onCheckedChange={setMakeDefault}
                    />
                    <Label htmlFor="make-default">Set as default filter</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="make-public"
                      checked={makePublic}
                      onCheckedChange={setMakePublic}
                    />
                    <Label htmlFor="make-public">Share with other users</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsPresetDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={savePreset}>Save Preset</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Saved Presets */}
        {presets.length > 0 && (
          <div>
            <Label className="text-sm font-medium">Saved Presets</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {presets.map((preset) => (
                <div key={preset.id} className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadPreset(preset)}
                    className="flex items-center space-x-1"
                  >
                    {preset.isDefault && <Star className="h-3 w-3" />}
                    <span>{preset.name}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deletePreset(preset.id)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search trades..."
                value={filters.searchTerm || ''}
                onChange={(e) => updateFilter('searchTerm', e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {/* Win/Loss */}
          <div>
            <Label>Outcome</Label>
            <Select
              value={filters.winLoss || 'all'}
              onValueChange={(value) => updateFilter('winLoss', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All trades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All trades</SelectItem>
                <SelectItem value="win">Winners only</SelectItem>
                <SelectItem value="loss">Losers only</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <Label>Sort By</Label>
            <Select
              value={filters.sortBy || 'entryDate'}
              onValueChange={(value) => updateFilter('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entryDate">Entry Date</SelectItem>
                <SelectItem value="pnl">PnL</SelectItem>
                <SelectItem value="timeInPosition">Time in Position</SelectItem>
                <SelectItem value="commission">Commission</SelectItem>
                <SelectItem value="quantity">Quantity</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <Label>Order</Label>
            <Select
              value={filters.sortOrder || 'desc'}
              onValueChange={(value) => updateFilter('sortOrder', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isExpanded && (
          <>
            {/* Date Range */}
            <div>
              <Label>Date Range</Label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !filters.dateRange?.from && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.from ? (
                        format(filters.dateRange.from, 'PPP')
                      ) : (
                        'From date'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.from}
                      onSelect={(date) =>
                        updateFilter('dateRange', {
                          ...filters.dateRange,
                          from: date,
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'justify-start text-left font-normal',
                        !filters.dateRange?.to && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange?.to ? (
                        format(filters.dateRange.to, 'PPP')
                      ) : (
                        'To date'
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange?.to}
                      onSelect={(date) =>
                        updateFilter('dateRange', {
                          ...filters.dateRange,
                          to: date,
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Accounts */}
            <div>
              <Label>Accounts</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableAccounts.map((account) => (
                  <Badge
                    key={account}
                    variant={filters.accounts?.includes(account) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      if (filters.accounts?.includes(account)) {
                        removeArrayFilter('accounts', account)
                      } else {
                        addArrayFilter('accounts', account)
                      }
                    }}
                  >
                    {account}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Instruments */}
            <div>
              <Label>Instruments</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableInstruments.map((instrument) => (
                  <Badge
                    key={instrument}
                    variant={filters.instruments?.includes(instrument) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      if (filters.instruments?.includes(instrument)) {
                        removeArrayFilter('instruments', instrument)
                      } else {
                        addArrayFilter('instruments', instrument)
                      }
                    }}
                  >
                    {instrument}
                  </Badge>
                ))}
              </div>
            </div>

            {/* PnL Range */}
            <div>
              <Label>PnL Range</Label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Min PnL"
                  value={filters.pnlRange?.min || ''}
                  onChange={(e) =>
                    updateFilter('pnlRange', {
                      ...filters.pnlRange,
                      min: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Max PnL"
                  value={filters.pnlRange?.max || ''}
                  onChange={(e) =>
                    updateFilter('pnlRange', {
                      ...filters.pnlRange,
                      max: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={filters.tags?.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      if (filters.tags?.includes(tag)) {
                        removeArrayFilter('tags', tag)
                      } else {
                        addArrayFilter('tags', tag)
                      }
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
