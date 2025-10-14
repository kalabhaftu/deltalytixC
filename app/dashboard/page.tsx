'use client'

// Force dynamic rendering for this client component
// Note: ISR (revalidate) only works with Server Components in Next.js 15
export const dynamic = 'force-dynamic'

import NextDynamic from 'next/dynamic'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUserStore } from "@/store/user-store"
import { cn } from "@/lib/utils"

// Import components normally
import { DashboardErrorBoundary, ErrorBoundaryWrapper } from '@/components/error-boundary'
import { TemplateProvider } from '@/context/template-provider'

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

const TemplateSelector = NextDynamic(() => import('./components/template-selector'), {
  ssr: false
})

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
    let timeoutId: NodeJS.Timeout

    const calculateHeight = () => {
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Debounce the calculation to account for animations
      timeoutId = setTimeout(() => {
        // Get navbar height - it's fixed at the top
        const navbar = document.querySelector('nav[class*="fixed"]') as HTMLElement
        const navbarHeight = navbar?.offsetHeight || 64 // Updated fallback to match new navbar height

        // Set CSS custom property for navbar height
        document.documentElement.style.setProperty('--navbar-height', `${navbarHeight}px`)
      }, 100) // Small delay to account for animation
    }

    // Calculate on mount
    calculateHeight()

    // Recalculate on window resize
    window.addEventListener('resize', calculateHeight)
    
    // Create a ResizeObserver to watch for navbar height changes (when filters appear/disappear)
    const resizeObserver = new ResizeObserver(calculateHeight)
    const navbar = document.querySelector('nav[class*="fixed"]')
    
    if (navbar) {
      resizeObserver.observe(navbar)
    }

    // Create a MutationObserver to watch for DOM changes when ActiveFilterTags appear/disappear
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Check if filter tags were added or removed
        if (mutation.type === 'childList') {
          const hasFilterTags = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node as Element).classList?.contains('border-t')
          ) || Array.from(mutation.removedNodes).some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            (node as Element).classList?.contains('border-t')
          )
          
          if (hasFilterTags) {
            calculateHeight()
          }
        }
      })
    })

    // Observe the navbar for DOM changes
    if (navbar) {
      mutationObserver.observe(navbar, {
        childList: true,
        subtree: true
      })
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', calculateHeight)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      if (timeoutId) {
        clearTimeout(timeoutId)
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
      <TemplateProvider>
        <div className="flex flex-1 flex-col w-full -mt-10">
          {/* Template Selector - Below navbar */}
          <TemplateSelector />
          
          {/* Edit Mode Controls */}
          <EditModeControls />
          
          <AnimatePresence mode="wait" initial={false}>
            {renderContent()}
          </AnimatePresence>
        </div>
      </TemplateProvider>
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