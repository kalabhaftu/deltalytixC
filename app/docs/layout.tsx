'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from '@/components/logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Home, Search, Menu, ChevronRight, Book, Rocket, Code, FileText, Terminal, Database as DatabaseIcon, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

const navigation = [
  {
    title: 'Getting Started',
    icon: Rocket,
    items: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quick Start', href: '/docs/getting-started' },
    ],
  },
  {
    title: 'Features',
    icon: Book,
    items: [
      { title: 'Trade Import', href: '/docs/features/importing' },
      { title: 'Dashboard', href: '/docs/features/dashboard' },
      { title: 'Prop Firm Tracking', href: '/docs/features/prop-firm' },
    ],
  },
  {
    title: 'For Developers',
    icon: Code,
    items: [
      { title: 'Architecture', href: '/docs/for-developers/architecture' },
      { title: 'Database Schema', href: '/docs/for-developers/database' },
    ],
  },
]

function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <div className={cn("space-y-6 py-6", className)}>
      {navigation.map((section) => (
        <div key={section.title}>
          <h4 className="mb-3 px-3 text-sm font-semibold flex items-center gap-2 text-foreground">
            <section.icon className="h-4 w-4 text-primary" />
            {section.title}
          </h4>
          <div className="space-y-1">
            {section.items.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center rounded-md px-3 py-2 text-sm transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.title}
                  {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-6">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 pr-0">
              <div className="pr-6">
                <Link href="/" className="flex items-center gap-2 mb-6">
                  <Logo className="w-7 h-7 fill-foreground" />
                  <span className="font-semibold text-lg">Deltalytix</span>
                </Link>
                <Sidebar />
              </div>
            </SheetContent>
          </Sheet>

          <Link href="/" className="flex items-center gap-2">
            <Logo className="w-7 h-7 fill-foreground" />
            <span className="font-semibold text-lg hidden sm:inline">Deltalytix</span>
            <Badge variant="outline" className="ml-2 hidden sm:inline-flex">Docs</Badge>
          </Link>

          <div className="flex-1 max-w-md ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                className="pl-10 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Button asChild variant="ghost" size="sm" className="h-9">
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </Button>
        </div>
      </header>

      <div className="container px-6">
        <div className="flex-1 items-start md:grid md:grid-cols-[260px_minmax(0,1fr)] md:gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12 py-8">
          {/* Desktop Sidebar */}
          <aside className="fixed top-16 z-30 hidden h-[calc(100vh-4rem)] w-[260px] lg:w-[280px] shrink-0 overflow-y-auto md:sticky md:block border-r pr-6">
            <Sidebar />
          </aside>

          {/* Main Content */}
          <main className="relative lg:gap-10">
            <div className="mx-auto w-full min-w-0">
              <div className="prose prose-slate dark:prose-invert max-w-none
                prose-headings:scroll-mt-20
                prose-headings:font-bold
                prose-h1:text-4xl
                prose-h1:border-b
                prose-h1:pb-4
                prose-h1:mb-8
                prose-h2:text-3xl
                prose-h2:mt-12
                prose-h2:mb-6
                prose-h2:border-b
                prose-h2:pb-3
                prose-h3:text-2xl
                prose-h3:mt-10
                prose-h3:mb-4
                prose-h4:text-xl
                prose-h4:mt-8
                prose-h4:mb-3
                prose-p:text-muted-foreground
                prose-p:leading-7
                prose-p:my-4
                prose-li:text-muted-foreground
                prose-li:leading-7
                prose-li:my-2
                prose-ul:my-6
                prose-ol:my-6
                prose-code:bg-accent/50
                prose-code:border
                prose-code:px-2
                prose-code:py-1
                prose-code:rounded-md
                prose-code:text-sm
                prose-code:font-mono
                prose-code:text-foreground
                prose-code:before:content-['']
                prose-code:after:content-['']
                prose-pre:bg-accent/30
                prose-pre:border-2
                prose-pre:border-border
                prose-pre:rounded-lg
                prose-pre:p-4
                prose-pre:my-6
                prose-pre:overflow-x-auto
                prose-a:text-primary
                prose-a:no-underline
                prose-a:font-medium
                hover:prose-a:underline
                prose-strong:text-foreground
                prose-strong:font-semibold
                prose-img:rounded-lg
                prose-img:border
                prose-img:my-8
                prose-table:border
                prose-table:my-8
                prose-th:bg-accent
                prose-th:font-semibold
                prose-th:p-3
                prose-td:p-3
                prose-blockquote:border-l-4
                prose-blockquote:border-primary
                prose-blockquote:pl-4
                prose-blockquote:italic
                prose-blockquote:text-muted-foreground
                prose-hr:my-12
                prose-hr:border-border"
              >
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
