'use client'

import { useState, useEffect } from 'react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useI18n } from "@/locales/client"
import { 
  LayoutDashboard, 
  Table, 
  Users, 
  BarChart3, 
  Shield,
  ChevronLeft, 
  ChevronRight,
  Menu
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

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
  translationKey: string
}

const navigationItems: NavigationItem[] = [
  {
    id: 'widgets',
    label: 'Widgets',
    icon: LayoutDashboard,
    translationKey: 'dashboard.tabs.widgets'
  },
  {
    id: 'table',
    label: 'Table',
    icon: Table,
    translationKey: 'dashboard.tabs.table'
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: Users,
    translationKey: 'dashboard.tabs.accounts'
  },
  {
    id: 'prop-firm',
    label: 'Prop Firm',
    icon: Shield,
    translationKey: 'propFirm.title'
  },
  {
    id: 'analysis',
    label: 'Analysis',
    icon: BarChart3,
    translationKey: 'dashboard.tabs.analysis'
  }
]

export function DashboardSidebar({ activeTab, onTabChange, onCollapsedChange, className }: SidebarProps) {
  const t = useI18n()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load saved state from localStorage after hydration
  useEffect(() => {
    const savedState = localStorage.getItem('dashboard-sidebar-collapsed')
    if (savedState) {
      setIsCollapsed(JSON.parse(savedState))
    }
    setIsHydrated(true)
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
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <TooltipProvider key={item.id}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start transition-all duration-200",
                      isCollapsed && !isMobile ? "px-2" : "px-3",
                      isActive && "bg-secondary text-secondary-foreground"
                    )}
                    onClick={() => onTabChange(item.id)}
                  >
                    <Icon className={cn(
                      "h-5 w-5 shrink-0",
                      isCollapsed && !isMobile ? "mr-0" : "mr-3"
                    )} />
                    {(!isCollapsed || isMobile) && (
                      <span className="truncate">{(t as any)(item.translationKey)}</span>
                    )}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && !isMobile && (
                  <TooltipContent side="right" className="font-medium">
                    {(t as any)(item.translationKey)}
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </nav>

      {/* Collapse Toggle - Desktop Only */}
      {!isMobile && (
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn(
              "w-full transition-all duration-200",
              isCollapsed ? "px-2" : "px-3"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span className="text-sm">Collapse</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )

  // Mobile sidebar with sheet
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-20 left-4 z-50 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <NavigationContent />
        </SheetContent>
      </Sheet>
    )
  }

  // Desktop sidebar
  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-30 h-full bg-background border-r transition-all duration-300 ease-in-out",
        // Prevent layout shift during hydration
        !isHydrated ? "w-64" : isCollapsed ? "w-16" : "w-64",
        className
      )}
      style={{ 
        top: 'var(--navbar-height, 56px)',
        height: 'calc(100vh - var(--navbar-height, 56px))'
      }}
    >
      <NavigationContent />
    </div>
  )
}
