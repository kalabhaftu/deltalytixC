'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useUserStore } from '@/store/user-store'
import { useTheme } from '@/context/theme-provider'
import {
  User,
  Settings,
  Shield,
  Moon,
  Sun,
  Laptop,
  Clock,
  Database,
  LogOut,
  Trash2,
  AlertTriangle,
  Check,
  ChevronRight,
  Palette
} from "lucide-react"
import { signOut } from "@/server/auth"
import { createClient } from "@/lib/supabase"
import Link from 'next/link'
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LinkedAccounts } from "@/components/linked-accounts"
import { toast } from "sonner"
import { PrimaryButton, SecondaryButton, DestructiveButton } from "@/components/ui/button-styles"
import { CacheManagement } from "./components/cache-management"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const timezones = [
  'UTC',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

function SettingRow({
  icon: Icon,
  label,
  description,
  action,
  className
}: {
  icon: any
  label: string
  description?: string
  action: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-3", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground truncate">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">
        {action}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const user = useUserStore(state => state.supabaseUser)
  const timezone = useUserStore(state => state.timezone)
  const setTimezone = useUserStore(state => state.setTimezone)

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || ''
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
    toast.success("Theme updated", {
      description: `Theme changed to ${value === 'system' ? 'system default' : value} mode.`,
      duration: 2000
    })
  }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profileData.firstName,
          lastName: profileData.lastName
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success("Profile updated", {
          description: "Your profile information has been saved.",
          duration: 3000
        })
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (error) {
      toast.error("Update failed", {
        description: error instanceof Error ? error.message : "There was an error updating your profile.",
        duration: 3000
      })
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const handleTimezoneChange = (value: string) => {
    setTimezone(value)
    toast.success("Timezone updated", {
      description: `Timezone changed to ${value.replace('_', ' ')}.`,
      duration: 2000
    })
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'Delete my account') {
      toast.error("Confirmation required", {
        description: "Please type 'Delete my account' to confirm.",
        duration: 3000
      })
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete account')
      }

      toast.success("Account deleted", {
        description: "Your account and all data have been permanently deleted.",
        duration: 3000
      })

      const supabase = createClient()
      await supabase.auth.signOut()
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/?deleted=true'

    } catch (error) {
      toast.error("Deletion failed", {
        description: error instanceof Error ? error.message : "There was an error deleting your account.",
        duration: 5000
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
      setDeleteConfirmText("")
    }
  }

  const isDeleteConfirmed = deleteConfirmText === 'Delete my account'

  const getThemeDisplay = () => {
    if (theme === 'light') return { icon: Sun, label: 'Light' }
    if (theme === 'dark') return { icon: Moon, label: 'Dark' }
    return { icon: Laptop, label: 'System' }
  }

  const themeInfo = getThemeDisplay()

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 pb-20 md:pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {/* Profile Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Profile</CardTitle>
                <CardDescription className="text-xs">Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarImage src={user?.user_metadata.avatar_url} />
                <AvatarFallback className="text-lg">
                  {user?.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground">
                  Member since {new Date(user?.created_at || '').toLocaleDateString()}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0">Active</Badge>
            </div>

            {/* Name fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName" className="text-xs">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter your first name"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  disabled={isLoadingProfile}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter your last name"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  disabled={isLoadingProfile}
                  className="h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} disabled className="h-9" />
            </div>

            <PrimaryButton
              onClick={handleProfileUpdate}
              loading={isUpdatingProfile || isLoadingProfile}
              loadingText={isLoadingProfile ? "Loading..." : "Updating..."}
              className="w-full sm:w-auto"
            >
              Update Profile
            </PrimaryButton>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Settings className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Preferences</CardTitle>
                <CardDescription className="text-xs">Customize your experience</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            {/* Theme */}
            <SettingRow
              icon={Palette}
              label="Theme"
              description="Choose your preferred color scheme"
              action={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 min-w-[100px]">
                      <themeInfo.icon className="h-3.5 w-3.5" />
                      {themeInfo.label}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      Light
                      {theme === 'light' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      Dark
                      {theme === 'dark' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleThemeChange("system")}>
                      <Laptop className="mr-2 h-4 w-4" />
                      System
                      {theme === 'system' && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />

            <Separator />

            {/* Timezone */}
            <SettingRow
              icon={Clock}
              label="Timezone"
              description={timezone.replace('_', ' ')}
              action={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      Change
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
              }
            />
          </CardContent>
        </Card>

        {/* Linked Accounts */}
        <LinkedAccounts />

        {/* Cache Management */}
        <CacheManagement />

        {/* Account Management Section */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription className="text-xs">Manage your account and data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/data">
                <Button variant="outline" className="gap-2">
                  <Database className="h-4 w-4" />
                  Data Management
                </Button>
              </Link>

              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  localStorage.removeItem('deltalytix_user_data')
                  signOut()
                }}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>

              <DestructiveButton
                variant="outline"
                className="gap-2"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </DestructiveButton>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-left space-y-3">
                <p className="text-sm">
                  This action is <strong>irreversible</strong> and will permanently delete:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Your account and profile</li>
                  <li>All trading data and history</li>
                  <li>Prop firm configurations</li>
                  <li>Dashboard layouts and preferences</li>
                  <li>All uploaded files</li>
                </ul>
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    This data cannot be recovered.
                  </p>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Label htmlFor="delete-confirm" className="text-sm">
              Type <code className="bg-muted px-1 py-0.5 rounded text-xs">Delete my account</code> to confirm:
            </Label>
            <Input
              id="delete-confirm"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type here..."
              className="font-mono text-sm"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setDeleteConfirmText('')
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <DestructiveButton
              onClick={handleDeleteAccount}
              disabled={!isDeleteConfirmed || isDeleting}
              loading={isDeleting}
              loadingText="Deleting..."
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </DestructiveButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
