'use client'

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { UserAuthForm } from "../components/user-auth-form"
import { Logo } from "@/components/logo"
import { useAuth } from "@/context/auth-provider"

export default function AuthenticationPage() {
  const { isAuthenticated, isLoading, forceClearAuth } = useAuth()
  const router = useRouter()
  const [isProcessingLogout, setIsProcessingLogout] = useState(false)

  // Immediate check for logout parameter - handle this before any other logic
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('logout') === 'true' || urlParams.get('deleted') === 'true') {
      console.log('[AuthPage] Detected logout/deletion parameter, forcing clear')
      setIsProcessingLogout(true)
      forceClearAuth()
      // Clean the URL and reset processing state
      setTimeout(() => {
        window.history.replaceState({}, '', '/authentication')
        setIsProcessingLogout(false)
      }, 100)
      return
    }
  }, [forceClearAuth])

  // Check if user is already authenticated and redirect to dashboard
  useEffect(() => {
    // Skip this check if we're processing logout or have logout/deletion parameters
    const urlParams = new URLSearchParams(window.location.search)
    if (isProcessingLogout || urlParams.get('logout') === 'true' || urlParams.get('deleted') === 'true') {
      return
    }

    // Force a fresh auth check if coming from a potential logout/deletion
    const checkFreshAuth = async () => {
      if (isAuthenticated && !isLoading) {
        // Double-check auth status with a fresh API call
        try {
          const response = await fetch('/api/auth/check', {
            cache: 'no-cache',
            headers: { 'Cache-Control': 'no-cache' }
          })
          const data = await response.json()

          if (response.ok && data.authenticated) {
            // User is truly authenticated, redirect to dashboard
            const currentUrl = window.location.href
            const url = new URL(currentUrl)
            const nextParam = url.searchParams.get('next')
            const redirectUrl = nextParam || '/dashboard'
            router.push(redirectUrl)
          } else {
            // User is not truly authenticated, force clear auth state
            console.log('[Auth] User not authenticated, clearing local state')
            // Force refresh the auth provider state
            if (window.location.search.includes('deleted=true') || window.location.search.includes('logout=true')) {
              // If coming from account deletion or logout, force a complete session clear
              forceClearAuth()
              // Remove the parameter and reload
              window.location.replace('/authentication')
              return
            }
            // If not authenticated, the auth provider will handle the state update
          }
        } catch (error) {
          console.log('Auth check failed, staying on auth page')
          // If auth check fails, stay on auth page
        }
      }
    }

    checkFreshAuth()
  }, [isAuthenticated, isLoading, router, forceClearAuth, isProcessingLogout])

  // If user is authenticated and not processing logout, show loading state while redirecting
  if (isAuthenticated && !isLoading && !isProcessingLogout) {
    return (
      <div className="min-h-screen bg-background overflow-hidden">
        <div className="flex relative h-screen flex-col items-center justify-center bg-background">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-lg font-medium text-foreground">Redirecting to dashboard...</p>
            <p className="text-sm text-muted-foreground">You are already logged in</p>
          </div>
        </div>
      </div>
    )
  }

  // Theme is now handled by the root layout script, no client-side logic needed

  return (
    <div className="min-h-screen bg-background overflow-hidden">
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