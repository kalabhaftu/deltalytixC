'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useData } from "@/context/data-provider"
import { Database, LogOut, Globe, LayoutDashboard, HelpCircle, Clock, RefreshCw, Home, Moon, Sun, Laptop, Settings, Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "@/server/auth"
import { Logo } from '@/components/logo'
import Link from 'next/link'
import ImportButton from './import/import-button'
import { AddWidgetSheet } from './add-widget-sheet'
import { AccountSelector } from './navbar-filters/account-selector'
import { DateRangeSelector } from './navbar-filters/date-range-selector'
import { GeneralFilters } from './navbar-filters/general-filters'

import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import { motion } from 'framer-motion'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { useTheme } from '@/context/theme-provider'
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { useUserStore } from '@/store/user-store'
import { useModalStateStore } from '@/store/modal-state-store'
import { useDashboardEditStore } from '@/store/dashboard-edit-store'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { defaultLayouts, defaultLayoutsWithKPI } from '@/context/data-provider'
import { WIDGET_REGISTRY } from '../config/widget-registry'
import { toast } from 'sonner'

// Helper function to convert widget size to grid dimensions
const sizeToGrid = (size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
  if (isSmallScreen) {
    switch (size) {
      case 'tiny': return { w: 12, h: 1 }
      case 'small': return { w: 12, h: 2 }
      case 'small-long': return { w: 12, h: 2 }
      case 'medium': return { w: 12, h: 4 }
      case 'large':
      case 'extra-large': return { w: 12, h: 10 }
      case 'kpi': return { w: 12, h: 3 }
      default: return { w: 12, h: 4 }
    }
  }
  
  switch (size) {
    case 'tiny': return { w: 3, h: 1 }
    case 'small': return { w: 3, h: 4 }
    case 'small-long': return { w: 6, h: 2 }
    case 'medium': return { w: 6, h: 4 }
    case 'large': return { w: 6, h: 8 }
    case 'extra-large': return { w: 12, h: 12 }
    case 'kpi': return { w: 2.3, h: 2.4 }
    default: return { w: 6, h: 4 }
  }
}

export default function Navbar() {
  const  user = useUserStore(state => state.supabaseUser)
  const [mounted, setMounted] = useState(false)

  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false)
  const [datePopoverOpen, setDatePopoverOpen] = useState(false)
  const [filtersPopoverOpen, setFiltersPopoverOpen] = useState(false)

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const {refreshTrades, saveDashboardLayout, accountNumbers, accounts, dateRange, instruments} = useData()
  const { dashboardLayout: layouts, setDashboardLayout: setLayouts, isMobile } = useUserStore(state => state)
  const { setAccountGroupBoardOpen } = useModalStateStore()
  const { 
    isCustomizing, 
    setIsCustomizing, 
    hasUnsavedChanges,
    setOriginalLayout,
    resetChanges,
    markAsChanged
  } = useDashboardEditStore()
  
  // Refs for programmatically triggering components
  const addWidgetSheetRef = useRef<HTMLButtonElement>(null)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
    setIsLogoPopoverOpen(false)
  }

  const getThemeIcon = () => {
    // Prevent hydration mismatch - always return the same icon until mounted
    if (!mounted) {
      return <Laptop className="h-4 w-4" />;
    }

    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    // For 'system' theme, check the actual applied theme after mounting
    if (theme === 'system') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
    }
    // Fallback to Laptop icon
    return <Laptop className="h-4 w-4" />;
  }

  // Determine the account button text based on selected accounts
  const getAccountButtonText = () => {
    if (!accountNumbers || accountNumbers.length === 0) {
      return "All Accounts"
    }

    if (accountNumbers.length === 1) {
      // accountNumbers contains the phase ID (account.number), so find by number
      const account = accounts.find(acc => 
        acc.number === accountNumbers[0] || 
        acc.id === accountNumbers[0]
      )
      if (account) {
        // Show account name with phase info for prop firm accounts
        const accountName = account.name || account.number
        const phaseInfo = (account as any).currentPhase ? ` - Phase ${(account as any).currentPhase}` : ''
        return `${accountName}${phaseInfo}`
      }
      return `1 Account`
    }

    // Multiple accounts selected
    const selectedAccounts = accountNumbers
      .map(num => accounts.find(acc => acc.number === num || acc.id === num))
      .filter(Boolean) as any[]
    
    // Group by master account name
    const byMasterAccount = new Map<string, number>()
    selectedAccounts.forEach(acc => {
      const masterName = acc.name || acc.number
      byMasterAccount.set(masterName, (byMasterAccount.get(masterName) || 0) + 1)
    })
    
    if (byMasterAccount.size === 1) {
      // All phases from same master account
      const [masterName, count] = Array.from(byMasterAccount.entries())[0]
      return count > 1 ? `${masterName} (${count} phases)` : masterName
    }
    
    // Multiple master accounts
    return `${accountNumbers.length} Accounts`
  }

  // Get date range text
  const getDateRangeText = () => {
    if (!dateRange?.from && !dateRange?.to) return "All time"
    if (dateRange.from && dateRange.to) {
      const isSameDay = format(dateRange.from, 'yyyy-MM-dd') === format(dateRange.to, 'yyyy-MM-dd')
      if (isSameDay) return format(dateRange.from, 'MMM d, yyyy')
      return `${format(dateRange.from, 'MMM d')} - ${format(dateRange.to, 'MMM d, yyyy')}`
    }
    return "Date range"
  }

  // Get filters text
  const getFiltersText = () => {
    const count = (instruments?.length || 0)
    if (count === 0) return "Filters"
    return `Filters (${count})`
  }

  // Dashboard action functions
  const handleEditToggle = () => {
    if (isCustomizing) {
      // Trying to exit edit mode - this will be handled by EditModeControls if there are unsaved changes
      if (!hasUnsavedChanges) {
        setIsCustomizing(false)
        resetChanges()
        toast.success('Edit mode disabled', { duration: 2000 })
      }
    } else {
      // Starting edit mode - store original layout
      if (layouts) {
        setOriginalLayout(layouts)
      }
      setIsCustomizing(true)
      toast.success('Edit mode enabled', {
        description: 'Drag widgets to move, resize handles to resize',
        duration: 2500
      })
    }
  }

  const addWidget = (type: WidgetType, size?: WidgetSize) => {
    if (!layouts || !user?.id) return

    const activeLayout = isMobile ? 'mobile' : 'desktop'
    const currentLayoutWidgets = layouts[activeLayout] || []
    
    // Check for duplicate widget
    const existingWidget = currentLayoutWidgets.find(widget => widget.type === type)
    if (existingWidget) {
      toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} widget already exists`, {
        description: "Each widget type can only be added once",
        duration: 3000,
      })
      return
    }
    
    // Get default size from registry
    const config = WIDGET_REGISTRY[type]
    const effectiveSize = size || config?.defaultSize || 'medium'
    const grid = sizeToGrid(effectiveSize, activeLayout === 'mobile')
    
    // Find the best position at bottom with gap filling
    let bestX = 0
    let bestY = 0
    let lowestY = 0
    
    // Find the lowest Y coordinate
    currentLayoutWidgets.forEach(widget => {
      const widgetBottom = widget.y + widget.h
      if (widgetBottom > lowestY) {
        lowestY = widgetBottom
      }
    })
    
    // Try to find gaps in the last few rows first
    let foundGap = false
    for (let y = Math.max(0, lowestY - 3); y <= lowestY && !foundGap; y++) {
      for (let x = 0; x <= 12 - grid.w && !foundGap; x++) {
        // Check if this position is available
        const isPositionFree = !currentLayoutWidgets.some(widget => {
          return !(
            x >= widget.x + widget.w || 
            x + grid.w <= widget.x || 
            y >= widget.y + widget.h || 
            y + grid.h <= widget.y
          )
        })
        
        if (isPositionFree) {
          bestX = x
          bestY = y
          foundGap = true
        }
      }
    }
    
    // If no gap found, place at bottom
    if (!foundGap) {
      bestX = 0
      bestY = lowestY
    }
    
    // Create new widget
    const newWidget = {
      i: `widget_${Date.now()}`,
      type,
      size: effectiveSize,
      x: bestX,
      y: bestY,
      w: grid.w,
      h: grid.h
    }

    const updatedLayouts = {
      ...layouts,
      [activeLayout]: [...currentLayoutWidgets, newWidget]
    }

    setLayouts(updatedLayouts)

    // Note: Dashboard layout moved to DashboardTemplate model
    // Layout is now managed through the template system
    // saveDashboardLayout(updatedLayouts) // DEPRECATED

    // Mark as changed if in edit mode (for unsaved changes indicator)
    if (isCustomizing) {
      markAsChanged()
    }

    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added`, {
      description: "Widget added and saved",
      duration: 3000,
    })
  }


  return (
    <>
      <motion.nav 
        className="fixed py-3 top-0 left-0 right-0 z-50 flex flex-col text-primary bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-xl shadow-background/10 w-screen transition-all duration-300 ease-out"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-6 h-12">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <Popover open={isLogoPopoverOpen} onOpenChange={setIsLogoPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="p-0 hover:bg-primary/10 transition-all duration-200 hover:scale-105 group">
                    <Logo className='fill-black h-7 w-7 dark:fill-white transition-transform duration-200 group-hover:rotate-3' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none mb-3">Navigation</h4>
                    <div className="grid gap-2">
                      <Link 
                        href="/dashboard" 
                        className="flex items-center gap-2 text-sm hover:bg-accent/80 hover:text-accent-foreground p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="flex-shrink-0 w-4 h-4">
                          <LayoutDashboard className="h-full w-full" />
                        </div>
                        Dashboard
                      </Link>
                      <Link 
                        href="/" 
                        className="flex items-center gap-2 text-sm hover:bg-accent/80 hover:text-accent-foreground p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="flex-shrink-0 w-4 h-4">
                          <Home className="h-full w-full" />
                        </div>
                        Home
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* All Accounts Dropdown (moved here, dynamic name) - Hidden on mobile */}
            <Popover open={accountPopoverOpen} onOpenChange={setAccountPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex h-8 px-3 hover:bg-accent/20 transition-all duration-200 border border-border/50 bg-card/50">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <span className="text-sm">{getAccountButtonText()}</span>
                  {accountNumbers.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                      {accountNumbers.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto max-w-[90vw] sm:max-w-[95vw]" align="end" sideOffset={4} collisionPadding={16} avoidCollisions={true}>
                <AccountSelector onSave={() => setAccountPopoverOpen(false)} />
              </PopoverContent>
            </Popover>
            
            {/* Filters Dropdown - Hidden on mobile */}
            <Popover open={filtersPopoverOpen} onOpenChange={setFiltersPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex h-8 px-3 hover:bg-accent/20 transition-all duration-200 border border-border/50 bg-card/50">
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                  </svg>
                  <span className="text-sm">{getFiltersText()}</span>
                  {instruments.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                      {instruments.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto max-w-[90vw] sm:max-w-[95vw]" align="end" sideOffset={4} collisionPadding={16} avoidCollisions={true}>
                <GeneralFilters onSave={() => setFiltersPopoverOpen(false)} />
              </PopoverContent>
            </Popover>

            {/* Date Range Dropdown - Hidden on mobile */}
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="hidden md:flex h-8 px-3 hover:bg-accent/20 transition-all duration-200 border border-border/50 bg-card/50">
                    <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">{getDateRangeText()}</span>
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto max-w-[90vw] sm:max-w-[95vw]" align="end" sideOffset={8} collisionPadding={20} avoidCollisions={true}>
                <DateRangeSelector onSave={() => setDatePopoverOpen(false)} />
              </PopoverContent>
            </Popover>

              {/* Import Trades Button (moved here) - Always visible */}
              <ImportButton />

              {/* Theme Switcher - Hidden on small mobile */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 hover:bg-accent/80 transition-all duration-200 hover:scale-105 hover:shadow-md">
                    {getThemeIcon()}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 bg-card border-border shadow-2xl" align="end" sideOffset={8}>
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        <CommandItem onSelect={() => handleThemeChange("light")} className="hover:bg-accent/80 transition-colors duration-200">
                          <Sun className="mr-2 h-4 w-4" />
                          <span>Light mode</span>
                        </CommandItem>
                        <CommandItem onSelect={() => handleThemeChange("dark")} className="hover:bg-accent/80 transition-colors duration-200">
                          <Moon className="mr-2 h-4 w-4" />
                          <span>Dark mode</span>
                        </CommandItem>
                        <CommandItem onSelect={() => handleThemeChange("system")} className="hover:bg-accent/80 transition-colors duration-200">
                          <Laptop className="mr-2 h-4 w-4" />
                          <span>System theme</span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                    {/* Theme intensity slider - hidden on mobile */}
                    <Separator className="hidden sm:block" />
                    <div className="p-4 hidden sm:block">
                      <div className="mb-2 text-sm font-medium">Theme Intensity</div>
                      <Slider
                        value={[intensity]}
                        onValueChange={([value]) => setIntensity(value)}
                        min={90}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="mt-2 text-sm text-muted-foreground">
                        {intensity}%
                      </div>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Avatar className="cursor-pointer h-9 w-9 ring-2 ring-transparent hover:ring-primary/20 transition-all duration-200 hover:scale-105 hover:shadow-lg">
                      <AvatarImage src={user?.user_metadata.avatar_url} className="transition-transform duration-200" />
                      <AvatarFallback className="uppercase text-xs bg-gradient-to-br from-primary/10 to-secondary/10 text-foreground font-medium">
                        {user?.email![0]}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {user?.email}
                    </div>
                    
                    {/* Mobile-only quick actions */}
                    <div className="md:hidden">
                      <DropdownMenuItem onClick={() => setAccountGroupBoardOpen(true)} className="hover:bg-accent/80 transition-colors duration-200">
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span>{getAccountButtonText()}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFiltersPopoverOpen(true)} className="hover:bg-accent/80 transition-colors duration-200">
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                        </svg>
                        <span>Filters</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDatePopoverOpen(true)} className="hover:bg-accent/80 transition-colors duration-200">
                        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Date Range</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </div>
                    
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="hover:bg-accent/80 transition-colors duration-200">
                        <div className="flex w-full">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>Dashboard</span>
                          <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/settings" className="hover:bg-accent/80 transition-colors duration-200">
                        <div className="flex w-full">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                          <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                        </div>
                      </Link>
                    </DropdownMenuItem>

                    <Link href={"/dashboard/data"}>
                      <DropdownMenuItem className="hover:bg-accent/80 transition-colors duration-200">
                        <Database className="mr-2 h-4 w-4" />
                        <span>Data</span>
                        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={async ()=>await refreshTrades()} className="hover:bg-accent/80 transition-colors duration-200">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      <span>Refresh Data</span>
                      <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={async () => {
                      // Clear all local storage
                      localStorage.clear()
                      sessionStorage.clear()
                      
                      // Sign out from Supabase and redirect
                      await signOut()
                    }} className="hover:bg-destructive/20 transition-colors duration-200">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log Out</span>
                      <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
          </div>
        </div>
      </motion.nav>
      <div className="h-[48px]" />
      
      {/* Hidden components for programmatic triggering */}
        <div className="hidden">
        </div>
    </>
  )
}