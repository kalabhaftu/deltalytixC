"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Plus, GripVertical } from "lucide-react"
import { getWidgetComponent, WIDGET_REGISTRY } from '../config/widget-registry'
import { useTemplateEditStore } from '@/store/template-edit-store'
import { useTemplates } from '@/context/template-provider'
import { cn } from '@/lib/utils'
import type { WidgetLayout } from '@/server/dashboard-templates'
import type { WidgetType } from '../types/dashboard'
import WidgetLibraryDialog from './widget-library-dialog'
import KpiWidgetSelector from './kpi-widget-selector'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import {
  getGridDimensionsFromSize,
  calculateRowSlots,
  canWidgetFitInSlot,
  getNextAvailablePosition,
  groupWidgetsByRow,
  getSlotSizeDescription,
  reflowWidgets,
} from '../utils/grid-helpers'
import { WIDGET_DIMENSIONS } from '../config/widget-dimensions'

// Sortable widget wrapper
function SortableWidget({
  widget,
  children,
  onRemove,
  isEditMode,
}: {
  widget: WidgetLayout
  children: React.ReactNode
  onRemove: () => void
  isEditMode: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.i, disabled: !isEditMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative",
        isDragging && "opacity-50 z-50"
      )}
    >
      {/* Drag Handle */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 cursor-move z-10 bg-background/80 backdrop-blur-sm rounded p-1 hover:bg-accent/80 transition-colors"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      {children}
      
      {/* Remove Button */}
      {isEditMode && (
        <Button
          variant="destructive"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 rounded-full p-0 shadow-lg z-10"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}

export default function WidgetCanvasWithDrag() {
  const { isEditMode, currentLayout, updateLayout } = useTemplateEditStore()
  const { activeTemplate, isLoading } = useTemplates()
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false)
  const [showKpiSelector, setShowKpiSelector] = useState(false)
  const [targetSlot, setTargetSlot] = useState<{
    slotIndex?: number
    x?: number
    y?: number
    width?: number
  } | null>(null)
  
  
  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Show loading skeleton while fetching user's template
  if (isLoading || !activeTemplate) {
    return (
      <div className="space-y-6">
        {/* Row 1: KPI Widgets - 5 in a row */}
        <div className="px-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Array(5).fill(0).map((_, i) => (
              <Card key={i} className="h-[120px] p-4">
                <div className="flex items-start justify-between h-full">
                  <div className="space-y-2 flex-1">
                    <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
                    <div className="h-6 w-24 bg-muted-foreground/30 rounded animate-pulse" />
                  </div>
                  <div className="h-12 w-12 rounded-full bg-muted-foreground/20 animate-pulse" />
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Row 2: Recent Trades (left) + Mini Calendar (right) */}
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recent Trades Skeleton */}
            <Card className="h-[300px] p-6">
              <div className="space-y-4">
                <div className="h-5 w-32 bg-muted-foreground/30 rounded animate-pulse" />
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-muted/30">
                      <div className="flex items-center space-x-3">
                        <div className="h-4 w-12 bg-muted-foreground/20 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-20 bg-muted-foreground/30 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Mini Calendar Skeleton */}
            <Card className="h-[300px] p-6">
              <div className="space-y-4 h-full">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 bg-muted-foreground/30 rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-6 w-6 bg-muted-foreground/20 rounded animate-pulse" />
                    <div className="h-6 w-6 bg-muted-foreground/20 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col space-y-2">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array(7).fill(0).map((_, i) => (
                      <div key={i} className="h-4 bg-muted-foreground/20 rounded animate-pulse text-center" />
                    ))}
                  </div>
                  {/* Calendar days - constrained height */}
                  <div className="flex-1 flex flex-col justify-start space-y-1 max-h-[180px] overflow-hidden">
                    {Array(4).fill(0).map((_, weekIndex) => (
                      <div key={weekIndex} className="grid grid-cols-7 gap-1 flex-1">
                        {Array(7).fill(0).map((_, dayIndex) => (
                          <div 
                            key={dayIndex} 
                            className="w-full h-full min-h-[24px] max-h-[32px] bg-muted-foreground/10 rounded animate-pulse" 
                            style={{ animationDelay: `${(weekIndex * 7 + dayIndex) * 15}ms` }} 
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Row 3: 3 Chart Widgets - Small Long */}
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="h-[360px] p-6">
                <div className="space-y-4 h-full">
                  <div className="h-5 w-28 bg-muted-foreground/30 rounded animate-pulse" />
                  <div className="flex-1 bg-muted-foreground/10 rounded-lg animate-pulse flex items-end p-4">
                    <div className="flex items-end gap-1 w-full h-32">
                      {Array(8).fill(0).map((_, j) => {
                        const height = Math.random() * 80 + 20
                        return (
                          <div 
                            key={j} 
                            className="flex-1 bg-muted-foreground/20 rounded-t animate-pulse"
                            style={{ 
                              height: `${height}%`,
                              animationDelay: `${(i * 8 + j) * 50}ms`
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Row 4: 3 More Chart Widgets - Small Long */}
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="h-[360px] p-6">
                <div className="space-y-4 h-full">
                  <div className="h-5 w-32 bg-muted-foreground/30 rounded animate-pulse" />
                  <div className="flex-1 bg-muted-foreground/10 rounded-lg animate-pulse flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-muted-foreground/20 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Row 5: 3 Performance Widgets - Medium, Taller */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="h-[400px] p-6">
                <div className="space-y-4 h-full">
                  <div className="h-5 w-36 bg-muted-foreground/30 rounded animate-pulse" />
                  <div className="flex-1 space-y-3">
                    <div className="h-32 bg-muted-foreground/10 rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                    <div className="space-y-2">
                      {Array(3).fill(0).map((_, j) => (
                        <div key={j} className="flex justify-between items-center">
                          <div className="h-3 w-20 bg-muted-foreground/20 rounded animate-pulse" />
                          <div className="h-3 w-16 bg-muted-foreground/25 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  // Use current layout if in edit mode, otherwise use active template
  const layout = isEditMode && currentLayout ? currentLayout : activeTemplate?.layout || []
  
  // KPI widgets are the first 5 slots (always present)
  const kpiSlots = 5
  const kpiWidgets = layout.filter(w => w.y === 0 && w.x < kpiSlots).sort((a, b) => a.x - b.x)
  
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
  const handleAddWidget = (slotInfo?: { slotIndex?: number; x?: number; y?: number; width?: number }) => {
    setTargetSlot(slotInfo || null)
    
    // If it's a KPI slot (slotIndex 0-4), show KPI selector, otherwise show general library
    if (slotInfo?.slotIndex !== undefined && slotInfo.slotIndex < 5) {
      setShowKpiSelector(true)
    } else {
      setShowWidgetLibrary(true)
    }
  }

  // Handle widget insertion from library
  const handleInsertWidget = (widgetType: string) => {
    if (!currentLayout) return
    
    const config = WIDGET_REGISTRY[widgetType as keyof typeof WIDGET_REGISTRY]
    if (!config) return
    
    // Get grid dimensions from widget size
    const { w, h } = getGridDimensionsFromSize(config.defaultSize)
    
    // Determine position
    let x = 0, y = 1
    
    if (config.kpiRowOnly && targetSlot?.slotIndex !== undefined) {
      // KPI-row-only widget - use target slot in row 0
      x = targetSlot.slotIndex
      y = 0
    } else if (targetSlot?.x !== undefined && targetSlot?.y !== undefined && targetSlot?.width !== undefined) {
      // Specific slot selected - validate size
      if (!canWidgetFitInSlot(config.defaultSize, targetSlot.width)) {
        const slotDesc = getSlotSizeDescription(targetSlot.width)
        const widgetCols = WIDGET_DIMENSIONS[config.defaultSize].colSpan
        setTimeout(() => {
          toast.error('Widget doesn\'t fit in this slot', {
            description: `This slot can fit ${targetSlot.width} columns (${slotDesc}), but this widget needs ${widgetCols} columns. Please choose a smaller widget.`,
            duration: 5000,
          })
        }, 0)
        return
      }
      
      // Widget fits - place at slot position
      x = targetSlot.x
      y = targetSlot.y
    } else {
      // No specific slot - find next available position
      const position = getNextAvailablePosition(currentLayout, config.defaultSize)
      if (position) {
        x = position.x
        y = position.y
      } else {
        // Fallback to bottom
        const maxY = currentLayout.reduce((max, widget) => Math.max(max, widget.y + widget.h), 1)
        y = maxY
        x = 0
      }
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
    
    // Add widget and reflow to ensure no overlaps
    const updatedLayout = reflowWidgets([...currentLayout, newWidget])
    updateLayout(updatedLayout)
    
    setTimeout(() => {
      toast.success('Widget added successfully', { duration: 2000 })
    }, 0)
  }
  
  // Handle KPI widget selection
  const handleSelectKpiWidget = (widgetType: string) => {
    handleInsertWidget(widgetType)
  }

  // Handle drag end for KPI widgets
  const handleKpiDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !currentLayout) return

    const oldIndex = kpiWidgets.findIndex(w => w.i === active.id)
    const newIndex = kpiWidgets.findIndex(w => w.i === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reorderedKpi = arrayMove(kpiWidgets, oldIndex, newIndex)
    
    // Update x positions based on new order
    const updatedKpi = reorderedKpi.map((widget, index) => ({
      ...widget,
      x: index,
    }))
    
    // Replace KPI widgets in layout
    const newLayout = [
      ...updatedKpi,
      ...otherWidgets,
    ]
    
    updateLayout(newLayout)
  }

  // Handle drag end for other widgets
  const handleOtherDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id || !currentLayout) return

    const activeWidget = otherWidgets.find(w => w.i === active.id)
    const overWidget = otherWidgets.find(w => w.i === over.id)

    if (!activeWidget || !overWidget) return

    // Check if dragging to a different row
    const isDifferentRow = activeWidget.y !== overWidget.y

    if (isDifferentRow) {
      // Cross-row drag - insert at target position and reflow
      const withoutActive = otherWidgets.filter(w => w.i !== active.id)
      
      // Find insertion index in the target row
      const targetRowWidgets = withoutActive.filter(w => w.y === overWidget.y).sort((a, b) => a.x - b.x)
      const overIndexInRow = targetRowWidgets.findIndex(w => w.i === over.id)
      
      // Calculate new x position (insert before or after over widget)
      let newX = overWidget.x
      if (overIndexInRow > 0) {
        const prevWidget = targetRowWidgets[overIndexInRow - 1]
        newX = prevWidget.x + prevWidget.w
      }
      
      // Update active widget position
      const movedWidget = {
        ...activeWidget,
        x: newX,
        y: overWidget.y,
      }
      
      // Reflow all widgets to prevent overlaps
      const newLayout = reflowWidgets([...withoutActive, movedWidget])
      
      // Combine with KPI widgets
      updateLayout([...kpiWidgets, ...newLayout.filter(w => w.y > 0)])
    } else {
      // Same row - simple reorder
      const oldIndex = otherWidgets.findIndex(w => w.i === active.id)
      const newIndex = otherWidgets.findIndex(w => w.i === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const reorderedOther = arrayMove(otherWidgets, oldIndex, newIndex)
      
      // Update positions within the same row to maintain grid alignment
      const rowMap = groupWidgetsByRow(reorderedOther)
      const reflowed: WidgetLayout[] = []
      
      rowMap.forEach((widgets, rowY) => {
        let currentX = 0
        widgets.forEach(widget => {
          reflowed.push({ ...widget, x: currentX, y: rowY })
          currentX += widget.w
        })
      })
      
      // Combine with KPI widgets
      updateLayout([...kpiWidgets, ...reflowed])
    }
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleKpiDragEnd}
          >
            <SortableContext
              items={kpiWidgets.map(w => w.i)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {kpiLayout.map((widget, index) => (
                  <div key={`kpi-slot-${index}`} className="relative w-full">
                    {widget ? (
                      <SortableWidget
                        widget={widget}
                        onRemove={() => handleRemoveWidget(widget.i)}
                        isEditMode={isEditMode}
                      >
                        {getWidgetComponent(widget.type as WidgetType, 'kpi')}
                      </SortableWidget>
                    ) : (
                      /* Empty Slot Placeholder */
                      isEditMode && (
                        <Card
                          className="h-24 border-2 border-dashed border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleAddWidget({ slotIndex: index })}
                        >
                          <CardContent className="h-full flex flex-col items-center justify-center p-4">
                            <Plus className="h-6 w-6 text-muted-foreground mb-2" />
                            <span className="text-xs text-muted-foreground text-center">
                              Add KPI
                            </span>
                          </CardContent>
                        </Card>
                      )
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>

      {/* Main Content Section - Other Widgets */}
      <div className="px-4 pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleOtherDragEnd}
        >
          <SortableContext
            items={otherWidgets.map(w => w.i)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {(() => {
                // Group widgets by row
                const rowMap = groupWidgetsByRow(otherWidgets)
                const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b)
                
                return sortedRows.map((rowY) => {
                  const rowWidgets = rowMap.get(rowY) || []
                  const availableSlots = calculateRowSlots(otherWidgets, rowY)
                  
                  return (
                    <div key={`row-${rowY}`} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Render widgets and slots in order */}
                      {(() => {
                        const items: React.ReactElement[] = []
                        let currentX = 0
                        
                        rowWidgets.forEach((widget, widgetIndex) => {
                          // Add empty slot before widget if there's a gap
                          if (isEditMode && currentX < widget.x) {
                            const slotWidth = widget.x - currentX
                            items.push(
                              <div
                                key={`slot-${rowY}-${currentX}`}
                                className="col-span-1 md:col-span-12"
                                style={{
                                  gridColumn: window.innerWidth >= 768 ? `span ${slotWidth}` : 'span 1'
                                }}
                              >
                                <Card
                                  className="h-32 border-2 border-dashed border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => handleAddWidget({ x: currentX, y: rowY, width: slotWidth })}
                                >
                                  <CardContent className="h-full flex flex-col items-center justify-center p-4">
                                    <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-xs text-muted-foreground text-center">
                                      Add widget ({getSlotSizeDescription(slotWidth)})
                                    </span>
                                  </CardContent>
                                </Card>
                              </div>
                            )
                          }
                          
                          // Add the widget
                          items.push(
                            <div
                              key={widget.i}
                              className="col-span-1 md:col-span-12"
                              style={{
                                gridColumn: window.innerWidth >= 768 ? `span ${widget.w}` : 'span 1'
                              }}
                            >
                              <SortableWidget
                                widget={widget}
                                onRemove={() => handleRemoveWidget(widget.i)}
                                isEditMode={isEditMode}
                              >
                                {getWidgetComponent(widget.type as WidgetType, widget.size as any)}
                              </SortableWidget>
                            </div>
                          )
                          
                          currentX = widget.x + widget.w
                        })
                        
                        // Add slot at end of row if there's remaining space
                        if (isEditMode && currentX < 12) {
                          const slotWidth = 12 - currentX
                          items.push(
                            <div
                              key={`slot-${rowY}-${currentX}`}
                              className="col-span-1 md:col-span-12"
                              style={{
                                gridColumn: window.innerWidth >= 768 ? `span ${slotWidth}` : 'span 1'
                              }}
                            >
                              <Card
                                className="h-32 border-2 border-dashed border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => handleAddWidget({ x: currentX, y: rowY, width: slotWidth })}
                              >
                                <CardContent className="h-full flex flex-col items-center justify-center p-4">
                                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                                  <span className="text-xs text-muted-foreground text-center">
                                    Add widget ({getSlotSizeDescription(slotWidth)})
                                  </span>
                                </CardContent>
                              </Card>
                            </div>
                          )
                        }
                        
                        return items
                      })()}
                    </div>
                  )
                })
              })()}
            </div>
          </SortableContext>
        </DndContext>
        
        {/* Add new row at bottom in edit mode */}
        {isEditMode && (
          <Card
            className="h-32 mt-4 border-2 border-dashed border-border/50 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => handleAddWidget()}
          >
            <CardContent className="h-full flex flex-col items-center justify-center p-4">
              <Plus className="h-8 w-8 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground text-center">
                Add new row
              </span>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Widget Library Dialog - For non-KPI widgets */}
      <WidgetLibraryDialog
        open={showWidgetLibrary}
        onOpenChange={setShowWidgetLibrary}
        currentLayout={currentLayout || []}
        onInsertWidget={handleInsertWidget}
      />
      
      {/* KPI Widget Selector - For KPI slots only */}
      <KpiWidgetSelector
        open={showKpiSelector}
        onOpenChange={setShowKpiSelector}
        currentLayout={currentLayout || []}
        onSelectWidget={handleSelectKpiWidget}
      />
    </div>
  )
}
