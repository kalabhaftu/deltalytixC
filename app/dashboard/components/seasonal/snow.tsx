'use client'

import { useEffect, useState } from 'react'

export function Snow() {
    const [snowflakes, setSnowflakes] = useState<number[]>([])

    useEffect(() => {
        // Generate 50 snowflakes
        setSnowflakes(Array.from({ length: 50 }).map((_, i) => i))
    }, [])

    return (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
            {snowflakes.map((i) => (
                <div
                    key={i}
                    className="absolute top-[-10px] text-white animate-fall opacity-70"
                    style={{
                        left: `${Math.random() * 100}vw`,
                        animationDuration: `${Math.random() * 5 + 5}s`,
                        animationDelay: `${Math.random() * 5}s`,
                        fontSize: `${Math.random() * 10 + 10}px`,
                    }}
                >
                    ❄
                </div>
            ))}
            <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) translateX(0);
          }
          100% {
            transform: translateY(105vh) translateX(20px);
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
      `}</style>
        </div>
    )
}
