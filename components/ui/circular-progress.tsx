'use client'

import React from 'react'
import { cn, formatPercent } from '@/lib/utils'

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  showPercentage?: boolean
  color?: string
  backgroundColor?: string
  type?: 'circle' | 'gauge' // Add gauge type
}

export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 8,
  className,
  showPercentage = true,
  color = 'hsl(var(--primary))',
  backgroundColor = 'hsl(var(--muted))',
  type = 'gauge' // Default to gauge
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const isGauge = type === 'gauge'

  // For gauge: semi-circle (180 degrees)
  // For circle: full circle (360 degrees)
  const circumference = isGauge ? radius * Math.PI : radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={isGauge ? size / 2 + strokeWidth : size}
        className={cn(isGauge ? '' : 'transform -rotate-90')}
        viewBox={`0 0 ${size} ${isGauge ? size / 2 + strokeWidth : size}`}
      >
        {/* Background arc/circle */}
        <path
          d={isGauge
            ? `M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`
            : `M ${size / 2} ${strokeWidth / 2} A ${radius} ${radius} 0 1 1 ${size / 2} ${size - strokeWidth / 2} A ${radius} ${radius} 0 1 1 ${size / 2} ${strokeWidth / 2}`
          }
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        {/* Progress arc/circle */}
        <path
          d={isGauge
            ? `M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`
            : `M ${size / 2} ${strokeWidth / 2} A ${radius} ${radius} 0 1 1 ${size / 2} ${size - strokeWidth / 2} A ${radius} ${radius} 0 1 1 ${size / 2} ${strokeWidth / 2}`
          }
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      {showPercentage && (
        <div className={cn(
          "absolute flex items-center justify-center",
          isGauge ? "bottom-0 left-0 right-0" : "inset-0"
        )}>
          <span className="text-sm font-semibold text-foreground">
            {formatPercent(value, 1)}
          </span>
        </div>
      )}
    </div>
  )
}
