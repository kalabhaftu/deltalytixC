'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Smiley,
  SmileySad,
  SmileyMeh,
  Lightning,
  Brain,
  Warning,
  TrendUp,
  TrendDown,
  Target,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Coffee,
  Flame,
  CloudRain,
  Sun
} from "@phosphor-icons/react"

export type EmotionType =
  | 'confident'
  | 'anxious'
  | 'focused'
  | 'energetic'
  | 'calm'
  | 'frustrated'
  | 'optimistic'
  | 'pessimistic'
  | 'disciplined'
  | 'impulsive'
  | 'happy'
  | 'sad'
  | 'neutral'
  | 'tired'
  | 'excited'
  | 'stressed'
  | 'relaxed'

export interface Emotion {
  id: EmotionType
  label: string
  icon: any
  color: string
}

export const emotions: Emotion[] = [
  { id: 'confident', label: 'Confident', icon: TrendUp, color: 'text-long' },
  { id: 'anxious', label: 'Anxious', icon: Warning, color: 'text-chart-4' },
  { id: 'focused', label: 'Focused', icon: Brain, color: 'text-chart-1' },
  { id: 'energetic', label: 'Energetic', icon: Lightning, color: 'text-warning' },
  { id: 'calm', label: 'Calm', icon: Sun, color: 'text-sky-400' },
  { id: 'frustrated', label: 'Frustrated', icon: CloudRain, color: 'text-muted-foreground' },
  { id: 'optimistic', label: 'Optimistic', icon: ThumbsUp, color: 'text-long' },
  { id: 'pessimistic', label: 'Pessimistic', icon: ThumbsDown, color: 'text-short' },
  { id: 'disciplined', label: 'Disciplined', icon: Target, color: 'text-chart-2' },
  { id: 'impulsive', label: 'Impulsive', icon: Flame, color: 'text-rose-400' },
  { id: 'happy', label: 'Happy', icon: Smiley, color: 'text-long' },
  { id: 'sad', label: 'Sad', icon: SmileySad, color: 'text-chart-1' },
  { id: 'neutral', label: 'Neutral', icon: SmileyMeh, color: 'text-muted-foreground' },
  { id: 'tired', label: 'Tired', icon: Coffee, color: 'text-warning' },
  { id: 'excited', label: 'Excited', icon: Heart, color: 'text-chart-3' },
  { id: 'stressed', label: 'Stressed', icon: TrendDown, color: 'text-short' },
  { id: 'relaxed', label: 'Relaxed', icon: Heart, color: 'text-chart-5' },
]

interface EmotionPickerProps {
  selectedEmotion?: EmotionType | null
  onChange: (emotion: EmotionType | null) => void
  className?: string
}

export function EmotionPicker({ selectedEmotion, onChange, className }: EmotionPickerProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const selectedEmotionData = emotions.find(e => e.id === selectedEmotion)

  const displayedEmotions = isExpanded ? emotions : emotions.slice(0, 8)

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">How are you feeling?</label>
        {selectedEmotion && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onChange(null)}
          >
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {displayedEmotions.map((emotion) => {
          const Icon = emotion.icon
          const isSelected = selectedEmotion === emotion.id

          return (
            <Button
              key={emotion.id}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-2 transition-all",
                isSelected && "ring-2 ring-ring ring-offset-2",
                !isSelected && "hover:scale-105"
              )}
              onClick={() => onChange(emotion.id)}
            >
              <Icon className={cn("h-5 w-5", !isSelected && emotion.color)} weight="light" />
              <span className="text-[10px] font-medium leading-none">
                {emotion.label}
              </span>
            </Button>
          )
        })}
      </div>

      {emotions.length > 8 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Show Less' : `Show More (${emotions.length - 8} more)`}
        </Button>
      )}

      {selectedEmotionData && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
          <selectedEmotionData.icon className={cn("h-4 w-4", selectedEmotionData.color)} weight="light" />
          <span className="text-sm font-medium">
            Feeling {selectedEmotionData.label.toLowerCase()}
          </span>
        </div>
      )}
    </div>
  )
}

export function getEmotionIcon(emotionId?: EmotionType | null) {
  if (!emotionId) return null
  return emotions.find(e => e.id === emotionId)
}

