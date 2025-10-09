/**
 * Grid Helper Utilities for Dashboard Widget System
 * 
 * Provides utilities for:
 * - Converting widget sizes to grid dimensions
 * - Calculating available slots in rows
 * - Validating widget placement
 * - Finding optimal positions for new widgets
 */

import { WIDGET_DIMENSIONS } from '../config/widget-dimensions'
import type { WidgetSize } from '../types/dashboard'
import type { WidgetLayout } from '@/server/dashboard-templates'

const GRID_COLUMNS = 12

export interface GridSlot {
  x: number
  width: number
  rowY: number
}

/**
 * Convert WidgetSize to grid dimensions
 * @param size - Widget size from registry
 * @returns Grid dimensions { w: columns, h: rows }
 */
export function getGridDimensionsFromSize(size: WidgetSize): { w: number; h: number } {
  const dimensions = WIDGET_DIMENSIONS[size]
  
  // Width is directly from colSpan
  const w = dimensions.colSpan
  
  // Height estimation based on widget size
  // KPI widgets are 1 row high
  // Extra-large (full width) widgets get more height
  // Others get standard 2 rows
  let h = 2
  
  if (size === 'kpi') {
    h = 1
  } else if (size === 'extra-large') {
    h = 12
  } else if (size === 'large') {
    h = 3
  } else if (size === 'small-long') {
    h = 2
  }
  
  return { w, h }
}

/**
 * Calculate used columns in a row
 * @param widgets - Widgets in the row
 * @returns Total columns used
 */
function calculateUsedColumns(widgets: WidgetLayout[]): number {
  return widgets.reduce((total, widget) => total + widget.w, 0)
}

/**
 * Calculate available slots in a row
 * @param widgets - All widgets in layout
 * @param rowY - The row Y coordinate
 * @returns Array of available slots
 */
export function calculateRowSlots(widgets: WidgetLayout[], rowY: number): GridSlot[] {
  // Get widgets in this specific row
  const rowWidgets = widgets.filter(w => w.y === rowY).sort((a, b) => a.x - b.x)
  
  if (rowWidgets.length === 0) {
    // Empty row - one full-width slot
    return [{ x: 0, width: GRID_COLUMNS, rowY }]
  }
  
  const slots: GridSlot[] = []
  let currentX = 0
  
  // Find gaps between widgets
  for (const widget of rowWidgets) {
    if (currentX < widget.x) {
      // Gap before this widget
      slots.push({
        x: currentX,
        width: widget.x - currentX,
        rowY
      })
    }
    currentX = widget.x + widget.w
  }
  
  // Check for space at end of row
  if (currentX < GRID_COLUMNS) {
    slots.push({
      x: currentX,
      width: GRID_COLUMNS - currentX,
      rowY
    })
  }
  
  return slots
}

/**
 * Check if a widget size can fit in a slot
 * @param widgetSize - Size of widget to place
 * @param slotWidth - Width of available slot in grid columns
 * @returns True if widget fits
 */
export function canWidgetFitInSlot(widgetSize: WidgetSize, slotWidth: number): boolean {
  const { w } = getGridDimensionsFromSize(widgetSize)
  return w <= slotWidth
}

/**
 * Get the next available position for a widget
 * @param layout - Current layout
 * @param size - Size of widget to place
 * @returns Position { x, y } or null if no space
 */
export function getNextAvailablePosition(
  layout: WidgetLayout[],
  size: WidgetSize
): { x: number; y: number } | null {
  const { w } = getGridDimensionsFromSize(size)
  
  // Find the maximum Y value to start searching
  const maxY = layout.reduce((max, widget) => Math.max(max, widget.y + widget.h), 1)
  
  // Try to find a gap in existing rows first
  for (let y = 1; y <= maxY; y++) {
    const slots = calculateRowSlots(layout, y)
    const fittingSlot = slots.find(slot => slot.width >= w)
    
    if (fittingSlot) {
      return { x: fittingSlot.x, y }
    }
  }
  
  // No gap found - place at bottom in new row
  return { x: 0, y: maxY }
}

/**
 * Group widgets by row
 * @param widgets - Array of widgets
 * @returns Map of row Y to widgets in that row
 */
export function groupWidgetsByRow(widgets: WidgetLayout[]): Map<number, WidgetLayout[]> {
  const rowMap = new Map<number, WidgetLayout[]>()
  
  widgets.forEach(widget => {
    const rowWidgets = rowMap.get(widget.y) || []
    rowWidgets.push(widget)
    rowMap.set(widget.y, rowWidgets)
  })
  
  // Sort widgets within each row by x position
  rowMap.forEach((widgets, y) => {
    widgets.sort((a, b) => a.x - b.x)
    rowMap.set(y, widgets)
  })
  
  return rowMap
}

/**
 * Get a human-readable size description for a slot
 * @param slotWidth - Width of slot in grid columns
 * @returns Description string
 */
export function getSlotSizeDescription(slotWidth: number): string {
  if (slotWidth === 12) return 'Full width'
  if (slotWidth >= 8) return 'Large'
  if (slotWidth >= 6) return 'Medium'
  if (slotWidth >= 4) return 'Small'
  if (slotWidth >= 3) return 'Tiny'
  return 'Limited space'
}

/**
 * Reflow widgets after insertion or drag-drop
 * Ensures no overlaps and proper grid alignment
 * @param widgets - Array of widgets
 * @returns Reflowed widget array
 */
export function reflowWidgets(widgets: WidgetLayout[]): WidgetLayout[] {
  // Sort by y then x
  const sorted = [...widgets].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y
    return a.x - b.x
  })
  
  const reflowed: WidgetLayout[] = []
  const rowMap = new Map<number, number>() // Track used columns per row
  
  for (const widget of sorted) {
    let targetY = widget.y
    let targetX = widget.x
    
    // Get used columns in target row
    const usedInRow = rowMap.get(targetY) || 0
    
    // Check if widget fits in current row
    if (targetX + widget.w > GRID_COLUMNS || targetX < usedInRow) {
      // Doesn't fit - try to place after existing widgets
      if (usedInRow + widget.w <= GRID_COLUMNS) {
        targetX = usedInRow
      } else {
        // Move to next row
        targetY++
        targetX = 0
        rowMap.set(targetY, 0)
      }
    }
    
    // Add widget with potentially updated position
    reflowed.push({
      ...widget,
      x: targetX,
      y: targetY,
    })
    
    // Update used columns in this row
    rowMap.set(targetY, targetX + widget.w)
  }
  
  return reflowed
}

