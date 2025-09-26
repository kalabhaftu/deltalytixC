'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useData } from "@/context/data-provider"
import { Database, LogOut, Globe, LayoutDashboard, HelpCircle, Clock, RefreshCw, Home, Moon, Sun, Laptop, Settings, Pencil, Plus, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { FilterDropdown } from './filters/filter-dropdown'

import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import ImprovedDatePicker from './filters/improved-date-picker'
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
import { defaultLayouts } from '@/context/data-provider'
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
      case 'extra-large': return { w: 12, h: 6 }
      default: return { w: 12, h: 4 }
    }
  }
  
  switch (size) {
    case 'tiny': return { w: 3, h: 1 }
    case 'small': return { w: 3, h: 4 }
    case 'small-long': return { w: 6, h: 2 }
    case 'medium': return { w: 6, h: 4 }
    case 'large': return { w: 6, h: 8 }
    case 'extra-large': return { w: 12, h: 8 }
    default: return { w: 6, h: 4 }
  }
}

export default function Navbar() {
  const  user = useUserStore(state => state.supabaseUser)
  const [mounted, setMounted] = useState(false)

  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const {refreshTrades, saveDashboardLayout} = useData()
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
  const filterDropdownRef = useRef<HTMLButtonElement>(null)

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

    // Always save to database immediately to prevent data loss
    saveDashboardLayout(updatedLayouts)

    // Mark as changed if in edit mode (for unsaved changes indicator)
    if (isCustomizing) {
      markAsChanged()
    }

    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added`, {
      description: "Widget added and saved",
      duration: 3000,
    })
  }

  const handleFiltersClick = () => {
    // Trigger the filter dropdown by clicking its button
    filterDropdownRef.current?.click()
  };

  return (
    <>
      <motion.nav 
        className="fixed py-3 top-0 left-0 right-0 z-50 flex flex-col text-primary bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-xl shadow-background/10 w-screen transition-all duration-300 ease-out"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-6 h-16">
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
          <div className="flex items-center gap-4">
            <div className='flex gap-2 md:gap-4'>
              <div className='hidden sm:block'>
                <ImprovedDatePicker />
              </div>
              <div className='hidden md:block'>
                <ImportButton />
              </div>
              {/* Mobile import button */}
              <div className='md:hidden'>
                <ImportButton />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-accent/80 transition-all duration-200 hover:scale-105 hover:shadow-md">
                    {getThemeIcon()}
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" align="end">
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
                    
                    {/* Dashboard Actions */}
                    <DropdownMenuItem onClick={handleEditToggle} className="hover:bg-accent/80 transition-colors duration-200">
                      <Pencil className="mr-2 h-4 w-4" />
                      <span>Edit Layout</span>
                      <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    
                    
                    <DropdownMenuItem onClick={() => addWidgetSheetRef.current?.click()} className="hover:bg-accent/80 transition-colors duration-200">
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Add Widget</span>
                      <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem onClick={handleFiltersClick} className="hover:bg-accent/80 transition-colors duration-200">
                      <Filter className="mr-2 h-4 w-4" />
                      <span>Filters</span>
                      <DropdownMenuShortcut>⌘F</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      localStorage.removeItem('deltalytix_user_data')
                      signOut()
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
        </div>
      </motion.nav>
      <div className="h-[76px]" />
      
      {/* Hidden components for programmatic triggering */}
        <div className="hidden">
          <AddWidgetSheet
            ref={addWidgetSheetRef}
            onAddWidget={addWidget}
            isCustomizing={isCustomizing}
          />
          <FilterDropdown ref={filterDropdownRef} />
        </div>
    </>
  )
}