'use client'

import { useState, useEffect } from 'react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import {
  LayoutDashboard,
  Table,
  Users,
  BarChart3,
  Shield,
  BookOpen,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Menu,
  Sun,
  Moon,
  Laptop,
  Waves,
  FlaskConical,
  MenuSquare
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion } from "framer-motion"
import { useTheme } from "next-themes"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  onCollapsedChange?: (collapsed: boolean) => void
  className?: string
}

interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navigationItems: NavigationItem[] = [
  {
    id: 'widgets',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    id: 'table',
    label: 'Table',
    icon: Table
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: Users
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: BookOpen
  },
  {
    id: 'backtesting',
    label: 'Backtesting',
    icon: FlaskConical
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: MenuSquare
  },
]

export function DashboardSidebar({ activeTab, onTabChange, onCollapsedChange, className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedState = localStorage.getItem('dashboard-sidebar-collapsed')
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState))
    }
    setIsHydrated(true)
    setMounted(true)
  }, [])

  // Save state to localStorage and notify parent (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('dashboard-sidebar-collapsed', JSON.stringify(isCollapsed))
      onCollapsedChange?.(isCollapsed)
    }
  }, [isCollapsed, onCollapsedChange, isHydrated])

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed)
  }

  const NavigationContent = () => (
    <div className="flex flex-col h-full">
      {/* Navigation Items */}
      <nav className="flex-1 space-y-2 p-4">
        {navigationItems.map((item, index) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <TooltipProvider key={item.id}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start transition-all duration-300 ease-out group",
                        isCollapsed && !isMobile ? "px-2" : "px-3",
                        isMobile ? "h-12 text-base" : "h-10",
                        isActive 
                          ? "bg-muted text-foreground shadow-lg scale-[1.02]" 
                          : "hover:bg-muted/50 hover:shadow-md hover:scale-[1.02] hover:translate-x-1"
                      )}
                      onClick={() => {
                        onTabChange(item.id)
                        // Close mobile sheet when navigation item is selected
                        if (isMobile) {
                          setIsSheetOpen(false)
                        }
                      }}
                    >
                      <Icon className={cn(
                        "h-5 w-5 shrink-0 transition-all duration-300",
                        isCollapsed && !isMobile ? "mr-0" : "mr-3",
                        isActive 
                          ? "scale-110 text-foreground" 
                          : "text-muted-foreground group-hover:scale-110 group-hover:text-foreground"
                      )} />
                      {(!isCollapsed || isMobile) && (
                        <span className="truncate font-medium">{item.label}</span>
                      )}
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                {isCollapsed && !isMobile && (
                  <TooltipContent side="right" className="font-medium bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl">
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </nav>

      {/* Theme Switcher - Mobile Only */}
      {isMobile && mounted && (
        <div className="p-4 border-t border-border/50">
          <div className="text-xs font-semibold text-muted-foreground mb-2 px-3">Theme</div>
          <div className="space-y-1">
            <Button
              variant={theme === 'light' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setTheme('light')}
            >
              <Sun className="h-4 w-4 mr-3" />
              <span className="font-medium">Light</span>
            </Button>
            <Button
              variant={theme === 'dark' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setTheme('dark')}
            >
              <Moon className="h-4 w-4 mr-3" />
              <span className="font-medium">Dark</span>
            </Button>
            <Button
              variant={theme === 'midnight-ocean' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setTheme('midnight-ocean')}
            >
              <Waves className="h-4 w-4 mr-3" />
              <span className="font-medium">Midnight Ocean</span>
            </Button>
            <Button
              variant={theme === 'system' ? 'secondary' : 'ghost'}
              size="sm"
              className="w-full justify-start"
              onClick={() => setTheme('system')}
            >
              <Laptop className="h-4 w-4 mr-3" />
              <span className="font-medium">System</span>
            </Button>
          </div>
        </div>
      )}

      {/* Collapse Toggle - Desktop Only */}
      {!isMobile && (
        <motion.div 
          className="p-4 border-t border-border/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn(
              "w-full transition-all duration-300 hover:bg-muted/50 hover:shadow-md",
              isCollapsed ? "px-2" : "px-3"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 transition-transform duration-300 hover:scale-110" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2 transition-transform duration-300 hover:scale-110" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </Button>
        </motion.div>
      )}
    </div>
  )

  // Mobile sidebar - hidden since we use bottom nav
  // Keep the sheet available for additional menu items if needed in the future
  if (isMobile) {
    return null
  }

  // Desktop sidebar
  return (
    <motion.div
      className={cn(
        "fixed left-0 top-0 z-30 h-full bg-background/95 backdrop-blur-xl border-r border-border/50 shadow-xl transition-all duration-300 ease-in-out",
        // Prevent layout shift during hydration
        !isHydrated ? "w-64" : isCollapsed ? "w-16" : "w-64",
        className
      )}
      style={{ 
        top: 'var(--navbar-height, 56px)',
        height: 'calc(100vh - var(--navbar-height, 56px))'
      }}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <NavigationContent />
    </motion.div>
  )
}