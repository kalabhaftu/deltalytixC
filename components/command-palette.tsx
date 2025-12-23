'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
    Search,
    LayoutDashboard,
    FileText,
    BookOpen,
    Users,
    Table2,
    FlaskConical,
    BarChart3,
    Settings,
    Calendar,
    TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CommandItem {
    id: string
    title: string
    description: string
    icon: React.ElementType
    action: () => void
    keywords: string[]
}

export function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const router = useRouter()

    const commands: CommandItem[] = [
        {
            id: 'dashboard',
            title: 'Dashboard',
            description: 'Go to main dashboard',
            icon: LayoutDashboard,
            action: () => router.push('/dashboard'),
            keywords: ['home', 'main', 'widgets']
        },
        {
            id: 'reports',
            title: 'Reports',
            description: 'View yearly performance reports',
            icon: BarChart3,
            action: () => router.push('/dashboard/reports'),
            keywords: ['stats', 'analytics', 'yearly', 'performance']
        },
        {
            id: 'journal',
            title: 'Journal',
            description: 'Open trading journal',
            icon: BookOpen,
            action: () => router.push('/dashboard/journal'),
            keywords: ['notes', 'diary', 'log']
        },
        {
            id: 'accounts',
            title: 'Accounts',
            description: 'Manage trading accounts',
            icon: Users,
            action: () => router.push('/dashboard/accounts'),
            keywords: ['broker', 'prop firm']
        },
        {
            id: 'trades',
            title: 'Trades',
            description: 'View trade history table',
            icon: Table2,
            action: () => router.push('/dashboard/table'),
            keywords: ['history', 'list', 'executions']
        },
        {
            id: 'playbook',
            title: 'Playbook',
            description: 'Trading strategies and setups',
            icon: FileText,
            action: () => router.push('/dashboard/menu'),
            keywords: ['strategies', 'setups', 'rules']
        },
        {
            id: 'backtesting',
            title: 'Backtesting',
            description: 'Backtest your strategies',
            icon: FlaskConical,
            action: () => router.push('/dashboard/backtesting'),
            keywords: ['test', 'simulate', 'paper']
        },
        {
            id: 'settings',
            title: 'Settings',
            description: 'App settings and preferences',
            icon: Settings,
            action: () => router.push('/dashboard/settings'),
            keywords: ['preferences', 'config', 'options']
        },
        {
            id: 'calendar',
            title: 'Calendar View',
            description: 'Open calendar on dashboard',
            icon: Calendar,
            action: () => router.push('/dashboard'),
            keywords: ['dates', 'pnl', 'monthly']
        }
    ]

    const filteredCommands = search.trim() === ''
        ? commands
        : commands.filter(cmd =>
            cmd.title.toLowerCase().includes(search.toLowerCase()) ||
            cmd.description.toLowerCase().includes(search.toLowerCase()) ||
            cmd.keywords.some(k => k.toLowerCase().includes(search.toLowerCase()))
        )

    // Keyboard shortcut to open
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setIsOpen(true)
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Navigate with arrow keys
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(i => (i + 1) % filteredCommands.length)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(i => (i - 1 + filteredCommands.length) % filteredCommands.length)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (filteredCommands[selectedIndex]) {
                    filteredCommands[selectedIndex].action()
                    setIsOpen(false)
                    setSearch('')
                }
            } else if (e.key === 'Escape') {
                setIsOpen(false)
                setSearch('')
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, selectedIndex, filteredCommands])

    // Reset selection when search changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [search])

    const handleSelect = (command: CommandItem) => {
        command.action()
        setIsOpen(false)
        setSearch('')
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) setSearch('') }}>
            <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
                <div className="flex items-center border-b px-3">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        placeholder="Search pages, actions..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
                        autoFocus
                    />
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                        ESC
                    </kbd>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                    {filteredCommands.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            No results found
                        </div>
                    ) : (
                        filteredCommands.map((cmd, index) => {
                            const Icon = cmd.icon
                            return (
                                <button
                                    key={cmd.id}
                                    onClick={() => handleSelect(cmd)}
                                    className={cn(
                                        "flex items-center gap-3 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                                        index === selectedIndex
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-muted"
                                    )}
                                >
                                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{cmd.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
                                    </div>
                                </button>
                            )
                        })
                    )}
                </div>
                <div className="border-t px-3 py-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
                        navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd>
                        select
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">esc</kbd>
                        close
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    )
}
