"use client"

import React, { useState, useMemo } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, Plus, GripVertical } from "lucide-react"
import { WIDGET_REGISTRY } from '../config/widget-registry-lazy'
import { useTemplateEditStore } from '@/store/template-edit-store'
import { useTemplates } from '@/context/template-provider'
import { useData } from '@/context/data-provider'
import { useAccounts } from '@/hooks/use-accounts'
import { cn } from '@/lib/utils'
import type { WidgetLayout } from '@/server/dashboard-templates'
import type { WidgetType } from '../types/dashboard'
import WidgetLibraryDialog from './widget-library-dialog'
import KpiWidgetSelector from './kpi-widget-selector'
import { EmptyAccountState } from './empty-account-state'
import {
  DndContext,
  rectIntersection,
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
  rectSortingStrategy,
  horizontalListSortingStrategy,
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
} from '../utils/grid-helpers'
import { WIDGET_DIMENSIONS } from '../config/widget-dimensions'
import { useMediaQuery } from '@/hooks/use-media-query'

const GRID_COLUMNS = 12

const generateWidgetId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `widget-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const isKpiRowWidget = (widget: WidgetLayout) => widget.y === 0

const normalizeKpiWidgets = (widgets: WidgetLayout[], slotCount: number): WidgetLayout[] => {
  return widgets
    .filter(isKpiRowWidget)
    .sort((a, b) => a.x - b.x)
    .slice(0, slotCount)
    .map((widget, index) => ({
      ...widget,
      x: index,
      y: 0,
    }))
}

const orderWidgetsByPosition = (widgets: WidgetLayout[]): WidgetLayout[] => {
  return [...widgets].sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y
    }
    if (a.x !== b.x) {
      return a.x - b.x
    }
    return a.i.localeCompare(b.i)
  })
}

const packWidgets = (widgets: WidgetLayout[], startingRow = 1): WidgetLayout[] => {
  let currentRow = startingRow
  let currentX = 0
  let rowHeight = 0

  return widgets.map((originalWidget) => {
    const widget = { ...originalWidget }
    const colSpan = Math.min(widget.w, GRID_COLUMNS)

    if (currentX + colSpan > GRID_COLUMNS) {
      currentRow += Math.max(rowHeight, 1)
      currentX = 0
      rowHeight = 0
    }

    const positioned: WidgetLayout = {
      ...widget,
      x: currentX,
      y: currentRow,
      w: colSpan,
    }

    currentX += colSpan
    rowHeight = Math.max(rowHeight, widget.h)

    return positioned
  })
}

const rebuildLayout = (widgets: WidgetLayout[], kpiSlotCount: number): WidgetLayout[] => {
  const kpiWidgets = normalizeKpiWidgets(widgets.filter(isKpiRowWidget), kpiSlotCount)
  const otherWidgets = packWidgets(
    orderWidgetsByPosition(widgets.filter(widget => !isKpiRowWidget(widget))),
    1
  )
  return [...kpiWidgets, ...otherWidgets]
}

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
          className="absolute top-2 left-2 cursor-move z-10 bg-background/80 backdrop-blur-sm rounded p-1 hover:bg-muted/50 transition-colors"
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
  const { accountNumbers, formattedTrades, isLoadingAccountFilterSettings, accountFilterSettings } = useData()
  const { accounts } = useAccounts()
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false)
  const [showKpiSelector, setShowKpiSelector] = useState(false)
  const [targetSlot, setTargetSlot] = useState<{
    slotIndex?: number
    x?: number
    y?: number
    width?: number
  } | null>(null)
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const getGridColumnStyle = React.useCallback(
    (span: number) => ({
      gridColumn: `span ${isDesktop ? Math.min(span, GRID_COLUMNS) : GRID_COLUMNS}`,
    }),
    [isDesktop]
  )
  
  // Clear targetSlot when dialogs close to prevent stale state
  React.useEffect(() => {
    if (!showWidgetLibrary && !showKpiSelector) {
      setTargetSlot(null)
    }
  }, [showWidgetLibrary, showKpiSelector])
  
  // Setup sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )
  
  // Show loading skeleton while fetching user's template
  const renderLoadingSkeleton = () => (
      <div className="space-y-6">
        {/* Row 1: KPI Widgets - 5 in a row */}
        <div className="px-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
  
  // Use current layout if in edit mode, otherwise use active template
  const layout = isEditMode && currentLayout ? currentLayout : activeTemplate?.layout || []
  
  // KPI widgets are the first 5 slots (always present)
  const kpiSlots = 5
  const kpiWidgets = layout
    .filter(isKpiRowWidget)
    .sort((a, b) => a.x - b.x)
    .slice(0, kpiSlots)
  
  // Fill empty KPI slots
  const kpiLayout: (WidgetLayout | null)[] = Array(kpiSlots).fill(null).map((_, index) => {
    return kpiWidgets.find(w => w.x === index) || null
  })
  
  // Other widgets
  const otherWidgets = layout.filter(w => !isKpiRowWidget(w))
  const orderedOtherWidgets = useMemo(() => orderWidgetsByPosition(otherWidgets), [otherWidgets])

  if (isLoading || !activeTemplate) {
    return renderLoadingSkeleton()
  }
  
  // Handle widget removal
  const handleRemoveWidget = (widgetId: string) => {
    if (!currentLayout) return
    const updatedLayout = currentLayout.filter(w => w.i !== widgetId)
    updateLayout(rebuildLayout(updatedLayout, kpiSlots))
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
    
    // Capture targetSlot immediately to avoid race conditions
    const slotToUse = targetSlot
    
    // Get grid dimensions from widget size
    const { w, h } = getGridDimensionsFromSize(config.defaultSize)
    
    // Determine position
    let x = 0, y = 1
    
    if (config.kpiRowOnly && slotToUse?.slotIndex !== undefined) {
      // KPI-row-only widget - use target slot in row 0
      x = slotToUse.slotIndex
      y = 0
    } else if (slotToUse?.x !== undefined && slotToUse?.y !== undefined && slotToUse?.width !== undefined) {
      // Specific slot selected - validate size
      if (!canWidgetFitInSlot(config.defaultSize, slotToUse.width)) {
        const slotDesc = getSlotSizeDescription(slotToUse.width)
        const widgetCols = WIDGET_DIMENSIONS[config.defaultSize].colSpan
        setTimeout(() => {
          toast.error('Widget doesn\'t fit in this slot', {
            description: `This slot can fit ${slotToUse.width} columns (${slotDesc}), but this widget needs ${widgetCols} columns. Please choose a smaller widget.`,
            duration: 5000,
          })
        }, 0)
        return
      }
      
      // Widget fits - place at slot position
      x = slotToUse.x
      y = slotToUse.y
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
      i: generateWidgetId(),
      type: widgetType,
      size: config.defaultSize,
      x,
      y,
      w,
      h,
    }
    
    // If placed in a specific slot, don't reflow - keep it where user wants it
    // Only reflow if added without a specific slot (to fill gaps automatically)
    // NOTE: Must use === undefined to handle x=0 case correctly
    const shouldReflow = !slotToUse || (slotToUse.x === undefined && slotToUse.slotIndex === undefined)
    const baseLayout = [...currentLayout, newWidget]
    const updatedLayout = shouldReflow 
      ? rebuildLayout(baseLayout, kpiSlots)
      : baseLayout
    
    updateLayout(updatedLayout)
    setTargetSlot(null)
    
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

    const oldIndex = orderedOtherWidgets.findIndex(w => w.i === active.id)
    const newIndex = orderedOtherWidgets.findIndex(w => w.i === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(orderedOtherWidgets, oldIndex, newIndex).map(widget => ({ ...widget }))
    const normalizedKpis = normalizeKpiWidgets(currentLayout.filter(isKpiRowWidget), kpiSlots)
    const packedOthers = packWidgets(reordered, 1)

    updateLayout([...normalizedKpis, ...packedOthers])
  }
  
  // Show empty state ONLY if:
  // 1. Not in edit mode
  // 2. Main data has finished loading
  // 3. No accounts are currently selected
  // 4. NO saved selections exist in settings (this prevents flash while useEffect runs)
  // 5. Accounts exist (so we know data is loaded)
  const showEmptyState = !isEditMode && 
                         !isLoading &&  // ✅ WAIT for main data to load
                         accountNumbers.length === 0 && 
                         (!accountFilterSettings?.selectedPhaseAccountIds || accountFilterSettings.selectedPhaseAccountIds.length === 0) &&  // ✅ Check if settings have saved selections
                         accounts && accounts.length > 0
  
  if (showEmptyState) {
    return <EmptyAccountState />
  }
  
  return (
    <div className="space-y-4">
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
              strategy={horizontalListSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {kpiLayout.map((widget, index) => (
                  <div key={`kpi-slot-${index}`} className="relative w-full">
                    {widget ? (
                      <SortableWidget
                        widget={widget}
                        onRemove={() => handleRemoveWidget(widget.i)}
                        isEditMode={isEditMode}
                      >
                        {WIDGET_REGISTRY[widget.type as WidgetType]?.getComponent({ size: 'kpi' })}
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
          collisionDetection={rectIntersection}
          onDragEnd={handleOtherDragEnd}
        >
          <SortableContext
            items={orderedOtherWidgets.map(w => w.i)}
            strategy={rectSortingStrategy}
          >
            <div className="space-y-3">
              {(() => {
                // Group widgets by row
                const rowMap = groupWidgetsByRow(otherWidgets)
                const sortedRows = Array.from(rowMap.keys()).sort((a, b) => a - b)
                
                return sortedRows.map((rowY) => {
                  const rowWidgets = rowMap.get(rowY) || []
                  const availableSlots = calculateRowSlots(otherWidgets, rowY)
                  
                  return (
                    <div key={`row-${rowY}`} className="grid grid-cols-1 md:grid-cols-12 gap-3">
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
                                style={getGridColumnStyle(slotWidth)}
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
                              style={getGridColumnStyle(widget.w)}
                            >
                              <SortableWidget
                                widget={widget}
                                onRemove={() => handleRemoveWidget(widget.i)}
                                isEditMode={isEditMode}
                              >
                                {WIDGET_REGISTRY[widget.type as WidgetType]?.getComponent({ size: widget.size as any })}
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
                              style={getGridColumnStyle(slotWidth)}
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
