'use client'

import Link from "next/link"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Moon, LogOut, ArrowRight, LayoutDashboard, LineChart, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useAuth } from "@/context/auth-provider"
import { signOut } from "@/server/auth"
import { UserAuthForm } from "@/components/user-auth-form"

export default function RootPage() {
  const { isAuthenticated, isLoading, forceClearAuth } = useAuth()
  const router = useRouter()
  const [isProcessingLogout, setIsProcessingLogout] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    setIsClient(true)
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



  // --- RENDERING ---

  // 1. Authenticated State - Immediate Redirect
  if (isAuthenticated && !isLoading && !isProcessingLogout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Redirecting to dashboard...</p>
        </motion.div>
      </div>
    )
  }

  // 2. Unauthenticated State - Minimalist Login
  return (
    <div className="min-h-screen bg-background overflow-hidden relative flex flex-col items-center justify-center selection:bg-primary/30">
      
      {/* Subtle Background Prism/Aura */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-chart-1/5 rounded-full blur-[120px]" />
      </div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[400px] relative z-10 px-6"
      >
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-8"
          >
            <Logo className="w-14 h-14 fill-white" />
          </motion.div>
          
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-heading-text">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your trading terminal
            </p>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="bg-card/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl"
        >
          <UserAuthForm />
        </motion.div>

        {/* Minimal Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1 }}
          className="mt-12 flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-4">
             <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-foreground transition-colors h-8 text-[11px] uppercase tracking-widest font-medium"
                disabled
              >
                <Moon className="h-3 w-3 mr-2" />
                Dark
             </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] font-medium">
            &copy; {new Date().getFullYear()} Deltalytix &bull; Secure Terminal
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
