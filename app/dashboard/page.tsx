'use client'

import NextDynamic from 'next/dynamic'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUserStore } from "@/store/user-store"
import { cn } from "@/lib/utils"

// Import components normally
import { DashboardErrorBoundary, ErrorBoundaryWrapper } from '@/components/error-boundary'

// Dynamically import heavy components for better performance
const WidgetCanvas = NextDynamic(() => import('./components/widget-canvas-with-drag'), {
  ssr: false
})

const EditModeControls = NextDynamic(() => import('./components/edit-mode-controls'), {
  ssr: false
})

// Accounts, Journal, Backtesting, and Table are now standalone routes
// They don't need to be imported here anymore

// Sidebar moved to layout.tsx - it now wraps all dashboard routes

// Dynamic imports for heavy dependencies
import { motion, AnimatePresence } from 'framer-motion'

function DashboardContent() {
  const mainRef = useRef<HTMLElement>(null)
  const searchParams = useSearchParams()

  // Simple user check
  const user = useUserStore(state => state.user)

  // Redirect old ?tab= URLs to new standalone routes (backwards compatibility)
  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab) {
      const routes: Record<string, string> = {
        'table': '/dashboard/table',
        'accounts': '/dashboard/accounts',
        'journal': '/dashboard/journal',
        'backtesting': '/dashboard/backtesting'
      }
      if (routes[tab]) {
        window.location.href = routes[tab]
      }
    }
  }, [searchParams])

  useEffect(() => {
    const updateNavbarHeight = () => {
      const navbar = document.querySelector('nav[class*="fixed"]') as HTMLElement
      if (navbar) {
        const height = navbar.offsetHeight
        document.documentElement.style.setProperty('--navbar-height', `${height}px`)
      }
    }

    // Initial calculation
    updateNavbarHeight()

    // Use ResizeObserver which is much more performant than MutationObserver for size changes
    const navbar = document.querySelector('nav[class*="fixed"]')
    let resizeObserver: ResizeObserver | null = null

    if (navbar) {
      resizeObserver = new ResizeObserver(() => {
        // Wrap in requestAnimationFrame to avoid "ResizeObserver loop limit exceeded"
        requestAnimationFrame(updateNavbarHeight)
      })
      resizeObserver.observe(navbar)
    }

    // Fallback window resize listener
    window.addEventListener('resize', updateNavbarHeight)
    
    return () => {
      window.removeEventListener('resize', updateNavbarHeight)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [])

  // Sidebar state management moved to sidebar-layout.tsx


  const pageVariants = {
    initial: { opacity: 0 },
    in: { opacity: 1 },
    out: { opacity: 0 }
  }

  const pageTransition = {
    type: 'tween',
    ease: 'easeInOut',
    duration: 0.2
  }

  // Main dashboard only renders widgets now
  // All other views (table, accounts, journal, backtesting) are standalone routes
  const renderContent = () => {
    return (
      <ErrorBoundaryWrapper context="Widgets">
        <motion.div
          key="widgets"
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          className="px-4"
        >
          <WidgetCanvas />
        </motion.div>
      </ErrorBoundaryWrapper>
    )
  }


  return (
    <DashboardErrorBoundary>
      <div className="flex flex-1 flex-col w-full">
        {/* Edit Mode Controls */}
        <EditModeControls />
        
        <AnimatePresence mode="wait" initial={false}>
          {renderContent()}
        </AnimatePresence>
      </div>
    </DashboardErrorBoundary>
  )
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  )
}