'use client'

import { useSeasonalTheme } from '@/hooks/use-seasonal-theme'
import { Fireworks } from './fireworks'
import { Snow } from './snow'

export function SeasonalManager() {
    const theme = useSeasonalTheme()

    // Only render global background effects here.
    // Floating banners are removed for a cleaner "Pro" look.
    // Avatar badges are handled in Navbar.

    if (theme === 'NONE') return null

    return null
}
