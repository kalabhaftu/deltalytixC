'use client'

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Moon, Sun, Laptop } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { UserAuthForm } from "@/components/user-auth-form"
import { Logo } from "@/components/logo"
import { useAuth } from "@/context/auth-provider"
import { useTheme } from "@/context/theme-provider"
import { signOut } from "@/server/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"

export default function RootPage() {
  const { isAuthenticated, isLoading, forceClearAuth } = useAuth()
  const { theme, setTheme, effectiveTheme } = useTheme()
  const router = useRouter()
  const [isProcessingLogout, setIsProcessingLogout] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isClient) return

    const hash = window.location.hash
    const params = new URLSearchParams(hash.slice(1)) // Remove the # and parse

    if (params.get('error')) {
      const errorDescription = params.get('error')
      toast.error("Authentication Error", {
        description: errorDescription?.replace(/\+/g, ' ') || "An error occurred during authentication",
      })

      // Clear the hash after showing the toast
      router.replace('/')
    }
  }, [router, isClient])

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system")
    setThemeOpen(false)
  }

  const getThemeIcon = () => {
    // Always return the same icon until mounted to prevent hydration mismatch
    if (!mounted) {
      return <Laptop className="h-4 w-4" />
    }
    
    // Client-side logic using effectiveTheme from context
    if (theme === 'light') return <Sun className="h-4 w-4" />
    if (theme === 'dark') return <Moon className="h-4 w-4" />
    if (theme === 'system') {
      return effectiveTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
    }
    return <Sun className="h-4 w-4" /> // Default fallback
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
      // The signOut function handles the redirect, so we don't need to do anything else
    }
  }

  // Immediate check for logout parameter - handle this before any other logic
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('logout') === 'true' || urlParams.get('deleted') === 'true') {
      setIsProcessingLogout(true)
      forceClearAuth()
      // Clean the URL and reset processing state
      setTimeout(() => {
        window.history.replaceState({}, '', '/')
        setIsProcessingLogout(false)
      }, 100)
      return
    }
  }, [forceClearAuth])

  // Don't auto-redirect authenticated users - show them the logged-in UI instead
  // This provides better UX by showing confirmation they're logged in
  useEffect(() => {
    // Skip this check if we're processing logout or have logout/deletion parameters
    const urlParams = new URLSearchParams(window.location.search)
    if (isProcessingLogout || urlParams.get('logout') === 'true' || urlParams.get('deleted') === 'true') {
      return
    }

    // Only clear auth if needed, don't redirect
    const checkFreshAuth = async () => {
      if (isAuthenticated && !isLoading) {
        // Double-check auth status with a fresh API call
        try {
          const response = await fetch('/api/auth/check', {
            cache: 'no-cache',
            headers: { 'Cache-Control': 'no-cache' }
          })
          const data = await response.json()

          if (!response.ok || !data.authenticated) {
            // User is not truly authenticated, force clear auth state
            // Force refresh the auth provider state
            if (window.location.search.includes('deleted=true') || window.location.search.includes('logout=true')) {
              // If coming from account deletion or logout, force a complete session clear
              forceClearAuth()
              // Remove the parameter and reload
              window.location.replace('/')
              return
            }
            // If not authenticated, the auth provider will handle the state update
          }
          // If authenticated, we just show the logged-in UI (no redirect)
        } catch (error) {
          // If auth check fails, stay on auth page
        }
      }
    }

    checkFreshAuth()
  }, [isAuthenticated, isLoading, forceClearAuth, isProcessingLogout])

  // If user is authenticated and not processing logout, show logged-in state
  if (isAuthenticated && !isLoading && !isProcessingLogout) {
    return (
      <div className="min-h-screen bg-background overflow-hidden">
        {/* Theme Switcher - Fixed position */}
        <div className="fixed top-4 right-4 z-50">
          <Popover open={themeOpen} onOpenChange={setThemeOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 px-0 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background/90">
                {getThemeIcon()}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="end">
              <Command>
                <CommandList>
                  <CommandGroup>
                    <CommandItem onSelect={() => handleThemeChange("light")}>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Light mode</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleThemeChange("dark")}>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Dark mode</span>
                    </CommandItem>
                    <CommandItem onSelect={() => handleThemeChange("system")}>
                      <Laptop className="mr-2 h-4 w-4" />
                      <span>System theme</span>
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background">
          {/* Left Pane - Same as auth page */}
          <div className="relative hidden h-full flex-col lg:flex bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-primary/10 dark:via-background dark:to-accent/10">
            <div className="absolute inset-0 overflow-hidden">
              {/* Subtle animated background pattern */}
              <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
              </div>

              {/* Subtle floating elements */}
              <motion.div
                className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full blur-xl"
                animate={{
                  y: [-10, 10, -10],
                  x: [-5, 5, -5],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <motion.div
                className="absolute top-3/4 right-1/4 w-24 h-24 bg-accent/5 dark:bg-accent/10 rounded-full blur-lg"
                animate={{
                  y: [10, -10, 10],
                  x: [5, -5, 5],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 2
                }}
              />
            </div>

            <div className="relative z-20 flex flex-col justify-between h-full p-10">
              <div className="flex items-center text-lg font-medium">
                <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <Logo className="w-10 h-10 fill-primary dark:fill-primary"/>
                  <span className="text-foreground dark:text-foreground font-semibold">Deltalytix</span>
                </Link>
              </div>

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="space-y-4"
                >
                  <h2 className="text-3xl font-bold text-foreground dark:text-foreground">
                    Welcome Back!
                  </h2>
                  <p className="text-lg text-muted-foreground dark:text-muted-foreground leading-relaxed">
                    You&apos;re already logged in. Ready to continue your trading journey?
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  className="grid grid-cols-3 gap-4"
                >
                  {[
                    { label: "Real-time", value: "Data" },
                    { label: "Advanced", value: "Analytics" },
                    { label: "Smart", value: "Insights" }
                  ].map((feature, index) => (
                    <div key={index} className="text-center p-3 rounded-lg bg-background/50 dark:bg-background/20 backdrop-blur-sm border border-border/50">
                      <div className="text-2xl font-bold text-primary dark:text-primary">{feature.value}</div>
                      <div className="text-sm text-muted-foreground dark:text-muted-foreground">{feature.label}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                © 2025 Deltalytix. All rights reserved.
              </div>
            </div>
          </div>

          {/* Right Pane - Logged in state */}
          <div className="p-4 lg:p-8 bg-background dark:bg-background">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col space-y-2 text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground dark:text-foreground">
                  You&apos;re Already Logged In!
                </h1>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  Welcome back! Click below to access your trading dashboard.
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-4"
              >
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full h-12 text-base font-medium transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  Go to Dashboard
                </Button>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Not you? You can{" "}
                    <button 
                      onClick={handleLogout}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      sign out here
                    </button>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Theme Switcher - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <Popover open={themeOpen} onOpenChange={setThemeOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 px-0 bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-background/90">
              {getThemeIcon()}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="end">
            <Command>
              <CommandList>
                <CommandGroup>
                  <CommandItem onSelect={() => handleThemeChange("light")}>
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light mode</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleThemeChange("dark")}>
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark mode</span>
                  </CommandItem>
                  <CommandItem onSelect={() => handleThemeChange("system")}>
                    <Laptop className="mr-2 h-4 w-4" />
                    <span>System theme</span>
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0 bg-background">
        {/* Left Pane - Clean Design */}
        <div className="relative hidden h-full flex-col lg:flex bg-gradient-to-br from-primary/5 via-background to-accent/5 dark:from-primary/10 dark:via-background dark:to-accent/10">
          <div className="absolute inset-0 overflow-hidden">
            {/* Subtle animated background pattern */}
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <defs>
                  <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Subtle floating elements */}
            <motion.div
              className="absolute top-1/4 left-1/4 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full blur-xl"
              animate={{
                y: [-10, 10, -10],
                x: [-5, 5, -5],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div
              className="absolute top-3/4 right-1/4 w-24 h-24 bg-accent/5 dark:bg-accent/10 rounded-full blur-lg"
              animate={{
                y: [10, -10, 10],
                x: [5, -5, 5],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 2
              }}
            />
          </div>

          <div className="relative z-20 flex flex-col justify-between h-full p-10">
            <div className="flex items-center text-lg font-medium">
              <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <Logo className="w-10 h-10 fill-primary dark:fill-primary"/>
                <span className="text-foreground dark:text-foreground font-semibold">Deltalytix</span>
              </Link>
            </div>

            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="space-y-4"
              >
                <h2 className="text-3xl font-bold text-foreground dark:text-foreground">
                  Master Your Trading Journey
                </h2>
                <p className="text-lg text-muted-foreground dark:text-muted-foreground leading-relaxed">
                  Take control of your trading with powerful analytics and real-time insights designed for serious traders like you.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-3 gap-4"
              >
                {[
                  { label: "Real-time", value: "Data" },
                  { label: "Advanced", value: "Analytics" },
                  { label: "Smart", value: "Insights" }
                ].map((feature, index) => (
                  <div key={index} className="text-center p-3 rounded-lg bg-background/50 dark:bg-background/20 backdrop-blur-sm border border-border/50">
                    <div className="text-2xl font-bold text-primary dark:text-primary">{feature.value}</div>
                    <div className="text-sm text-muted-foreground dark:text-muted-foreground">{feature.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            <div className="text-sm text-muted-foreground dark:text-muted-foreground">
              © 2025 Deltalytix. All rights reserved.
            </div>
          </div>
        </div>

        {/* Right Pane - Authentication Form */}
        <div className="p-4 lg:p-8 bg-background dark:bg-background">
          <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col space-y-2 text-center"
            >
              <h1 className="text-2xl font-semibold tracking-tight text-foreground dark:text-foreground">
                Start Your Journey
              </h1>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Enter your email to access your personalized trading dashboard
              </p>
            </motion.div>
            <UserAuthForm />
          </div>
        </div>
      </div>
    </div>
  )
}
