'use client'

import { useEffect, useCallback } from 'react'
import confetti from 'canvas-confetti'

export function Fireworks() {
    const triggerFireworks = useCallback(() => {
        const duration = 15 * 1000
        const animationEnd = Date.now() + duration
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 }

        const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min
        }

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
                return clearInterval(interval)
            }

            const particleCount = 50 * (timeLeft / duration)

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            })
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            })
        }, 250)

        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        triggerFireworks()
    }, [triggerFireworks])

    return null // Canvas is inserted by the library
}
