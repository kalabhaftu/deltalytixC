'use client'

import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
    className?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-16 px-4 text-center",
            className
        )}>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction} className="gap-2">
                    {actionLabel}
                </Button>
            )}
        </div>
    )
}

// Skeleton loading components for consistent loading states
export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn(
            "rounded-xl border border-border/50 bg-card/30 p-4",
            className
        )}>
            <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                </div>
            </div>
        </div>
    )
}

export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
    return (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} className="h-24" />
            ))}
        </div>
    )
}

export function SkeletonChart({ className }: { className?: string }) {
    return (
        <div className={cn(
            "rounded-xl border border-border/50 bg-card/30 p-6",
            className
        )}>
            <div className="h-4 w-32 bg-muted animate-pulse rounded mb-4" />
            <div className="h-48 bg-muted/50 animate-pulse rounded-lg" />
        </div>
    )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
    return (
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
            <div className="h-12 bg-muted/30 border-b border-border/50" />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-14 border-b border-border/30 flex items-center px-4 gap-4">
                    <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-16 bg-muted animate-pulse rounded flex-1" />
                    <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                </div>
            ))}
        </div>
    )
}
