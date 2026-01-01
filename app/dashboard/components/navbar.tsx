'use client'

import { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useData } from "@/context/data-provider"
import { Database, LogOut, LayoutDashboard, RefreshCw, Home, Moon, Sun, Laptop, Settings, Pencil, Plus, Waves, BookOpen, LayoutTemplate, Trash2, Users, Filter } from "lucide-react"
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
import { cn } from '@/lib/utils'
import ImportButton from './import/import-button'
// import { AddWidgetSheet } from './add-widget-sheet'
import { AccountSelector } from './navbar-filters/account-selector'
import { CombinedFilters } from './navbar-filters/combined-filters'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { SeasonalAvatarBadge } from '@/app/dashboard/components/seasonal/seasonal-avatar-badge'
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import { useDashboardLayout } from '../hooks/use-dashboard-layout'
import { Skeleton } from "@/components/ui/skeleton"
import { motion } from 'framer-motion'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTheme } from '@/context/theme-provider'
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { useUserStore } from '@/store/user-store'
import { useDashboardEditStore } from '@/store/dashboard-edit-store'
import { WidgetType, WidgetSize } from '../types/dashboard'

import { toast } from 'sonner'
import { useTemplates } from '@/context/template-provider'
import { useTemplateEditStore } from '@/store/template-edit-store'

/**
 * Helper function to determine if a phase number represents the funded stage
 * based on the evaluation type.
 */
function isFundedPhase(evaluationType: string | undefined, phaseNumber: number | undefined): boolean {
  if (!phaseNumber) return false
  switch (evaluationType) {
    case 'Two Step':
      return phaseNumber >= 3
    case 'One Step':
      return phaseNumber >= 2
    case 'Instant':
      return phaseNumber >= 1
    default:
      return phaseNumber >= 3 // Default to Two Step behavior
  }
}

/**
 * Get display name for a phase (returns "Funded" for funded phases)
 */
function getPhaseDisplayName(evaluationType: string | undefined, phaseNumber: number | undefined): string {
  if (!phaseNumber) return ''
  if (isFundedPhase(evaluationType, phaseNumber)) {
    return 'Funded'
  }
  return `Phase ${phaseNumber}`
}



