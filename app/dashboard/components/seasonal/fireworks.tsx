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

            // Since particles fall down, start a bit higher than random
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
    }, [])

    // Realistic Fireworks Effect
    const realisticFireworks = useCallback(() => {
        const duration = 15 * 1000
        const animationEnd = Date.now() + duration

        const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

        const interval: any = setInterval(function () {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
                return clearInterval(interval)
            }

            const particleCount = 50 * (timeLeft / duration)

            // Random bursts
            confetti({
                startVelocity: 30,
                spread: 360,
                ticks: 60,
                zIndex: 50,
                particleCount: Math.floor(particleCount * 0.5),
                origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
                colors: ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee']
            })
        }, 800) // Slower bursts

        return () => clearInterval(interval)
    }, [])

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
        // Fire a burst on mount
        fireOne();

        // Then occasional random bursts
        const i = setInterval(() => {
            if (Math.random() > 0.7) fireOne();
        }, 3000)

        return () => clearInterval(i)
    }, [])

    return null
}
