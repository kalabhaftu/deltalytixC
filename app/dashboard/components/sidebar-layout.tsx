'use client'

import { useState, useEffect, ReactNode } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { DashboardSidebar } from './sidebar/dashboard-sidebar'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface SidebarLayoutProps {
  children: ReactNode
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Determine active tab from URL
  const getActiveTab = () => {
    // Check for tab query param first (for backwards compatibility with /dashboard?tab=table)
    const tabParam = searchParams?.get('tab')
    if (tabParam) return tabParam

    // Determine from pathname - all main tabs are now standalone routes
    if (pathname === '/dashboard') return 'widgets'
    if (pathname?.startsWith('/dashboard/table')) return 'table'
    if (pathname?.startsWith('/dashboard/accounts')) return 'accounts'
    if (pathname?.startsWith('/dashboard/journal')) return 'journal'
    if (pathname?.startsWith('/dashboard/backtesting')) return 'backtesting'
    
    // For other routes (settings, data, prop-firm), return null to show no active tab
    return null
  }

  const activeTab = getActiveTab()

  // Handle tab navigation - all use direct routes (clean URLs)
  const handleTabChange = (tab: string) => {
    const tabRoutes: Record<string, string> = {
      'widgets': '/dashboard',
      'table': '/dashboard/table',
      'accounts': '/dashboard/accounts',
      'journal': '/dashboard/journal',
      'backtesting': '/dashboard/backtesting'
    }
    
    router.push(tabRoutes[tab] || '/dashboard')
  }

  // Check if mobile and load sidebar state
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)

    // Load sidebar state from localStorage only after client-side mount
    if (typeof window !== 'undefined') {
      const savedCollapsed = localStorage.getItem('dashboard-sidebar-collapsed')
      if (savedCollapsed) {
        try {
          setSidebarCollapsed(JSON.parse(savedCollapsed))
        } catch (error) {
          setSidebarCollapsed(false)
        }
      }
    }
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className="flex w-full min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab || 'widgets'}
        onTabChange={handleTabChange}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Main Content */}
      <motion.main
        className={cn(
          "flex-1 transition-all duration-300 ease-in-out relative",
          isMobile ? "ml-0" : sidebarCollapsed ? "ml-16" : "ml-64"
        )}
        style={{
          paddingTop: `var(--navbar-height, 48px)`,
          minHeight: `calc(100vh - var(--navbar-height, 48px))`
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {children}
      </motion.main>
    </div>
  )
}