export default function Navbar() {
  const user = useUserStore(state => state.supabaseUser)
  const [mounted, setMounted] = useState(false)

  const { theme, setTheme } = useTheme()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)
  const [accountPopoverOpen, setAccountPopoverOpen] = useState(false)
  const [mobileTemplateDialogOpen, setMobileTemplateDialogOpen] = useState(false)
  const [mobileThemeDialogOpen, setMobileThemeDialogOpen] = useState(false)
  const [templatePopoverOpen, setTemplatePopoverOpen] = useState(false)
  const [filtersPopoverOpen, setFiltersPopoverOpen] = useState(false)
  const [createTemplateDialogOpen, setCreateTemplateDialogOpen] = useState(false)
  const [deleteTemplateDialogOpen, setDeleteTemplateDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')

  // Prevent hydration mismatch by only rendering theme-dependent content after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const { refreshTrades, saveDashboardLayout, accountNumbers, accounts, dateRange, instruments } = useData()
  const { dashboardLayout: layouts, isMobile } = useUserStore(state => state)
  const { handleEditToggle, addWidget } = useDashboardLayout()
  const {
    isCustomizing,
    setIsCustomizing,
    hasUnsavedChanges,
    setOriginalLayout,
    resetChanges,
    markAsChanged
  } = useDashboardEditStore()
  const { templates, activeTemplate, switchTemplate, createTemplate, deleteTemplate } = useTemplates()
  const { enterEditMode } = useTemplateEditStore()

  // Handle template create
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return

    try {
      await createTemplate(newTemplateName.trim())
      setNewTemplateName('')
      setCreateTemplateDialogOpen(false)
      setTemplatePopoverOpen(false)
    } catch (error) {
      // Error already shown by hook via toast
    }
  }

  // Handle template delete
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return

    try {
      await deleteTemplate(templateToDelete)
      setTemplateToDelete(null)
      setDeleteTemplateDialogOpen(false)
    } catch (error) {
      // Error handled by hook
    }
  }

  const openDeleteDialog = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTemplateToDelete(templateId)
    setDeleteTemplateDialogOpen(true)
  }

  const handleEditTemplate = (template: typeof templates[0], e: React.MouseEvent) => {
    e.stopPropagation()

    // Don't allow editing temporary/fallback template or default template
    if (template.id === 'default-temp' || template.id === 'fallback' || template.isDefault) {
      if (template.isDefault) {
        setTimeout(() => {
          toast.error('Cannot edit default template', {
            description: 'Please create a new template to customize your layout.',
            duration: 3000,
          })
        }, 0)
      }
      return
    }

    if (template.layout) {
      enterEditMode(template.layout)
      setTemplatePopoverOpen(false)
    }
  }

  // Refs for programmatically triggering components
  const addWidgetSheetRef = useRef<HTMLButtonElement>(null)

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "midnight-ocean" | "system")
    setIsLogoPopoverOpen(false)
  }

  const getThemeIcon = () => {
    // Prevent hydration mismatch - always return the same icon until mounted
    if (!mounted) {
      return <Laptop className="h-4 w-4" />;
    }

    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'midnight-ocean') return <Waves className="h-4 w-4" />;
    // For 'system' theme, check the actual applied theme after mounting
    if (theme === 'system') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
    }
    // Fallback to Laptop icon
    return <Laptop className="h-4 w-4" />;
  }

  // Count unique master accounts (prop-firm grouped by masterAccountId, live counted individually)
  const getMasterAccountCount = () => {
    if (!accountNumbers || accountNumbers.length === 0) {
      return 0
    }

    const selectedAccounts = accountNumbers
      .map(num => accounts.find(acc => acc.number === num || acc.id === num))
      .filter(Boolean) as any[]

    // Group prop-firm accounts by masterAccountId (or name as fallback)
    // Count live accounts individually
    const masterAccountSet = new Set<string>()

    selectedAccounts.forEach(acc => {
      const accountType = (acc as any).accountType || (acc.propfirm ? 'prop-firm' : 'live')

      if (accountType === 'prop-firm') {
        // For prop-firm: group by masterAccountId or name
        const masterId = (acc as any).currentPhaseDetails?.masterAccountId || acc.name || acc.number
        masterAccountSet.add(masterId)
      } else {
        // For live accounts: count each individually (use id as unique identifier)
        masterAccountSet.add(acc.id || acc.number)
      }
    })

    return masterAccountSet.size
  }

  // Count only prop-firm phases (exclude live accounts)
  const getPropFirmPhaseCount = () => {
    if (!accountNumbers || accountNumbers.length === 0) {
      return 0
    }

    const selectedAccounts = accountNumbers
      .map(num => accounts.find(acc => acc.number === num || acc.id === num))
      .filter(Boolean) as any[]

    // Count only prop-firm accounts (phases)
    return selectedAccounts.filter(acc => {
      const accountType = (acc as any).accountType || (acc.propfirm ? 'prop-firm' : 'live')
      return accountType === 'prop-firm'
    }).length
  }

  // Determine the account button text based on selected accounts
  const getAccountButtonText = () => {
    if (!accountNumbers || accountNumbers.length === 0) {
      return "All Accounts"
    }

    const masterCount = getMasterAccountCount()

    if (masterCount === 0) {
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
        const phaseNum = (account as any).currentPhase || (account as any).currentPhaseDetails?.phaseNumber
        const evalType = (account as any).currentPhaseDetails?.evaluationType
        const phaseInfo = phaseNum ? ` - ${getPhaseDisplayName(evalType, phaseNum)}` : ''
        return `${accountName}${phaseInfo}`
      }
      return `1 Account`
    }

    // Multiple accounts selected - show count of master accounts
    return `${masterCount} Account${masterCount !== 1 ? 's' : ''}`
  }





  return (
    <>
      <motion.nav
        className="fixed py-3 top-0 left-0 right-0 z-50 flex flex-col text-foreground bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-xl shadow-background/10 w-full transition-all duration-300 ease-out"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-6 h-12">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <Popover open={isLogoPopoverOpen} onOpenChange={setIsLogoPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="p-0 hover:bg-muted/50 transition-all duration-200 hover:scale-105 group" aria-label="App menu">
                    <Logo className='h-7 w-7 transition-transform duration-200 group-hover:rotate-3' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none mb-3">Navigation</h4>
                    <div className="grid gap-2">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 text-sm hover:bg-muted/50 p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="flex-shrink-0 w-4 h-4">
                          <LayoutDashboard className="h-full w-full" />
                        </div>
                        Dashboard
                      </Link>
                      <Link
                        href="/"
                        className="flex items-center gap-2 text-sm hover:bg-muted/50 p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
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
                <Button variant="ghost" size="sm" className="hidden md:flex h-8 px-3 hover:bg-muted/50 transition-all duration-200 border border-border/50 bg-card/50">
                  <Users className="mr-2 h-4 w-4" />
                  <span className="text-sm">{getAccountButtonText()}</span>
                  {accountNumbers.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                      {getPropFirmPhaseCount()}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto max-w-[90vw] sm:max-w-[95vw]" align="end" sideOffset={4} collisionPadding={16} avoidCollisions={true}>
                <AccountSelector onSave={() => setAccountPopoverOpen(false)} />
              </PopoverContent>
            </Popover>

            {/* Combined Filters Dropdown */}
            <CombinedFilters
              onSave={() => setFiltersPopoverOpen(false)}
              open={filtersPopoverOpen}
              onOpenChange={setFiltersPopoverOpen}
            />

            {/* Import Trades Button (moved here) - Always visible */}
            <ImportButton />

            {/* Template Selector - Desktop only */}
            <Popover open={templatePopoverOpen} onOpenChange={setTemplatePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:flex h-9 w-9 hover:bg-muted/50 transition-all duration-200 hover:scale-105 hover:shadow-md"
                  title="Templates"
                >
                  <LayoutTemplate className="h-4 w-4" />
                  <span className="sr-only">Templates</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" align="end" sideOffset={8}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Templates</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => setCreateTemplateDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                          activeTemplate?.id === template.id && "bg-muted"
                        )}
                        onClick={() => !template.isActive && switchTemplate(template.id)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm">{template.name}</span>
                          {template.isDefault && (
                            <span className="text-xxs px-1.5 py-0.5 rounded bg-muted text-foreground">
                              Default
                            </span>
                          )}
                          {template.isActive && (
                            <span className="text-xxs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                              Active
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {!template.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-muted/80"
                              onClick={(e) => handleEditTemplate(template, e)}
                              disabled={!template.isActive}
                              title="Edit template"
                            >
                              <Pencil className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}

                          {!template.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                              onClick={(e) => openDeleteDialog(template.id, e)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Notification Center - Always visible */}
            <NotificationCenter />

            {/* Theme Switcher - Hidden on small mobile */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex h-9 w-9 hover:bg-muted/50 transition-all duration-200 hover:scale-105 hover:shadow-md">
                  {getThemeIcon()}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0 bg-card border-border shadow-2xl" align="end" sideOffset={8}>
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem onSelect={() => handleThemeChange("light")} className="hover:bg-muted/50 transition-colors duration-200">
                        <Sun className="mr-2 h-4 w-4" />
                        <span>Light mode</span>
                      </CommandItem>
                      <CommandItem onSelect={() => handleThemeChange("dark")} className="hover:bg-muted/50 transition-colors duration-200">
                        <Moon className="mr-2 h-4 w-4" />
                        <span>Dark mode</span>
                      </CommandItem>
                      <CommandItem onSelect={() => handleThemeChange("midnight-ocean")} className="hover:bg-muted/50 transition-colors duration-200">
                        <Waves className="mr-2 h-4 w-4" />
                        <span>Midnight Ocean</span>
                      </CommandItem>
                      <CommandItem onSelect={() => handleThemeChange("system")} className="hover:bg-muted/50 transition-colors duration-200">
                        <Laptop className="mr-2 h-4 w-4" />
                        <span>System theme</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div>
                    <SeasonalAvatarBadge>
                      <Avatar className="cursor-pointer h-9 w-9 ring-2 ring-transparent hover:ring-border transition-all duration-200 hover:scale-105 hover:shadow-lg">
                        <AvatarImage src={user?.user_metadata?.avatar_url} className="transition-transform duration-200" />
                        <AvatarFallback className="uppercase text-xs bg-muted text-foreground font-medium">
                          {user?.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </SeasonalAvatarBadge>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.email || <Skeleton className="h-4 w-32" />}
                  </div>

                  {/* Mobile-only quick actions */}
                  <div className="md:hidden">
                    <DropdownMenuItem onClick={() => setAccountPopoverOpen(true)} className="hover:bg-muted/50 transition-colors duration-200">
                      <Users className="mr-2 h-4 w-4" />
                      <span>{getAccountButtonText()}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        // Open the filters popover from mobile menu
                        setFiltersPopoverOpen(true)
                      }}
                      className="hover:bg-muted/50 transition-colors duration-200"
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      <span>Filters</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setMobileTemplateDialogOpen(true)}
                      className="hover:bg-muted/50 transition-colors duration-200"
                    >
                      <LayoutTemplate className="mr-2 h-4 w-4" />
                      <span>Templates</span>
                      {activeTemplate && (
                        <span className="ml-auto text-xs text-muted-foreground">{activeTemplate.name}</span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setMobileThemeDialogOpen(true)}
                      className="hover:bg-muted/50 transition-colors duration-200"
                    >
                      {getThemeIcon()}
                      <span className="ml-2">Theme</span>
                      <span className="ml-auto text-xs text-muted-foreground capitalize">{theme}</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </div>

                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="hover:bg-muted/50 transition-colors duration-200">
                      <div className="flex w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                        <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                      </div>
                    </Link>
                  </DropdownMenuItem>

                  <Link href={"/dashboard/data"}>
                    <DropdownMenuItem className="hover:bg-muted/50 transition-colors duration-200">
                      <Database className="mr-2 h-4 w-4" />
                      <span>Data</span>
                      <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </Link>

                  <Link href={"/docs"}>
                    <DropdownMenuItem className="hover:bg-muted/50 transition-colors duration-200">
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>Documentation</span>
                      <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                    </DropdownMenuItem>
                  </Link>

                  <DropdownMenuItem onClick={async () => await refreshTrades()} className="hover:bg-muted/50 transition-colors duration-200">
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
      <div className="h-12" />

      {/* Hidden components for programmatic triggering */}
      <div className="hidden">
      </div>

      {/* Mobile Template Selector Dialog */}
      <Dialog open={mobileTemplateDialogOpen} onOpenChange={setMobileTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Templates</DialogTitle>
            <DialogDescription>
              Select or manage your dashboard templates
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                  activeTemplate?.id === template.id && "bg-muted"
                )}
                onClick={async () => {
                  if (!template.isActive) {
                    await switchTemplate(template.id)
                    setMobileTemplateDialogOpen(false)
                  }
                }}
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-sm font-medium">{template.name}</span>
                  {template.isDefault && (
                    <span className="text-xxs px-1.5 py-0.5 rounded bg-muted text-foreground">
                      Default
                    </span>
                  )}
                  {template.isActive && (
                    <span className="text-xxs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Theme Selector Dialog */}
      <Dialog open={mobileThemeDialogOpen} onOpenChange={setMobileThemeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Theme</DialogTitle>
            <DialogDescription>
              Choose your preferred color theme
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                theme === 'light' && "bg-muted"
              )}
              onClick={() => {
                handleThemeChange("light")
                setMobileThemeDialogOpen(false)
              }}
            >
              <Sun className="h-5 w-5" />
              <span className="text-sm font-medium">Light mode</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                theme === 'dark' && "bg-muted"
              )}
              onClick={() => {
                handleThemeChange("dark")
                setMobileThemeDialogOpen(false)
              }}
            >
              <Moon className="h-5 w-5" />
              <span className="text-sm font-medium">Dark mode</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                theme === 'midnight-ocean' && "bg-muted"
              )}
              onClick={() => {
                handleThemeChange("midnight-ocean")
                setMobileThemeDialogOpen(false)
              }}
            >
              <Waves className="h-5 w-5" />
              <span className="text-sm font-medium">Midnight Ocean</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer",
                theme === 'system' && "bg-muted"
              )}
              onClick={() => {
                handleThemeChange("system")
                setMobileThemeDialogOpen(false)
              }}
            >
              <Laptop className="h-5 w-5" />
              <span className="text-sm font-medium">System theme</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Template Dialog */}
      <Dialog
        open={createTemplateDialogOpen}
        onOpenChange={(open) => {
          setCreateTemplateDialogOpen(open)
          // Clear template name when dialog closes (user cancels or dismisses)
          if (!open) {
            setNewTemplateName('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new dashboard template. It will be initialized with the default layout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="My Custom Template"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTemplate()
                  }
                }}
                maxLength={50}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <AlertDialog open={deleteTemplateDialogOpen} onOpenChange={setDeleteTemplateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}