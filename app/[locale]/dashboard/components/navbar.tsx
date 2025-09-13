'use client'

import { useState, useRef, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useData } from "@/context/data-provider"
import { Database, LogOut, Globe, LayoutDashboard, HelpCircle, Clock, RefreshCw, Home, Moon, Sun, Laptop, Settings } from "lucide-react"
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

import { useI18n } from "@/locales/client"
import { useKeyboardShortcuts } from '../hooks/use-keyboard-shortcuts'
import DateCalendarFilter from './filters/date-calendar-filter'
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
import { useModalStateStore } from '../../../../store/modal-state-store'
import { useUserStore } from '../../../../store/user-store'

export default function Navbar() {
  const  user = useUserStore(state => state.supabaseUser)
  const t = useI18n()

  const { theme, setTheme, intensity, setIntensity } = useTheme()
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)

  const {refreshTrades} = useData()

  // Initialize keyboard shortcuts
  useKeyboardShortcuts()

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
  }

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    // For 'system' theme, we need to check the actual applied theme
    if (typeof window !== 'undefined') {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />;
    }
    // Fallback to Laptop icon if we can't determine
    return <Laptop className="h-4 w-4" />;
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
          <div className="flex items-center gap-x-3">
            <div className="flex flex-col items-center">
              <Popover open={isLogoPopoverOpen} onOpenChange={setIsLogoPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="p-0 hover:bg-primary/10 transition-all duration-200 hover:scale-105 group">
                    <Logo className='fill-black h-7 w-7 dark:fill-white transition-transform duration-200 group-hover:rotate-3' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none mb-3">{t('landing.navbar.logo.title')}</h4>
                    <div className="grid gap-2">
                      <Link 
                        href="/dashboard" 
                        className="flex items-center gap-2 text-sm hover:bg-accent/80 hover:text-accent-foreground p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="flex-shrink-0 w-4 h-4">
                          <LayoutDashboard className="h-full w-full" />
                        </div>
                        {t('landing.navbar.logo.dashboard')}
                      </Link>
                      <Link 
                        href="/" 
                        className="flex items-center gap-2 text-sm hover:bg-accent/80 hover:text-accent-foreground p-3 rounded-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-md"
                        onClick={() => setIsLogoPopoverOpen(false)}
                      >
                        <div className="flex-shrink-0 w-4 h-4">
                          <Home className="h-full w-full" />
                        </div>
                        {t('landing.navbar.logo.home')}
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className='flex gap-x-2 md:gap-x-4'>
              <div className='hidden sm:block'>
                <DateCalendarFilter />
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
                    <span className="sr-only">{t('landing.navbar.toggleTheme')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" align="end">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        <CommandItem onSelect={() => handleThemeChange("light")} className="hover:bg-accent/80 transition-colors duration-200">
                          <Sun className="mr-2 h-4 w-4" />
                          <span>{t('landing.navbar.lightMode')}</span>
                        </CommandItem>
                        <CommandItem onSelect={() => handleThemeChange("dark")} className="hover:bg-accent/80 transition-colors duration-200">
                          <Moon className="mr-2 h-4 w-4" />
                          <span>{t('landing.navbar.darkMode')}</span>
                        </CommandItem>
                        <CommandItem onSelect={() => handleThemeChange("system")} className="hover:bg-accent/80 transition-colors duration-200">
                          <Laptop className="mr-2 h-4 w-4" />
                          <span>{t('landing.navbar.systemTheme')}</span>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                    <Separator />
                    <div className="p-4">
                    <div className="mb-2 text-sm font-medium">{t('dashboard.theme.intensity')}</div>
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
                    <DropdownMenuLabel>{t('dashboard.myAccount')}</DropdownMenuLabel>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {user?.email}
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="hover:bg-accent/80 transition-colors duration-200">
                        <div className="flex w-full">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          <span>{t('landing.navbar.dashboard')}</span>
                          <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/settings" className="hover:bg-accent/80 transition-colors duration-200">
                        <div className="flex w-full">
                          <Settings className="mr-2 h-4 w-4" />
                          <span>{t('dashboard.settings')}</span>
                          <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                        </div>
                      </Link>
                    </DropdownMenuItem>

                    <Link href={"/dashboard/data"}>
                      <DropdownMenuItem className="hover:bg-accent/80 transition-colors duration-200">
                        <Database className="mr-2 h-4 w-4" />
                        <span>{t('dashboard.data')}</span>
                        <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={async ()=>await refreshTrades()} className="hover:bg-accent/80 transition-colors duration-200">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      <span>{t('dashboard.refreshData')}</span>
                      <DropdownMenuShortcut>⌘R</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      localStorage.removeItem('deltalytix_user_data')
                      signOut()
                    }} className="hover:bg-destructive/20 transition-colors duration-200">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('dashboard.logOut')}</span>
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
    </>
  )
}