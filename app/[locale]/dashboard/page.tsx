'use client'

import { TradeTableReview } from './components/tables/trade-table-review'
import { AccountsOverview } from './components/accounts/accounts-overview-simple'
import { AnalysisOverview } from './components/analysis/analysis-overview'
import WidgetCanvas from './components/widget-canvas'
import dynamic from 'next/dynamic'

// Dynamically import accounts page for better performance
const AccountsPage = dynamic(() => import('./accounts/page'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary shadow-lg"></div>
    </div>
  )
})
import { useEffect, useRef, useState } from 'react'
import { useI18n } from "@/locales/client"
import { DashboardErrorBoundary, ErrorBoundaryWrapper } from '@/components/error-boundary'
import { DashboardSidebar } from './components/sidebar/dashboard-sidebar'
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from 'framer-motion'

export default function Home() {
  const t = useI18n()
  const mainRef = useRef<HTMLElement>(null)
  const [activeTab, setActiveTab] = useState('widgets')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

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

  // Check if mobile and load sidebar state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Load sidebar state from localStorage after hydration
    const savedCollapsed = localStorage.getItem('dashboard-sidebar-collapsed')
    if (savedCollapsed) {
      try {
        setSidebarCollapsed(JSON.parse(savedCollapsed))
      } catch (error) {
        console.warn('Failed to parse sidebar state:', error)
        setSidebarCollapsed(false)
      }
    }
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 }
  }

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'table':
        return (
          <ErrorBoundaryWrapper context="TradeTable">
            <motion.div
              key="table"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full"
            >
              <TradeTableReview />
            </motion.div>
          </ErrorBoundaryWrapper>
        )
      case 'accounts':
        return (
          <ErrorBoundaryWrapper context="Accounts">
            <motion.div
              key="accounts"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="w-full"
            >
              <AccountsPage />
            </motion.div>
          </ErrorBoundaryWrapper>
        )
      case 'analysis':
        return (
          <ErrorBoundaryWrapper context="Analysis">
            <motion.div
              key="analysis"
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
              className="px-4"
            >
              <AnalysisOverview />
            </motion.div>
          </ErrorBoundaryWrapper>
        )
      case 'widgets':
      default:
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
  }

  return (
    <DashboardErrorBoundary>
      <div className="flex w-full min-h-screen bg-gradient-to-br from-background via-background to-background/95">
        {/* Sidebar */}
        <DashboardSidebar 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          onCollapsedChange={setSidebarCollapsed}
        />
        
        {/* Main Content */}
        <motion.main 
          ref={mainRef} 
          className={cn(
            "flex-1 transition-all duration-300 ease-in-out relative",
            isMobile ? "ml-0" : sidebarCollapsed ? "ml-16" : "ml-64"
          )}
          style={{ 
            paddingTop: `var(--navbar-height, 64px)`,
            minHeight: `calc(100vh - var(--navbar-height, 64px))`
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-1 flex-col w-full backdrop-blur-sm">
            <AnimatePresence mode="wait">
              {renderContent()}
            </AnimatePresence>
          </div>
        </motion.main>
      </div>
    </DashboardErrorBoundary>
  )
}