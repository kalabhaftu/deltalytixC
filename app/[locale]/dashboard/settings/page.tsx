'use client'

import { useState, useEffect } from 'react'
import { useI18n } from "@/locales/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUserStore } from '../../../../store/user-store'
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
import { AccountFilterSettingsCard } from "@/components/account-filter-settings"
import { useToolbarSettingsStore } from "@/store/toolbar-settings-store"
import { toast } from "@/hooks/use-toast"
import { PrimaryButton, SecondaryButton, DestructiveButton } from "@/components/ui/button-styles"

import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ChevronDown, Layout } from "lucide-react"
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
  const t = useI18n()

  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const user = useUserStore(state => state.supabaseUser)
  const timezone = useUserStore(state => state.timezone)
  const setTimezone = useUserStore(state => state.setTimezone)
  
  const [isUISettingsOpen, setIsUISettingsOpen] = useState(false)
  
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

  
  // Toolbar settings
  const { settings, setFixedPosition, setAutoHide, resetSettings } = useToolbarSettingsStore()
  
  const handleToolbarSettingChange = (setting: string, value: boolean) => {
    if (setting === 'fixedPosition') {
      setFixedPosition(value)
    } else if (setting === 'autoHide') {
      setAutoHide(value)
    }
    
    toast({
      title: "Toolbar Settings Updated",
      description: `${setting === 'fixedPosition' ? 'Fixed position' : 'Auto-hide'} ${value ? 'enabled' : 'disabled'}.`,
      duration: 2000,
    })
  }
  
  const handleResetSettings = () => {
    resetSettings()
    toast({
      title: "Settings Reset",
      description: "Toolbar settings have been reset to default values.",
      duration: 2000,
    })
  }
  

  




  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
    toast({
      title: "Theme Updated",
      description: `Theme changed to ${value === 'system' ? 'system default' : value} mode.`,
      duration: 2000,
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
        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved successfully.",
          duration: 3000,
        })
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (error) {
      toast({
        title: "Update Failed", 
        description: error instanceof Error ? error.message : "There was an error updating your profile. Please try again.",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }
  
  const handleTimezoneChange = (value: string) => {
    setTimezone(value)
    toast({
      title: "Timezone Updated",
      description: `Timezone changed to ${value.replace('_', ' ')}.`,
      duration: 2000,
    })
  }
  

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'Delete my account') {
      toast({
        title: "Confirmation Required",
        description: "Please type 'Delete my account' to confirm.",
        variant: "destructive",
        duration: 3000,
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

      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
        duration: 3000,
      })

      // Clear local storage and sign out
      localStorage.removeItem('deltalytix_user_data')
      await signOut()
      
    } catch (error) {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "There was an error deleting your account. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
      setDeleteConfirmText('')
    }
  }

  const isDeleteConfirmed = deleteConfirmText === 'Delete my account'

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (typeof window !== 'undefined') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
    }
    return <Laptop className="h-4 w-4" />;
  };



  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.settings')}</h1>
        <p className="text-muted-foreground mt-2">{t('dashboard.settings.description')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('dashboard.profile')}
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
                loadingText={isLoadingProfile ? "Loading..." : "Updating..."}
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
              <div className="mt-2 flex items-center gap-4">
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
                <div className="flex-1">
                  <Label className="text-sm">Theme Intensity</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Slider
                      value={[intensity]}
                      onValueChange={([value]) => setIntensity(value)}
                      min={90}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-12">{intensity}%</span>
                  </div>
                </div>
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

            <Separator />

            {/* UI Customization Section */}
            <Collapsible open={isUISettingsOpen} onOpenChange={setIsUISettingsOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <Layout className="h-4 w-4" />
                    <Label className="text-base font-medium cursor-pointer">UI Customization</Label>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isUISettingsOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Toolbar Settings */}
                <div className="space-y-3 pl-6 border-l-2 border-border/30">
                  <Label className="text-sm font-medium text-muted-foreground">Toolbar Settings</Label>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="fixed-position">{t('toolbar.fixedPosition')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('toolbar.fixedPositionDescription')}
                      </p>
                    </div>
                    <Switch
                      id="fixed-position"
                      checked={settings.fixedPosition}
                      onCheckedChange={(checked) => handleToolbarSettingChange('fixedPosition', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-hide-toolbar">{t('toolbar.autoHide')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('toolbar.autoHideDescription')}
                      </p>
                    </div>
                    <Switch
                      id="auto-hide-toolbar"
                      checked={settings.autoHide}
                      onCheckedChange={(checked) => handleToolbarSettingChange('autoHide', checked)}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <SecondaryButton 
                      size="sm" 
                      onClick={handleResetSettings}
                      className="text-xs"
                    >
                      {t('toolbar.resetSettings')}
                    </SecondaryButton>
                  </div>
                </div>
                
                {/* Future UI Settings Placeholder */}
                <div className="space-y-3 pl-6 border-l-2 border-border/30">
                  <Label className="text-sm font-medium text-muted-foreground">More UI Settings</Label>
                  <p className="text-sm text-muted-foreground">
                    Additional UI customization options will be available here in future updates.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Notifications Section */}





        {/* Account Filter Settings */}
        <AccountFilterSettingsCard />

        {/* Linked Accounts Section */}
        <LinkedAccounts />

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
