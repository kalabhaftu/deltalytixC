import { useMemo } from 'react'

export type SeasonalTheme = 'NEW_YEAR' | 'CHRISTMAS' | 'HALLOWEEN' | 'VALENTINES' | 'NONE'

export function useSeasonalTheme(): SeasonalTheme {
    const theme = useMemo(() => {
        const now = new Date()
        const month = now.getMonth() // 0-11
        const day = now.getDate()

        // New Year: Dec 31 - Jan 1
        if ((month === 11 && day === 31) || (month === 0 && day === 1)) {
            return 'NEW_YEAR'
        }

        // Christmas: Dec 20 - Dec 26
        if (month === 11 && day >= 20 && day <= 26) {
            return 'CHRISTMAS'
        }

        // Halloween: Oct 30 - Oct 31
        if (month === 9 && day >= 30) {
            return 'HALLOWEEN'
        }

        // Valentines: Feb 14
        if (month === 1 && day === 14) {
            return 'VALENTINES'
        }

        return 'NONE'
    }, [])

    return theme
}
