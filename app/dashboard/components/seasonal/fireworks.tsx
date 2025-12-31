'use client'

import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import { usePathname } from 'next/navigation'

export function Fireworks() {
    const pathname = usePathname()

    // Only run on the main dashboard page to avoid annoyance
    const isDashboard = pathname === '/dashboard'

    // High-quality "Real" look from docs
    const fireOne = () => {
        const count = 200;
        const defaults = {
            origin: { y: 0.7 }
        };

        function fire(particleRatio: number, opts: any) {
            confetti({
                ...defaults,
                ...opts,
                particleRatio,
                particleCount: Math.floor(count * particleRatio)
            });
        }

        fire(0.25, {
            spread: 26,
            startVelocity: 55,
        });
        fire(0.2, {
            spread: 60,
        });
        fire(0.35, {
            spread: 100,
            decay: 0.91,
            scalar: 0.8
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 25,
            decay: 0.92,
            scalar: 1.2
        });
        fire(0.1, {
            spread: 120,
            startVelocity: 45,
        });
    }

    useEffect(() => {
        if (!isDashboard) return

        // Fire a single burst on mount after a slight delay
        const t = setTimeout(() => {
            fireOne();
        }, 500)

        return () => clearTimeout(t)
    }, [isDashboard])

    return null
}
