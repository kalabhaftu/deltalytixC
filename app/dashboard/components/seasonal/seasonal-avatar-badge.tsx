'use client'

import { useSeasonalTheme } from '@/hooks/use-seasonal-theme'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface SeasonalAvatarBadgeProps {
    children: React.ReactNode
    className?: string
}

export function SeasonalAvatarBadge({ children, className }: SeasonalAvatarBadgeProps) {
    const theme = useSeasonalTheme()

    if (theme === 'NONE') {
        return <>{children}</>
    }

    return (
        <div className={cn("relative inline-block", className)}>
            {theme === 'NEW_YEAR' && (
                <motion.div
                    className="absolute -top-4 -right-1 z-20 pointer-events-none"
                    initial={{ rotate: -10, y: -5 }}
                    animate={{ rotate: 0, y: 0 }}
                    transition={{ duration: 0.5, type: 'spring' }}
                >
                    {/* Party Hat SVG */}
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                        <path d="M12 2L2 22H22L12 2Z" fill="#F59E0B" />
                        <circle cx="12" cy="2" r="2" fill="#EF4444" />
                        <path d="M6 14L4 18H8L6 14Z" fill="#3B82F6" />
                        <path d="M18 14L16 18H20L18 14Z" fill="#10B981" />
                        <path d="M12 12L10 16H14L12 12Z" fill="#EF4444" />
                    </svg>
                </motion.div>
            )}

            {theme === 'CHRISTMAS' && (
                <motion.div
                    className="absolute -top-3 -right-2 z-20 pointer-events-none"
                    initial={{ rotate: 10, y: -5 }}
                    animate={{ rotate: 0, y: 0 }}
                >
                    {/* Santa Hat SVG */}
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                        <path d="M12 4C8 4 5 8 5 12V16H19V12C19 8 16 4 12 4Z" fill="#EF4444" />
                        <rect x="4" y="16" width="16" height="4" rx="2" fill="white" />
                        <circle cx="12" cy="2" r="2" fill="white" />
                    </svg>
                </motion.div>
            )}

            {children}
        </div>
    )
}
