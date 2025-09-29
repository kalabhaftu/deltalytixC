'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplateSelectorProps {
  className?: string
}

export default function TemplateSelector({ className }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showUpdatedText, setShowUpdatedText] = useState(false)

  // Simulate showing "when updated" text temporarily
  const handleTemplateUpdate = () => {
    setShowUpdatedText(true)
    setTimeout(() => setShowUpdatedText(false), 3000) // Hide after 3 seconds
  }

  return (
    <div className={cn("flex items-center justify-end px-6 py-2", className)}>
      <div className="flex items-center gap-2">
        {showUpdatedText && (
          <span className="text-xs text-muted-foreground animate-in fade-in duration-200">
            Template updated
          </span>
        )}
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 hover:bg-accent/80 transition-all duration-200"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Template options</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[300px] p-4 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" 
            align="end"
          >
            <div className="space-y-4">
              <h4 className="font-medium">Template Options</h4>
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleTemplateUpdate}
                >
                  Main Template
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  disabled
                >
                  Custom Template (Coming Soon)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Template management coming soon...
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
