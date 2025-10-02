"use client"

import React, { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Plus } from "lucide-react"
import { getWidgetComponent, WIDGET_REGISTRY } from '../config/widget-registry'
import { useTemplateEditStore } from '@/store/template-edit-store'
import { useDashboardTemplates } from '@/hooks/use-dashboard-templates'
import { cn } from '@/lib/utils'
import type { WidgetLayout } from '@/server/dashboard-templates'
import WidgetLibraryDialog from './widget-library-dialog'

export default function WidgetCanvasEditable() {
  const { isEditMode, currentLayout, updateLayout } = useTemplateEditStore()
  const { activeTemplate } = useDashboardTemplates()
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false)
  const [targetSlot, setTargetSlot] = useState<number | null>(null)
  
  // Use current layout if in edit mode, otherwise use active template
  const layout = isEditMode && currentLayout ? currentLayout : activeTemplate?.layout || []
  
  // KPI widgets are the first 5 slots (always present)
  const kpiSlots = 5
  const kpiWidgets = layout.filter(w => w.y === 0 && w.x < kpiSlots)
  
  // Fill empty KPI slots
  const kpiLayout: (WidgetLayout | null)[] = Array(kpiSlots).fill(null).map((_, index) => {
    return kpiWidgets.find(w => w.x === index) || null
  })
  
  // Other widgets
  const otherWidgets = layout.filter(w => !(w.y === 0 && w.x < kpiSlots))
  
  // Handle widget removal
  const handleRemoveWidget = (widgetId: string) => {
    if (!currentLayout) return
    const updatedLayout = currentLayout.filter(w => w.i !== widgetId)
    updateLayout(updatedLayout)
  }
  
  // Handle add widget placeholder click
  const handleAddWidget = (slotIndex?: number) => {
    setTargetSlot(slotIndex ?? null)
    setShowWidgetLibrary(true)
  }

  // Handle widget insertion from library
  const handleInsertWidget = (widgetType: string) => {
    if (!currentLayout) return
    
    const config = WIDGET_REGISTRY[widgetType as keyof typeof WIDGET_REGISTRY]
    if (!config) return
    
    // Determine position
    let x = 0, y = 1, w = 1, h = 1
    
    if (config.category === 'statistics' && typeof targetSlot === 'number') {
      // KPI widget - use target slot
      x = targetSlot
      y = 0
      w = 1
      h = 1
    } else {
      // Other widget - add to bottom
      const maxY = currentLayout.reduce((max, widget) => Math.max(max, widget.y + widget.h), 0)
      y = maxY
      x = 0
      w = 5 // Full width by default
      h = 2
    }
    
    const newWidget: WidgetLayout = {
      i: `widget-${Date.now()}`,
      type: widgetType,
      size: config.defaultSize,
      x,
      y,
      w,
      h,
    }
    
    updateLayout([...currentLayout, newWidget])
  }
  
  return (
    <div className="space-y-6">
      {/* Upper Section - KPI Widgets Row */}
      <div className="px-4 pt-4">
        <div
          className={cn(
            "relative",
            isEditMode && "border-2 border-dashed border-border/50 rounded-lg p-2"
          )}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {kpiLayout.map((widget, index) => (
              <div key={`kpi-slot-${index}`} className="relative w-full">
                {widget ? (
                  <div className="relative">
                    {/* Actual Widget */}
                    {getWidgetComponent(widget.type, 'kpi')}
                    
                    {/* Edit Mode Overlay */}
                    {isEditMode && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-lg"
                        onClick={() => handleRemoveWidget(widget.i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ) : (
                  /* Empty Slot Placeholder */
                  isEditMode && (
                    <Card
                      className="h-24 border-2 border-dashed border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleAddWidget(index)}
                    >
                      <CardContent className="h-full flex flex-col items-center justify-center p-4">
                        <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                        <span className="text-xs text-muted-foreground text-center">
                          Click to add widget
                        </span>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Section - Other Widgets */}
      <div className="px-4 pb-4 space-y-4">
        {otherWidgets.map((widget) => (
          <div key={widget.i} className="relative">
            {getWidgetComponent(widget.type, widget.size as any)}
            
            {/* Edit Mode Overlay */}
            {isEditMode && (
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 rounded-full p-0 shadow-lg z-10"
                onClick={() => handleRemoveWidget(widget.i)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
        
        {/* Add Widget Placeholder at bottom in edit mode */}
        {isEditMode && (
          <Card
            className="h-32 border-2 border-dashed border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => handleAddWidget()}
          >
            <CardContent className="h-full flex flex-col items-center justify-center p-4">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground text-center">
                Click to add widget
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Widget Library Dialog */}
      <WidgetLibraryDialog
        open={showWidgetLibrary}
        onOpenChange={setShowWidgetLibrary}
        currentLayout={currentLayout || []}
        onInsertWidget={handleInsertWidget}
      />
    </div>
  )
}
