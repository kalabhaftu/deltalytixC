'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUserStore } from '@/store/user-store'
import { useTheme } from '@/context/theme-provider'
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  Globe, 
  Moon, 
  Sun, 
  Laptop,
  Clock,
  Database,
  LogOut,
  Trash2,
  AlertTriangle
} from "lucide-react"
import { signOut } from "@/server/auth"
import { createClient } from "@/lib/supabase"
import Link from 'next/link'
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { LinkedAccounts } from "@/components/linked-accounts"
import { toast } from "sonner"
import { PrimaryButton, SecondaryButton, DestructiveButton } from "@/components/ui/button-styles"
import { DataSerializer } from "@/lib/data-serialization"
import { CacheManagement } from "./components/cache-management"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, Layout, ChevronLeft, ChevronRight, X } from "lucide-react"
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"




// Add timezone list
const timezones = [
  'UTC',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  // Add more common timezones as needed
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const user = useUserStore(state => state.supabaseUser)
  const timezone = useUserStore(state => state.timezone)
  const setTimezone = useUserStore(state => state.setTimezone)
  
  
  // Account deletion states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Form state for profile updates
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || ''
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)


  // Journal hover effect setting (local state for now, can be moved to store later)
  const [journalHoverEffect, setJournalHoverEffect] = useState<'simple' | 'detailed'>('simple')

  // Trading models settings
  const [customModelName, setCustomModelName] = useState('')
  const [customModels, setCustomModels] = useState<string[]>([])
  const [scrollPosition, setScrollPosition] = useState(0)
  const [deleteModelName, setDeleteModelName] = useState<string | null>(null)

  // Load custom models from DataSerializer on component mount
  useEffect(() => {
    const savedModels = DataSerializer.getTradingModels()
    setCustomModels(savedModels)
  }, [])

  // Save custom models using DataSerializer whenever they change
  useEffect(() => {
    DataSerializer.saveTradingModels(customModels)
  }, [customModels])

  const handleAddModel = () => {
    const trimmedName = customModelName.trim()
    if (!trimmedName) return

    try {
      const updatedModels = DataSerializer.addTradingModel(trimmedName)
      setCustomModels(updatedModels)
      setCustomModelName('')
      toast.success("Model Added", {
        description: `"${trimmedName}" has been added to your trading models.`,
        duration: 3000,
      })
    } catch (error) {
      toast.error("Model Already Exists", {
        description: `"${trimmedName}" is already in your models list.`,
        duration: 3000,
      })
    }
  }

  const handleDeleteModel = (modelName: string) => {
    setDeleteModelName(modelName)
  }

  const confirmDeleteModel = () => {
    if (!deleteModelName) return

    const updatedModels = DataSerializer.removeTradingModel(deleteModelName)
    setCustomModels(updatedModels)
    toast.success("Model Deleted", {
      description: `"${deleteModelName}" has been permanently removed from your models.`,
      duration: 3000
    })
    setDeleteModelName(null)
  }

  const handleScroll = (direction: 'left' | 'right') => {
    const totalModels = [...defaultModelsDisplay, ...customModels].length
    const maxScroll = Math.max(0, totalModels - 4)

    if (direction === 'left' && scrollPosition > 0) {
      setScrollPosition(scrollPosition - 1)
    } else if (direction === 'right' && scrollPosition < maxScroll) {
      setScrollPosition(scrollPosition + 1)
    }
  }

  // Utility function to format trading model names consistently
  const formatModelName = (model: string): string => {
    // Handle abbreviations that should stay uppercase
    const abbreviations = ['MSNR', 'TTFM', 'ICT']
    
    // Handle special cases
    if (model.includes('ict') || model.includes('ICT')) {
      return 'ICT 2022'
    }
    if (model.includes('msnr') || model === 'MSNR') {
      return 'MSNR'
    }
    if (model.includes('ttfm') || model === 'TTFM') {
      return 'TTFM'
    }
    if (model.includes('price') || model.includes('PRICE')) {
      return 'Price Action'
    }
    
    // For custom models, use proper title case
    return model.split(/[-_\s]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const defaultModelsDisplay = ['ICT 2022', 'MSNR', 'TTFM', 'Price Action']
  const allModels = [...defaultModelsDisplay, ...customModels.map(formatModelName)]
  const visibleModels = allModels.slice(scrollPosition, scrollPosition + 4)
  const canScrollLeft = scrollPosition > 0
  const canScrollRight = scrollPosition < Math.max(0, allModels.length - 4)

  // Map display names to enum values for database operations
  const mapDisplayToEnum = (displayName: string) => {
    const enumMap: Record<string, 'ICT_2022' | 'MSNR' | 'TTFM' | 'PRICE_ACTION'> = {
      'ICT 2022': 'ICT_2022',
      'MSNR': 'MSNR',
      'TTFM': 'TTFM',
      'Price Action': 'PRICE_ACTION'
    }
    return enumMap[displayName] || null
  }


  const handleJournalHoverChange = (value: 'simple' | 'detailed') => {
    setJournalHoverEffect(value)
    // Save to localStorage for now (can be persisted to database later)
    localStorage.setItem('journal-hover-effect', value)

    toast.success("Journal Settings Updated", {
      description: `Journal hover effect changed to ${value} mode.`,
      duration: 2000
    })
  }

  const handleResetSettings = () => {
    setJournalHoverEffect('simple')
    localStorage.removeItem('journal-hover-effect')

    toast.success("Settings Reset", {
      description: "All settings have been reset to default values.",
      duration: 2000
    })
  }

  

  




  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
    toast.success("Theme Updated", {
      description: `Theme changed to ${value === 'system' ? 'system default' : value} mode.`,
      duration: 2000
    })
  }
  
  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true)
        const response = await fetch('/api/auth/profile')
        const result = await response.json()
        
        if (result.success) {
          setProfileData({
            firstName: result.data.firstName || '',
            lastName: result.data.lastName || '',
            email: result.data.email || ''
          })
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchProfile()
  }, [])

  const handleProfileUpdate = async () => {
    setIsUpdatingProfile(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast.success("Profile Updated", {
          description: "Your profile information has been saved successfully.",
          duration: 3000
        })
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (error) {
      toast.error("Update Failed", {
        description: error instanceof Error ? error.message : "There was an error updating your profile. Please try again.",
        duration: 3000
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }
  
  const handleTimezoneChange = (value: string) => {
    setTimezone(value)
    toast.success("Timezone Updated", {
      description: `Timezone changed to ${value.replace('_', ' ')}.`,
      duration: 2000
    })
  }
  

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'Delete my account') {
      toast.error("Confirmation Required", {
        description: "Please type 'Delete my account' to confirm.",
        duration: 3000
      })
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account')
      }

      toast.success("Account Deleted", {
        description: "Your account and all associated data have been permanently deleted.",
        duration: 3000
      })

      // Force sign out from Supabase immediately
      const supabase = createClient()
      await supabase.auth.signOut()

      // Clear all local storage
      localStorage.clear()

      // Clear all session storage
      sessionStorage.clear()

      // Force clear auth state and redirect with deletion flag
      window.location.href = '/?deleted=true'
      
    } catch (error) {
      toast.error("Deletion Failed", {
        description: error instanceof Error ? error.message : "There was an error deleting your account. Please try again.",
        duration: 5000
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
      setDeleteConfirmText("")
    }
  }

  const isDeleteConfirmed = deleteConfirmText === 'Delete my account'

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    // For system theme, show laptop icon consistently (no window check during SSR)
    return <Laptop className="h-4 w-4" />;
  };



  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Manage your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.user_metadata.avatar_url} />
                <AvatarFallback className="text-lg">
                  {user?.email![0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{user?.email}</h3>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Member since {new Date(user?.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
            <Separator />
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    placeholder="Enter your first name"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={isLoadingProfile}
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    placeholder="Enter your last name"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={isLoadingProfile}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled />
              </div>
              <PrimaryButton 
                onClick={handleProfileUpdate}
                loading={isUpdatingProfile || isLoadingProfile}
                loadingText={isLoadingProfile ? "Loading profile..." : "Updating profile..."}
              >
                Update Profile
              </PrimaryButton>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Preferences
            </CardTitle>
            <CardDescription>
              Customize your dashboard appearance and behavior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Settings */}
            <div>
              <Label className="text-base font-medium">Theme</Label>
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start">
                      {getThemeIcon()}
                      <span className="ml-2">
                        {theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleThemeChange("system")}>
                      <Laptop className="mr-2 h-4 w-4" />
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Separator />



            {/* Timezone Settings */}
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timezone
              </Label>
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start">
                      <Clock className="mr-2 h-4 w-4" />
                      {timezone}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <ScrollArea className="h-[200px]">
                      <DropdownMenuRadioGroup value={timezone} onValueChange={handleTimezoneChange}>
                        {timezones.map((tz) => (
                          <DropdownMenuRadioItem key={tz} value={tz}>
                            {tz.replace('_', ' ')}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* UI Customization Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              UI Customization
            </CardTitle>
            <CardDescription>
              Customize the appearance and behavior of the interface
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Journal Card Hover Effect */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">Journal Card Hover Effect</Label>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="journal-hover-effect">Hover Style</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose how trade cards behave when hovered in the journal
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[200px] justify-start">
                      <Settings className="mr-2 h-4 w-4" />
                      {journalHoverEffect === 'simple' ? 'Simple' : 'Detailed'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleJournalHoverChange('simple')}>
                      <div className="mr-2 h-4 w-4" />
                      <span>Simple</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleJournalHoverChange('detailed')}>
                      <div className="mr-2 h-4 w-4" />
                      <span>Detailed</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Separator />

            {/* Future UI Settings Placeholder */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-muted-foreground">More UI Settings</Label>
              <p className="text-sm text-muted-foreground">
                Additional UI customization options will be available here in future updates.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}

        {/* Trading Models Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Trading Models
            </CardTitle>
            <CardDescription>
              Manage your trading models and strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
                {/* All Models with Scroll */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Your Models ({allModels.length})
                    </Label>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScroll('left')}
                        disabled={!canScrollLeft}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronLeft className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleScroll('right')}
                        disabled={!canScrollRight}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {visibleModels.map((model, index) => {
                      const isDefaultModel = defaultModelsDisplay.includes(model)
                      const isCustomModel = customModels.some(customModel => formatModelName(customModel) === model)
                      return (
                        <div
                          key={`${model}-${index}`}
                          className="group relative p-2 bg-muted rounded text-sm flex items-center justify-between"
                        >
                          <span className="flex-1 truncate">{model}</span>
                          {isCustomModel && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/20"
                                  onClick={() => {
                                    // Find the original custom model name
                                    const originalModel = customModels.find(customModel => formatModelName(customModel) === model)
                                    if (originalModel) {
                                      setDeleteModelName(originalModel)
                                    }
                                  }}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Trading Model</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &ldquo;{model}&rdquo;? This action cannot be undone and will remove this model from all your trades.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={confirmDeleteModel}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {isDefaultModel && (
                            <span className="text-xs text-muted-foreground ml-1 opacity-0 group-hover:opacity-100">
                              Default
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {allModels.length === 0 && (
                    <p className="text-sm text-muted-foreground">No models available</p>
                  )}
                </div>

                <Separator />

                {/* Model Request */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-muted-foreground">Request New Model</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Suggest a new trading model..."
                      value={customModelName}
                      onChange={(e) => setCustomModelName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAddModel()
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddModel}
                      disabled={!customModelName.trim()}
                    >
                      Suggest
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p>
                    {allModels.length > 4 ?
                      `Showing ${scrollPosition + 1}-${Math.min(scrollPosition + 4, allModels.length)} of ${allModels.length} models. Use arrows to navigate.` :
                      `All ${allModels.length} models are visible.`
                    }
                    {customModels.length > 0 && ` You have ${customModels.length} custom model${customModels.length !== 1 ? 's' : ''}.`}
                    These models are available when creating or editing trades.
                  </p>
                </div>
          </CardContent>
        </Card>

        {/* Linked Accounts Section */}
        <LinkedAccounts />

        {/* Cache Management Section */}
        <CacheManagement />

        {/* Account Management Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Account Management
            </CardTitle>
            <CardDescription>
              Manage your account settings and data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">

              <Link href="/dashboard/data">
                <SecondaryButton className="w-full justify-start">
                  <Database className="mr-2 h-4 w-4" />
                  Data Management
                </SecondaryButton>
              </Link>

              <Separator />
              
              <DestructiveButton 
                className="w-full justify-start"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete My Account
              </DestructiveButton>

              <Separator />
              <SecondaryButton 
                className="w-full justify-start"
                onClick={() => {
                  localStorage.removeItem('deltalytix_user_data')
                  signOut()
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </SecondaryButton>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Deletion Verification Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-left">
                <p className="text-sm text-muted-foreground">
                  This action is <strong>irreversible</strong> and will permanently delete:
                </p>
                <ul className="mt-2 list-disc list-inside space-y-1 text-sm">
                  <li>Your account and profile information</li>
                  <li>All trading data and history</li>
                  <li>Prop firm account configurations</li>
                  <li>Dashboard layouts and preferences</li>
                  <li>All uploaded files and documents</li>
                </ul>
                <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This data cannot be recovered once deleted.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirm" className="text-sm font-medium">
                Type <code className="bg-muted px-1 py-0.5 rounded text-xs">Delete my account</code> to confirm:
              </Label>
              <Input
                id="delete-confirm"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type the confirmation text here"
                className="font-mono text-sm w-full"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false)
                setDeleteConfirmText('')
              }}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <DestructiveButton
              onClick={handleDeleteAccount}
              disabled={!isDeleteConfirmed || isDeleting}
              loading={isDeleting}
              loadingText="Deleting Account..."
              className="w-full sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">I understand the consequences, delete my account</span>
              <span className="sm:hidden">Delete Account</span>
            </DestructiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
