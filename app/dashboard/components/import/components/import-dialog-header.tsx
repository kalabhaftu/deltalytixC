'use client'

import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { platforms } from "../config/platforms"
import { ImportType } from "../import-type-selection"
import { Step } from "../import-button"

interface ImportDialogHeaderProps {
  step: Step
  importType: ImportType
}

export function ImportDialogHeader({ step, importType }: ImportDialogHeaderProps) {
  const platform = platforms.find(p => p.type === importType) || platforms.find(p => p.platformName === 'csv-ai')
  if (!platform) return null

  const currentStep = platform.steps.find(s => s.id === step)
  const currentStepIndex = platform.steps.findIndex(s => s.id === step)
  const totalSteps = platform.steps.length

  return (
    <DialogHeader className="flex-none p-4 pb-2 border-b space-y-2">
      <DialogTitle className="text-base">{currentStep?.title || 'Import Trades'}</DialogTitle>
      <DialogDescription className="text-xs text-muted-foreground">
        {currentStep?.description || 'Import your trading data from supported platforms'}
      </DialogDescription>
      <div className="space-y-1 pt-1">
        <div className="w-full bg-secondary h-1.5 rounded-full">
          <div
            className="bg-foreground h-1.5 rounded-full transition-all duration-300 ease-in-out"
            style={{
              width: `${(currentStepIndex / (totalSteps - 1)) * 100}%`
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          {platform.steps.map((s, index) => (
            <div
              key={s.id}
              className={cn(
                "transition-colors whitespace-nowrap",
                currentStepIndex >= index && "text-foreground font-medium"
              )}
            >
              {s.title}
            </div>
          ))}
        </div>
      </div>
    </DialogHeader>
  )
}