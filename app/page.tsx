'use client'

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Moon, Sun, Laptop, Waves, LogOut, ArrowRight, LayoutDashboard, LineChart, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useAuth } from "@/context/auth-provider"
import { useTheme } from "@/context/theme-provider"
import { signOut } from "@/server/auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { UserAuthForm } from "@/components/user-auth-form"

export default function RootPage() {
  const { isAuthenticated, isLoading, forceClearAuth } = useAuth()
  const { theme, setTheme, effectiveTheme } = useTheme()
  const router = useRouter()
  const [isProcessingLogout, setIsProcessingLogout] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    setIsClient(true)
    setMounted(true)
  }, [])

  // Handle errors in URL hash
  useEffect(() => {
    if (!isClient) return
    const hash = window.location.hash
    const params = new URLSearchParams(hash.slice(1))

    if (params.get('error')) {
      const errorDescription = params.get('error')
      toast.error("Authentication Error", {
        description: errorDescription?.replace(/\+/g, ' ') || "An error occurred during authentication",
      })
      router.replace('/')
    }
  }, [router, isClient])

  // Handle Logout
  const handleLogout = async () => {
    try {
      setIsProcessingLogout(true)
      await signOut()
      // Force clear client state for immediate feedback
      forceClearAuth()
      window.location.reload()
    } catch (error) {
      toast.error("Sign out failed", {
        description: "Please try again"
      })
      setIsProcessingLogout(false)
    }
  }

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "midnight-ocean" | "system")
    setThemeOpen(false)
  }

  const getThemeIcon = () => {
    if (!mounted) return <Laptop className="h-4 w-4" />
    if (theme === 'light') return <Sun className="h-4 w-4" />
    if (theme === 'midnight-ocean') return <Waves className="h-4 w-4" />
    if (theme === 'dark') return <Moon className="h-4 w-4" />
    if (theme === 'system') return effectiveTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
    return <Sun className="h-4 w-4" />
  }

  // --- RENDERING ---

  // 1. Authenticated State - "WOW" Dashboard Portal
  if (isAuthenticated && !isLoading && !isProcessingLogout) {
    return (
      <div className="min-h-screen bg-background overflow-hidden relative selection:bg-primary/20">

        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />

        {/* Top Navigation Bar */}
        <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-all duration-300 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-md rounded-full group-hover:bg-primary/40 transition-colors" />
              <Logo className="w-10 h-10 fill-foreground relative z-10" />
            </div>
            <span className="text-foreground font-bold text-xl tracking-tight">Deltalytix</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <Popover open={themeOpen} onOpenChange={setThemeOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 p-0 rounded-full bg-background/50 backdrop-blur-md border border-border/50 hover:bg-background hover:border-border transition-all">
                  {getThemeIcon()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      <CommandItem onSelect={() => handleThemeChange("light")}><Sun className="mr-2 h-4 w-4" /> Light</CommandItem>
                      <CommandItem onSelect={() => handleThemeChange("dark")}><Moon className="mr-2 h-4 w-4" /> Dark</CommandItem>
                      <CommandItem onSelect={() => handleThemeChange("midnight-ocean")}><Waves className="mr-2 h-4 w-4" /> Midnight</CommandItem>
                      <CommandItem onSelect={() => handleThemeChange("system")}><Laptop className="mr-2 h-4 w-4" /> System</CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </nav>

        {/* Main Content Area */}
        <div className="relative z-10 container max-w-6xl mx-auto px-4 pt-10 pb-20 flex flex-col items-center justify-center min-h-[80vh]">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-16 space-y-6 max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              System Operational
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/50 pb-2">
              Welcome Back, Trader.
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Your analytics dashboard is ready. Dive into your performance data, identify your edge, and trade with confidence.
            </p>
          </motion.div>

          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl mb-12">
            {/* Dashboard Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              onHoverStart={() => setHoveredCard('dashboard')}
              onHoverEnd={() => setHoveredCard(null)}
              onClick={() => router.push('/dashboard')}
              className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 hover:bg-card hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-primary/5"
            >
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-6 w-6 -rotate-45 group-hover:rotate-0 transition-transform duration-300 text-primary" />
              </div>
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <LayoutDashboard className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Primary Dashboard</h3>
              <p className="text-muted-foreground">Access your main trading overview, P&L analysis, and performance metrics.</p>
            </motion.div>

            {/* Journal Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              onHoverStart={() => setHoveredCard('journal')}
              onHoverEnd={() => setHoveredCard(null)}
              onClick={() => router.push('/dashboard/journal')}
              className="group cursor-pointer relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-8 hover:bg-card hover:border-blue-500/50 transition-all duration-300 shadow-lg hover:shadow-blue-500/5"
            >
              <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-6 w-6 -rotate-45 group-hover:rotate-0 transition-transform duration-300 text-blue-500" />
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <LineChart className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">Trading Journal</h3>
              <p className="text-muted-foreground">Review your trade history, detailed notes, and AI-powered insights.</p>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Secure session active</span>
          </motion.div>

        </div>
      </div>
    )
  }

  // 2. Unauthenticated State - Login Form
  return (
    <div className="min-h-screen bg-background overflow-hidden relative">
      {/* Background Gradients for Login */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Theme Switcher */}
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
                  <CommandItem onSelect={() => handleThemeChange("light")}><Sun className="mr-2 h-4 w-4" /> Light</CommandItem>
                  <CommandItem onSelect={() => handleThemeChange("dark")}><Moon className="mr-2 h-4 w-4" /> Dark</CommandItem>
                  <CommandItem onSelect={() => handleThemeChange("midnight-ocean")}><Waves className="mr-2 h-4 w-4" /> Midnight</CommandItem>
                  <CommandItem onSelect={() => handleThemeChange("system")}><Laptop className="mr-2 h-4 w-4" /> System</CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        {/* Logo at top */}
        <div className="absolute top-8 left-8">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="w-10 h-10 fill-foreground" />
            <span className="text-foreground font-semibold text-lg">Deltalytix</span>
          </Link>
        </div>

        {/* Centered Authentication Form */}
        <div className="w-full max-w-md space-y-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col space-y-2 text-center"
          >
            <h1 className="text-4xl font-bold tracking-tight">
              Start Your Journey
            </h1>
            <p className="text-muted-foreground text-base">
              Enter your email to access your personalized trading dashboard
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <UserAuthForm />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
