'use client'

import { usePathname, useRouter } from 'next/navigation'
import { cn } from "@/lib/utils"
import { 
  LayoutDashboard, 
  Table, 
  Users, 
  BookOpen, 
  MoreHorizontal,
  FlaskConical
} from "lucide-react"

interface MobileNavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const mobileNavItems: MobileNavItem[] = [
  {
    id: 'widgets',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard'
  },
  {
    id: 'table',
    label: 'Trades',
    icon: Table,
    href: '/dashboard/table'
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: Users,
    href: '/dashboard/accounts'
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: BookOpen,
    href: '/dashboard/journal'
  },
  {
    id: 'more',
    label: 'More',
    icon: MoreHorizontal,
    href: '/dashboard/menu'
  }
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const getActiveTab = () => {
    if (pathname === '/dashboard') return 'widgets'
    if (pathname?.startsWith('/dashboard/table')) return 'table'
    if (pathname?.startsWith('/dashboard/accounts')) return 'accounts'
    if (pathname?.startsWith('/dashboard/journal')) return 'journal'
    if (pathname?.startsWith('/dashboard/menu')) return 'more'
    if (pathname?.startsWith('/dashboard/backtesting')) return 'more'
    if (pathname?.startsWith('/dashboard/prop-firm')) return 'more'
    if (pathname?.startsWith('/dashboard/data')) return 'more'
    if (pathname?.startsWith('/dashboard/settings')) return 'more'
    return null
  }

  const activeTab = getActiveTab()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {mobileNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 px-1 rounded-lg transition-all duration-200",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[10px] mt-0.5 font-medium truncate",
                isActive && "text-primary"
              )}>
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// Wrapper component for pages that should have bottom nav padding on mobile
export function MobileNavPadding({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* Padding for mobile bottom nav */}
      <div className="h-20 md:hidden" />
    </>
  )
}

