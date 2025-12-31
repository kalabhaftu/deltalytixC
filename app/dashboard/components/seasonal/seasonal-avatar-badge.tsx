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

    // Configuration for different themes
    const config = {
        NEW_YEAR: {
            gradient: "from-yellow-400 via-amber-500 to-yellow-600",
            badge: "✨",
            shadow: "shadow-amber-500/20",
            animationDuration: 3
        },
        CHRISTMAS: {
            gradient: "from-red-500 via-green-500 to-red-600",
            badge: "🎄",
            shadow: "shadow-green-500/20",
            animationDuration: 4
        },
        HALLOWEEN: {
            gradient: "from-orange-500 via-purple-600 to-orange-500",
            badge: "🎃",
            shadow: "shadow-orange-500/20",
            animationDuration: 3
        },
        VALENTINES: {
            gradient: "from-pink-500 via-red-500 to-pink-500",
            badge: "❤️",
            shadow: "shadow-pink-500/20",
            animationDuration: 3
        }
    }

    const currentConfig = config[theme as keyof typeof config]

    if (!currentConfig) return <>{children}</>

    return (
        <div className={cn("relative inline-block", className)}>
            {/* Animated Gradient Ring */}
            <motion.div
                className={cn(
                    "absolute -inset-[2px] rounded-full bg-gradient-to-r opacity-75 blur-[1px]",
                    currentConfig.gradient,
                    currentConfig.shadow
                )}
                animate={{
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                    duration: currentConfig.animationDuration,
                    repeat: Infinity,
                    ease: "linear"
                }}
                style={{ backgroundSize: "200% 200%" }}
            />

            {/* The Avatar itself */}
            <div className="relative">
                {children}
            </div>

            {/* Status Badge */}
            <motion.div
                className="absolute -bottom-1 -right-1 h-5 w-5 bg-background rounded-full flex items-center justify-center text-[10px] border-[1.5px] border-background shadow-sm z-10"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
                <span role="img" aria-label={theme}>{currentConfig.badge}</span>
            </motion.div>
        </div>
    )
}
