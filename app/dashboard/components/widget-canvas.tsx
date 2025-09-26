"use client"

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Minus, Maximize2, GripVertical } from 'lucide-react'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { useData } from '@/context/data-provider'
import { WidgetSkeleton } from '@/components/ui/widget-skeletons'
import { WIDGET_REGISTRY, getWidgetComponent } from '../config/widget-registry'
import { useAutoScroll } from '../hooks/use-auto-scroll'
import { cn } from '@/lib/utils'
import { Widget, WidgetType, WidgetSize, LayoutItem } from '../types/dashboard'
import { logger } from '@/lib/logger'
import { useUserStore } from '@/store/user-store'
import { useDashboardEditStore } from '@/store/dashboard-edit-store'
import { toast } from 'sonner'
import { defaultLayouts } from '@/context/data-provider'
import { useEffect as useLayoutEffect } from 'react'
import { EditModeControls } from './edit-mode-controls'


// Update sizeToGrid to handle responsive sizes
const sizeToGrid = (size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
  if (isSmallScreen) {
    switch (size) {
      case 'tiny':
        return { w: 12, h: 1 }
      case 'small':
        return { w: 12, h: 2 }
      case 'small-long':
        return { w: 12, h: 2 }
      case 'medium':
        return { w: 12, h: 4 }
      case 'large':
      case 'extra-large':
        return { w: 12, h: 6 }
      default:
        return { w: 12, h: 4 }
    }
  }

  // Desktop sizes
  switch (size) {
    case 'tiny':
      return { w: 3, h: 1 }
    case 'small':
      return { w: 3, h: 4 }
    case 'small-long':
      return { w: 6, h: 2 }
    case 'medium':
      return { w: 6, h: 4 }
    case 'large':
      return { w: 6, h: 8 }
    case 'extra-large':
      return { w: 12, h: 8 }
    default:
      return { w: 6, h: 4 }
  }
}

// Add a function to get grid dimensions based on widget type and size
const getWidgetGrid = (type: WidgetType, size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
  const config = WIDGET_REGISTRY[type]
  if (!config) {
    // Return a default medium size grid for deprecated widgets
    return isSmallScreen ? { w: 12, h: 4 } : { w: 6, h: 4 }
  }
  if (isSmallScreen) {
    return sizeToGrid(size, true)
  }
  return sizeToGrid(size)
}

// Create layouts for different breakpoints
const generateResponsiveLayout = (widgets: Widget[]) => {
  const widgetArray = Array.isArray(widgets) ? widgets : []
  
  const layouts = {
    lg: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize)
    })),
    md: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize),
    })),
    sm: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, true),
      x: 0 // Align to left
    })),
    xs: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, true),
      x: 0 // Align to left
    })),
    xxs: widgetArray.map(widget => ({
      ...widget,
      ...getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, true),
      x: 0 // Align to left
    }))
  }
  return layouts
}

function DeprecatedWidget({ onRemove }: { onRemove: () => void }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Deprecated Widget</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        <p className="text-muted-foreground text-center">
          This widget is no longer supported and will be removed.
        </p>
        <Button variant="destructive" onClick={onRemove}>
          Remove Widget
        </Button>
      </CardContent>
    </Card>
  )
}

function WidgetWrapper({ children, onRemove, onChangeSize, isCustomizing, size, currentType }: { 
  children: React.ReactNode
  onRemove: () => void
  onChangeSize: (size: WidgetSize) => void
  isCustomizing: boolean
  size: WidgetSize
  currentType: WidgetType
}) {
  const { isMobile } = useData()
  const widgetRef = useRef<HTMLDivElement>(null)
  const [isSizePopoverOpen, setIsSizePopoverOpen] = useState(false)

  const handleSizeChange = (newSize: WidgetSize) => {
    onChangeSize(newSize)
    setIsSizePopoverOpen(false)
  }

  // Add touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isCustomizing) {
      // Prevent default touch behavior when customizing
      e.preventDefault()
    }
  }

  const isValidSize = (widgetType: WidgetType, size: WidgetSize) => {
    const config = WIDGET_REGISTRY[widgetType]
    if (!config) return true // Allow any size for deprecated widgets
    if (isMobile) {
      // On mobile, only allow tiny (shown as Small), medium (shown as Medium), and large (shown as Large)
      if (size === 'small' || size === 'small-long') return false
      return config.allowedSizes.includes(size)
    }
    return config.allowedSizes.includes(size)
  }

  return (
    <div 
      ref={widgetRef}
      className="relative h-full w-full overflow-hidden rounded-lg bg-background shadow-[0_2px_4px_rgba(0,0,0,0.05)] group isolate animate-[fadeIn_1.5s_ease-in-out]"
      onTouchStart={handleTouchStart}
    >
      <div className={cn("h-full w-full", 
        isCustomizing && "group-hover:blur-[2px]",
        isCustomizing && isMobile && "blur-[2px]"
      )}>
        {children}
      </div>
      {isCustomizing && (
        <>
          <div className="absolute inset-0 border-2 border-dashed border-transparent group-hover:border-accent group-focus-within:border-accent transition-colors duration-200" />
          <div className="absolute inset-0 bg-background/50 dark:bg-background/70 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 drag-handle cursor-grab active:cursor-grabbing">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <GripVertical className="h-6 w-4" />
              <p className="text-sm font-medium">
                {isMobile ? "Tap to configure" : 'Drag to move • Resize from edges'}
              </p>
            </div>
          </div>
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-10">
            <Popover open={isSizePopoverOpen} onOpenChange={setIsSizePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2">
                <div className="flex flex-col gap-1">
                  {isMobile ? (
                    <>
                      <Button
                        variant={size === 'tiny' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('tiny')}
                        disabled={!isValidSize(currentType, 'tiny') || size === 'tiny'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-4 rounded",
                            size === 'tiny' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>Tiny</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'medium' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('medium')}
                        disabled={!isValidSize(currentType, 'medium') || size === 'medium'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-8 rounded",
                            size === 'medium' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>Medium</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'large' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('large')}
                        disabled={!isValidSize(currentType, 'large') || size === 'large'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-12 rounded",
                            size === 'large' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>Large</span>
                        </div>
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant={size === 'tiny' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('tiny')}
                        disabled={!isValidSize(currentType, 'tiny') || size === 'tiny'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-4 rounded",
                            size === 'tiny' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>Tiny</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'small' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('small')}
                        disabled={!isValidSize(currentType, 'small') || size === 'small'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-6 rounded",
                            size === 'small' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>Small</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'medium' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('medium')}
                        disabled={!isValidSize(currentType, 'medium') || size === 'medium'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-8 rounded",
                            size === 'medium' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>Medium</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'large' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('large')}
                        disabled={!isValidSize(currentType, 'large') || size === 'large'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-10 rounded",
                            size === 'large' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>Large</span>
                        </div>
                      </Button>
                      <Button
                        variant={size === 'extra-large' ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => handleSizeChange('extra-large')}
                        disabled={!isValidSize(currentType, 'extra-large') || size === 'extra-large'}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-4 w-12 rounded",
                            size === 'extra-large' ? "bg-primary" : "bg-muted"
                          )} />
                          <span>Extra Large</span>
                        </div>
                      </Button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="icon"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Widget</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove this widget? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{"Cancel"}</AlertDialogCancel>
                  <AlertDialogAction onClick={onRemove}>{"Remove"}</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </>
      )}
    </div>
  )
}

// Add a function to pre-calculate widget dimensions
function getWidgetDimensions(widget: Widget, isMobile: boolean) {
  const grid = getWidgetGrid(widget.type as WidgetType, widget.size as WidgetSize, isMobile)
  return {
    w: grid.w,
    h: grid.h,
    width: `${(grid.w * 100) / 12}%`,
    height: `${grid.h * (isMobile ? 65 : 70)}px`
  }
}

type WidgetDimensions = { w: number; h: number; width: string; height: string }

export default function WidgetCanvas() {
  const { user, supabaseUser, isMobile, dashboardLayout:layouts, setDashboardLayout:setLayouts } = useUserStore(state => state)
  const { saveDashboardLayout, isLoading } = useData()
  const { 
    isCustomizing, 
    hasUnsavedChanges,
    markAsChanged,
    setIsCustomizing,
    resetChanges,
    originalLayout
  } = useDashboardEditStore()
  const [isUserAction, setIsUserAction] = useState(false)
  const [widgetsLoaded, setWidgetsLoaded] = useState<Set<string>>(new Set())
  const [layoutInitialized, setLayoutInitialized] = useState(false)
  const [forceRefresh, setForceRefresh] = useState(0)
  // Add this state to track if the layout change is from user interaction
  const activeLayout = useMemo(() => isMobile ? 'mobile' : 'desktop', [isMobile])

  // Track layout initialization
  useEffect(() => {
    if (layouts && !layoutInitialized) {
      setLayoutInitialized(true)
    }
  }, [layouts, layoutInitialized])

  // Progressive widget loading - load widgets one by one
  useEffect(() => {
    if (!layouts?.[activeLayout]) return

    const widgets = Array.isArray(layouts[activeLayout]) ? layouts[activeLayout] : []

    // Load widgets progressively (6 at a time every 100ms)
    const loadBatch = (startIndex: number, batchSize: number) => {
      const endIndex = Math.min(startIndex + batchSize, widgets.length)

      // Update widgets loaded state
      setWidgetsLoaded(prev => {
        const newLoaded = new Set(prev)
        for (let i = startIndex; i < endIndex; i++) {
          newLoaded.add(widgets[i].i)
        }
        return newLoaded
      })

      if (endIndex < widgets.length) {
        setTimeout(() => loadBatch(endIndex, 2), 100)
      }
    }

    // Start loading immediately
    loadBatch(0, 6)
  }, [layouts, activeLayout])
  
  // Use ResponsiveGridLayout with WidthProvider
  const GridLayoutWithProvider = useMemo(() => WidthProvider(Responsive), [])

  // Group all useMemo hooks together
  const widgetDimensions = useMemo(() => {
    if (!layouts?.[activeLayout]) return {}
    
    const widgets = Array.isArray(layouts[activeLayout]) ? layouts[activeLayout] : []
    return widgets.reduce((acc, widget) => {
      acc[widget.i] = getWidgetDimensions(widget, isMobile)
      return acc
    }, {} as Record<string, WidgetDimensions>)
  }, [layouts, activeLayout, isMobile])

  const responsiveLayout = useMemo(() => {
    if (!layouts) return {}
    return generateResponsiveLayout(layouts[activeLayout] as unknown as Widget[])
  }, [layouts, activeLayout])

  const currentLayout = useMemo(() => {
    if (!layouts?.[activeLayout]) return []
    return Array.isArray(layouts[activeLayout]) ? layouts[activeLayout] : []
  }, [layouts, activeLayout])

  // Save and cancel handlers for edit mode
  const handleSaveChanges = useCallback(async () => {
    if (!layouts || !user?.id) return
    
    try {
      // Immediately save to database
      await saveDashboardLayout(layouts)
      resetChanges()
      setIsCustomizing(false)
      
      // Update the data context immediately to reflect changes in UI
      if (setLayouts) {
        setLayouts(layouts)
      }

      // Force component re-render
      setForceRefresh(prev => prev + 1)
      
      toast.success('Layout saved', {
        description: "Changes saved to your account",
        duration: 3000,
      })
    } catch (error) {
      logger.error('Error saving dashboard layout', error, 'WidgetCanvas')
      toast.error('Failed to save changes', {
        description: "Please try again",
        duration: 4000,
      })
    }
  }, [layouts, user?.id, saveDashboardLayout, resetChanges, setIsCustomizing, setLayouts])

  const handleCancelChanges = useCallback(() => {
    if (originalLayout && user?.id) {
      // Restore original layout
      setLayouts(originalLayout)
    }
    resetChanges()
    setIsCustomizing(false)
  }, [originalLayout, user?.id, setLayouts, resetChanges, setIsCustomizing])

  // Handle reset to default
  const handleResetToDefault = useCallback(async () => {
    if (!user?.id) return

    try {
      // Use the COMPLETE default layouts - this will include ALL widgets
      const resetLayouts = { ...defaultLayouts }

      // Save immediately to database - this replaces the entire layout with default
      await saveDashboardLayout(resetLayouts)

      // Update local state to reflect the complete default layout
      setLayouts(resetLayouts)

      // Force a re-render by updating the user store's layout
      // This ensures the layout is immediately reflected in the UI
      if (setLayouts) {
        setLayouts(resetLayouts)
      }

      // Force component re-render
      setForceRefresh(prev => prev + 1)

      // Reset edit state
      resetChanges()
      setIsCustomizing(false)

      toast.success('Dashboard reset to default', {
        description: "All widgets restored to default positions",
        duration: 3000,
      })

    } catch (error) {
      logger.error('Error resetting dashboard layout', error, 'WidgetCanvas')
      toast.error('Failed to reset layout', {
        description: "Please try again",
        duration: 4000,
      })
    }
  }, [user?.id, saveDashboardLayout, setLayouts, resetChanges, setIsCustomizing])


  // Update handleLayoutChange with proper type handling and all dependencies
  const handleLayoutChange = useCallback((layout: LayoutItem[], allLayouts: any) => {
    if (!user?.id || !isCustomizing || !setLayouts || !layouts) return;

    try {
      // Only save if this is a user action (drag/drop), not automatic layout updates
      if (!isUserAction) return;

      // Keep the existing layouts for the non-active layout
      const updatedLayouts = {
        ...layouts,
        [activeLayout]: layout.map(item => {
          // Find the existing widget to preserve its type and size
          const existingWidget = layouts[activeLayout].find(w => w.i === item.i);
          if (!existingWidget) return null;

          // Calculate the effective size based on grid dimensions
          const effectiveSize = (() => {
            // For mobile, we don't change size based on grid dimensions since width is always 12
            if (isMobile) return existingWidget.size;
            
            // Map grid dimensions back to widget sizes
            const w = item.w;
            const h = item.h;
            
            // Check if dimensions match any predefined sizes
            if (w === 3 && h === 1) return 'tiny';
            if (w === 3 && h === 4) return 'small';
            if (w === 6 && h === 2) return 'small-long';
            if (w === 6 && h === 4) return 'medium';
            if (w === 6 && h === 8) return 'large';
            if (w === 12 && h === 8) return 'extra-large';
            
            // If dimensions don't match predefined sizes, keep the original size
            return existingWidget.size;
          })();

          // Create updated widget with proper type assertions
          const updatedWidget = {
            ...existingWidget,
            x: isMobile ? 0 : item.x,
            y: item.y,
            w: isMobile ? 12 : item.w,
            h: item.h,
            size: effectiveSize,
          };

          return updatedWidget;
        }).filter((item): item is NonNullable<typeof item> => item !== null),
        updatedAt: new Date()
      };

      // Update the state first
      setLayouts(updatedLayouts);
      
      // Mark as changed instead of immediately saving
      markAsChanged();
      
      // Reset user action flag
      setIsUserAction(false);
    } catch (error) {
      logger.error('Error updating layout', error, 'WidgetCanvas');
      // Revert to previous layout on error
      setLayouts(layouts);
    }
  }, [user?.id, isCustomizing, setLayouts, layouts, activeLayout, isMobile, isUserAction, saveDashboardLayout, setIsUserAction, markAsChanged]);

  // Add resize start handler to track user interactions
  const handleResizeStart = useCallback(() => {
    setIsUserAction(true);
  }, []);

  // Add resize handler for when widgets are resized
  const handleResize = useCallback((layout: LayoutItem[], oldItem: LayoutItem, newItem: LayoutItem) => {
    if (!user?.id || !setLayouts || !layouts) return;

    try {
      // Find the widget being resized
      const existingWidget = layouts[activeLayout].find(w => w.i === newItem.i);
      if (!existingWidget) return;

      // Get widget config to check constraints
      const config = WIDGET_REGISTRY[existingWidget.type as WidgetType];
      if (!config) return;

      // Ensure minimum dimensions are respected
      let constrainedW = newItem.w;
      let constrainedH = newItem.h;

      // Apply minimum constraints based on widget type
      if (config.minWidth) {
        constrainedW = Math.max(constrainedW, Math.ceil(config.minWidth / 100));
      }
      if (config.minHeight) {
        constrainedH = Math.max(constrainedH, Math.ceil(config.minHeight / 70));
      }

      // For certain widget types, enforce specific constraints
      if (existingWidget.type.includes('Chart') && constrainedH < 2) {
        constrainedH = 2; // Minimum height for charts
      }

      // Calculate effective size based on new dimensions
      let effectiveSize = (() => {
        if (isMobile) return existingWidget.size;
        
        const w = constrainedW;
        const h = constrainedH;
        
        
        // Map grid dimensions to widget sizes
        if (w <= 3 && h <= 1) return 'tiny';
        if (w <= 3 && h <= 4) return 'small';
        if (w <= 6 && h <= 2) return 'small-long';
        if (w <= 6 && h <= 4) return 'medium';
        if (w <= 6 && h <= 8) return 'large';
        if (w <= 12) return 'extra-large';
        
        return existingWidget.size;
      })();

      // Check if the new size is allowed for this widget type
      if (!config.allowedSizes.includes(effectiveSize as WidgetSize)) {
        // If not allowed, find the closest allowed size
        const allowedSizes = config.allowedSizes;
        const sizeOrder = ['tiny', 'small', 'small-long', 'medium', 'large', 'extra-large'];
        const currentIndex = sizeOrder.indexOf(effectiveSize);
        
        // Find the closest allowed size
        let closestSize = allowedSizes[0];
        let minDistance = Math.abs(sizeOrder.indexOf(allowedSizes[0]) - currentIndex);
        
        for (const allowedSize of allowedSizes) {
          const distance = Math.abs(sizeOrder.indexOf(allowedSize) - currentIndex);
          if (distance < minDistance) {
            minDistance = distance;
            closestSize = allowedSize;
          }
        }
        
        // Use the closest allowed size and its corresponding grid dimensions
        const closestGrid = sizeToGrid(closestSize as WidgetSize, isMobile);
        constrainedW = closestGrid.w;
        constrainedH = closestGrid.h;
        effectiveSize = closestSize;
      }

      // Final validation - ensure we have valid dimensions
      if (constrainedW <= 0 || constrainedH <= 0) {
        logger.warn('Invalid widget dimensions after resize', { w: constrainedW, h: constrainedH, widget: existingWidget.type });
        return;
      }

      // Update the layout with the constrained dimensions
      const updatedLayouts = {
        desktop: layouts.desktop.map(widget => 
          widget.i === newItem.i ? {
            ...widget,
            x: newItem.x,
            y: newItem.y,
            w: constrainedW,
            h: constrainedH,
            size: effectiveSize,
          } : widget
        ),
        mobile: layouts.mobile.map(widget => 
          widget.i === newItem.i ? {
            ...widget,
            x: newItem.x,
            y: newItem.y,
            w: constrainedW,
            h: constrainedH,
            size: effectiveSize,
          } : widget
        )
      };

      // Update state
      const newLayouts = {
        ...layouts,
        desktop: updatedLayouts.desktop,
        mobile: updatedLayouts.mobile,
        updatedAt: new Date()
      };
      
      setLayouts(newLayouts);

      // Mark as changed if in edit mode, otherwise save immediately
      if (isCustomizing) {
        markAsChanged();
      } else {
        saveDashboardLayout(newLayouts);
      }
      
    } catch (error) {
      logger.error('Error during resize', error, 'WidgetCanvas');
    }
  }, [user?.id, isCustomizing, setLayouts, layouts, activeLayout, isMobile, saveDashboardLayout, markAsChanged]);

  // Define addWidget with all dependencies
  const addWidget = useCallback(async (type: WidgetType, size: WidgetSize = 'medium') => {
    if (!user?.id || !layouts) return
    
    const currentLayout = Array.isArray(layouts[activeLayout]) ? layouts[activeLayout] : []
    
    // Check if widget type already exists
    const existingWidget = currentLayout.find(widget => widget.type === type)
    if (existingWidget) {
      toast.error("Widget already exists", {
        description: "This widget is already added to your dashboard",
        duration: 3000,
      })
      return
    }
    
    // Determine default size based on widget type
    let effectiveSize = size
    const grid = sizeToGrid(effectiveSize, activeLayout === 'mobile')
    
    // Initialize variables for finding the best position
    let bestX = 0
    let bestY = 0
    let lowestY = 0
    
    // Find the lowest Y coordinate in the current layout
    currentLayout.forEach(widget => {
      const widgetBottom = widget.y + widget.h
      if (widgetBottom > lowestY) {
        lowestY = widgetBottom
      }
    })
    
    // First, try to find gaps in existing rows
    for (let y = 0; y <= lowestY; y++) {
      // Create an array representing occupied spaces at this Y level
      const rowOccupancy = new Array(12).fill(false)
      
      // Mark occupied spaces
      currentLayout.forEach(widget => {
        if (y >= widget.y && y < widget.y + widget.h) {
          for (let x = widget.x; x < widget.x + widget.w; x++) {
            rowOccupancy[x] = true
          }
        }
      })
      
      // Look for a gap large enough for the new widget
      for (let x = 0; x <= 12 - grid.w; x++) {
        let hasSpace = true
        for (let wx = 0; wx < grid.w; wx++) {
          if (rowOccupancy[x + wx]) {
            hasSpace = false
            break
          }
        }
        
        if (hasSpace) {
          // Check if there's enough vertical space
          let hasVerticalSpace = true
          for (let wy = 0; wy < grid.h; wy++) {
            currentLayout.forEach(widget => {
              if (widget.x < x + grid.w && 
                  widget.x + widget.w > x && 
                  widget.y <= y + wy && 
                  widget.y + widget.h > y + wy) {
                hasVerticalSpace = false
              }
            })
          }
          
          if (hasVerticalSpace) {
            bestX = x
            bestY = y
            // Found a suitable gap, use it immediately
            const newWidget: Widget = {
              i: `widget${Date.now()}`,
              type,
              size: effectiveSize,
              x: bestX,
              y: bestY,
              w: grid.w,
              h: grid.h
            }

            const updatedWidgets = [...currentLayout, newWidget]
            
            const newLayouts = {
              ...layouts,
              [activeLayout]: updatedWidgets,
              updatedAt: new Date()
            }
            
            setLayouts(newLayouts)
            await saveDashboardLayout(newLayouts)
            return
          }
        }
      }
    }
    
    // If no suitable gap was found, add to the bottom
    const newWidget: Widget = {
      i: `widget${Date.now()}`,
      type,
      size: effectiveSize,
      x: 0,
      y: lowestY,
      w: grid.w,
      h: grid.h
    }

    const updatedWidgets = [...currentLayout, newWidget]
    
    const newLayouts = {
      ...layouts,
      [activeLayout]: updatedWidgets,
      updatedAt: new Date()
    }
    
    setLayouts(newLayouts)
    await saveDashboardLayout(newLayouts)
  }, [user?.id, layouts, activeLayout, setLayouts, saveDashboardLayout]);

  // Define removeWidget with all dependencies
  const removeWidget = useCallback(async (i: string) => {
    const userId = supabaseUser?.id || user?.id
    
    if (!userId) {
      console.error('❌ Cannot remove widget: Missing user ID')
      toast.error('Failed to remove widget: User not authenticated')
      return
    }
    
    if (!layouts) {
      console.error('❌ Cannot remove widget: Layouts not loaded')
      toast.error('Failed to remove widget: Dashboard layout not loaded. Please refresh the page.')
      return
    }
    
        try {
      const currentWidgets = layouts[activeLayout] || []
      const updatedWidgets = currentWidgets.filter(widget => widget.i !== i)

      const newLayouts = {
        ...layouts,
        [activeLayout]: updatedWidgets,
        updatedAt: new Date()
      }

      // Update local state first
      setLayouts(newLayouts)

      // Always save to database immediately to prevent data loss
      await saveDashboardLayout(newLayouts)

      // Mark as changed if in edit mode (for unsaved changes indicator)
      if (isCustomizing) {
        markAsChanged()
      }

      toast.success('Widget removed', {
        description: "Widget removed from dashboard",
        duration: 3000,
      })
      
    } catch (error) {
      console.error('❌ Error removing widget:', error)
      toast.error('Failed to remove widget: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [user?.id, supabaseUser?.id, layouts, activeLayout, setLayouts, saveDashboardLayout, isCustomizing, markAsChanged]);

  // Define changeWidgetType with all dependencies
  const changeWidgetType = useCallback(async (i: string, newType: WidgetType) => {
    if (!user?.id || !layouts) return
    const updatedWidgets = layouts[activeLayout].map(widget => 
      widget.i === i ? { ...widget, type: newType } : widget
    )
    const newLayouts = {
      ...layouts,
      [activeLayout]: updatedWidgets,
      updatedAt: new Date()
    }
    setLayouts(newLayouts)
    await saveDashboardLayout(newLayouts)
  }, [user?.id, layouts, activeLayout, setLayouts, saveDashboardLayout]);

  // Define changeWidgetSize with all dependencies
  const changeWidgetSize = useCallback(async (i: string, newSize: WidgetSize) => {
    if (!user?.id || !layouts) return
    
    // Find the widget
    const widget = layouts[activeLayout].find(w => w.i === i)
    if (!widget) return
    
    // Get widget config to validate the size
    const config = WIDGET_REGISTRY[widget.type as WidgetType];
    if (!config || !config.allowedSizes.includes(newSize)) {
      toast.error('Invalid size for this widget type');
      return;
    }
    
    // Prevent charts from being set to tiny size
    let effectiveSize = newSize
    if (widget.type.includes('Chart') && newSize === 'tiny') {
      effectiveSize = 'medium'
      toast.info('Charts cannot be set to tiny size, using medium instead');
    }
    
    const grid = sizeToGrid(effectiveSize, isMobile)
    const updatedWidgets = layouts[activeLayout].map(widget => 
      widget.i === i ? { ...widget, size: effectiveSize, w: grid.w, h: grid.h } : widget
    )
    const newLayouts = {
      ...layouts,
      [activeLayout]: updatedWidgets,
      updatedAt: new Date()
    }
    setLayouts(newLayouts)

    // Always save to database immediately to prevent data loss
    await saveDashboardLayout(newLayouts)

    // Mark as changed if in edit mode (for unsaved changes indicator)
    if (isCustomizing) {
      markAsChanged()
    }

    toast.success(`Resized to ${effectiveSize}`, {
      description: "Widget size updated",
      duration: 3000,
    })
  }, [user?.id, layouts, activeLayout, isMobile, setLayouts, saveDashboardLayout, isCustomizing, markAsChanged]);

  // Define removeAllWidgets with all dependencies
  const removeAllWidgets = useCallback(async () => {
    if (!user?.id || !layouts) return
    
    const newLayouts = {
      ...layouts,
      desktop: [],
      mobile: [],
      updatedAt: new Date()
    }
    
    setLayouts(newLayouts)
    await saveDashboardLayout(newLayouts)
  }, [user?.id, layouts, setLayouts, saveDashboardLayout]);

  // Auto-arrangement function
  const autoArrangeWidgets = useCallback(async () => {
    if (!user?.id || !layouts || !isCustomizing) return;

    const currentLayout = Array.isArray(layouts[activeLayout]) ? layouts[activeLayout] : [];
    if (currentLayout.length === 0) return;

    // Sort widgets by priority (calendar, statistics, then others by size)
    const sortedWidgets = [...currentLayout].sort((a, b) => {
      // Calendar widget has highest priority
      if (a.type === 'calendarWidget') return -1;
      if (b.type === 'calendarWidget') return 1;
      
      // Statistics widget comes second
      if (a.type === 'statisticsWidget') return -1;
      if (b.type === 'statisticsWidget') return 1;
      
      // Sort by size (larger widgets first)
      const sizeOrder = { 'extra-large': 4, 'large': 3, 'medium': 2, 'small': 1, 'small-long': 1, 'tiny': 0 };
      const aSize = sizeOrder[a.size as keyof typeof sizeOrder] || 2;
      const bSize = sizeOrder[b.size as keyof typeof sizeOrder] || 2;
      
      return bSize - aSize;
    });

    // Create a 2D grid to track occupied spaces
    const grid: boolean[][] = [];
    const maxRows = 50; // Reasonable max
    const cols = 12;
    
    // Initialize grid
    for (let y = 0; y < maxRows; y++) {
      grid[y] = new Array(cols).fill(false);
    }

    const arrangedWidgets = [];

    for (const widget of sortedWidgets) {
      const widgetGrid = sizeToGrid(widget.size as WidgetSize, activeLayout === 'mobile');
      let bestX = 0;
      let bestY = 0;
      let found = false;

      // Find the first available position row by row
      outerLoop: for (let y = 0; y <= maxRows - widgetGrid.h; y++) {
        for (let x = 0; x <= cols - widgetGrid.w; x++) {
          // Check if this position is available
          let canPlace = true;
          for (let dy = 0; dy < widgetGrid.h; dy++) {
            for (let dx = 0; dx < widgetGrid.w; dx++) {
              if (grid[y + dy] && grid[y + dy][x + dx]) {
                canPlace = false;
                break;
              }
            }
            if (!canPlace) break;
          }

          if (canPlace) {
            bestX = x;
            bestY = y;
            found = true;
            break outerLoop;
          }
        }
      }

      if (found) {
        // Mark the grid spaces as occupied
        for (let dy = 0; dy < widgetGrid.h; dy++) {
          for (let dx = 0; dx < widgetGrid.w; dx++) {
            if (grid[bestY + dy]) {
              grid[bestY + dy][bestX + dx] = true;
            }
          }
        }

        const arrangedWidget = {
          ...widget,
          x: bestX,
          y: bestY,
          w: widgetGrid.w,
          h: widgetGrid.h
        };

        arrangedWidgets.push(arrangedWidget);
      }
    }

    // Update layouts with arranged widgets
    const newLayouts = {
      ...layouts,
      [activeLayout]: arrangedWidgets,
      updatedAt: new Date()
    };

    setLayouts(newLayouts);
    await saveDashboardLayout(newLayouts);
    
    // Show success toast
    toast.success("Widgets automatically arranged", {
      duration: 2000,
    });
  }, [user?.id, layouts, activeLayout, isCustomizing, setLayouts, saveDashboardLayout]);

  // Reset layout function - restore to default widgets
  const resetLayout = useCallback(async () => {
    if (!user?.id || !layouts || !isCustomizing) return;

    const resetLayouts = {
      ...layouts,
      [activeLayout]: [...(defaultLayouts[activeLayout] as any[])], // Create a fresh copy
      updatedAt: new Date()
    };

    setLayouts(resetLayouts);
    await saveDashboardLayout(resetLayouts);
    
    // Show success toast
    toast.success("Layout reset to defaults", {
      duration: 2000,
    });
  }, [user?.id, layouts, activeLayout, isCustomizing, setLayouts, saveDashboardLayout]);

  // Define renderWidget with all dependencies
  const renderWidget = useCallback((widget: Widget) => {
    // Ensure widget.type is a valid WidgetType
    if (!Object.keys(WIDGET_REGISTRY).includes(widget.type)) {
      return (
          <DeprecatedWidget onRemove={() => removeWidget(widget.i)} />
      )
    }

    const config = WIDGET_REGISTRY[widget.type as keyof typeof WIDGET_REGISTRY]

    // For charts, ensure size is at least small-long
    const effectiveSize = (() => {
      if (config.requiresFullWidth) {
        return config.defaultSize
      }
      if (config.allowedSizes.length === 1) {
        return config.allowedSizes[0]
      }
      if (isMobile && widget.size !== 'tiny') {
        return 'small' as WidgetSize
      }
      return widget.size as WidgetSize
    })()

    return getWidgetComponent(widget.type as WidgetType, effectiveSize)
  }, [isMobile, removeWidget])

  // Define renderWidgetPlaceholder for loading state
  const renderWidgetPlaceholder = useCallback((widget: Widget) => {
    const effectiveSize = (() => {
      if (isMobile && widget.size !== 'tiny') {
        return 'small' as WidgetSize
      }
      return widget.size as WidgetSize
    })()

    return <WidgetSkeleton type={widget.type as WidgetType} size={effectiveSize} />
  }, [isMobile]);


  // Add auto-scroll functionality for mobile
  useAutoScroll(isMobile && isCustomizing)

  // Add layout persistence to localStorage for back button support
  useLayoutEffect(() => {
    if (layouts && user?.id) {
      try {
        localStorage.setItem(`dashboard-layout-${user.id}`, JSON.stringify(layouts))
      } catch (error) {
        // Ignore localStorage errors
      }
    }
  }, [layouts, user?.id])

  // Restore layout from localStorage if available on navigation
  useLayoutEffect(() => {
    if (!layouts && user?.id) {
      try {
        const savedLayout = localStorage.getItem(`dashboard-layout-${user.id}`)
        if (savedLayout) {
          const parsedLayout = JSON.parse(savedLayout)
          // Validate the layout structure before using it
          if (parsedLayout.desktop && parsedLayout.mobile) {
            setLayouts(parsedLayout)
          }
        }
      } catch (error) {
        // Ignore localStorage errors
      }
    }
  }, [layouts, user?.id, setLayouts])

  return (
    <div className={cn(
      "relative mt-6 w-full min-h-screen pb-6"
    )}>
      {/* Toolbar removed - functionality moved to user profile dropdown */}
      {layouts ? (
        <div className="relative">
          <div id="tooltip-portal" className="fixed inset-0 pointer-events-none z-[9999]" />
          {/* Add custom CSS for resize handles when customizing */}
          {isCustomizing && !isMobile && (
            <style>{`
              .react-resizable-handle {
                opacity: 0;
                transition: opacity 0.2s ease;
                background-color: hsl(var(--primary));
                border: 1px solid hsl(var(--primary-foreground));
                border-radius: 2px;
              }
              .react-grid-item:hover .react-resizable-handle,
              .react-grid-item.react-grid-placeholder .react-resizable-handle {
                opacity: 0.8;
              }
              .react-resizable-handle-se {
                width: 12px !important;
                height: 12px !important;
                bottom: 3px !important;
                right: 3px !important;
              }
              .react-resizable-handle-sw {
                width: 12px !important;
                height: 12px !important;
                bottom: 3px !important;
                left: 3px !important;
              }
              .react-resizable-handle-ne {
                width: 12px !important;
                height: 12px !important;
                top: 3px !important;
                right: 3px !important;
              }
              .react-resizable-handle-nw {
                width: 12px !important;
                height: 12px !important;
                top: 3px !important;
                left: 3px !important;
              }
              .react-resizable-handle-s {
                height: 6px !important;
                bottom: 3px !important;
                left: 50% !important;
                transform: translateX(-50%);
                width: 20px !important;
              }
              .react-resizable-handle-n {
                height: 6px !important;
                top: 3px !important;
                left: 50% !important;
                transform: translateX(-50%);
                width: 20px !important;
              }
              .react-resizable-handle-e {
                width: 6px !important;
                right: 3px !important;
                top: 50% !important;
                transform: translateY(-50%);
                height: 20px !important;
              }
              .react-resizable-handle-w {
                width: 6px !important;
                left: 3px !important;
                top: 50% !important;
                transform: translateY(-50%);
                height: 20px !important;
              }
              .react-grid-item.react-grid-placeholder {
                background: hsl(var(--primary) / 0.2) !important;
                border: 2px dashed hsl(var(--primary)) !important;
                border-radius: 8px !important;
              }
            `}</style>
          )}
          <GridLayoutWithProvider
            layouts={responsiveLayout}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
            rowHeight={isMobile ? 60 : 70}
            isDraggable={isCustomizing}
            isResizable={isCustomizing && !isMobile}
            draggableHandle=".drag-handle"
            resizeHandles={['se', 'sw', 'ne', 'nw', 's', 'n', 'e', 'w']}
            onDragStart={() => setIsUserAction(true)}
            onResizeStart={handleResizeStart}
            onResize={handleResize}
            onLayoutChange={handleLayoutChange}
            margin={isMobile ? [8, 8] : [16, 16]}
            containerPadding={isMobile ? [8, 8] : [0, 0]}
            compactType="vertical"
            preventCollision={false}
            useCSSTransforms={false} // Disable CSS transforms to prevent layout shifts
          >
            {currentLayout.map((widget) => {
              const typedWidget = widget as unknown as Widget
              const dimensions = widgetDimensions[typedWidget.i]
              const isLoaded = widgetsLoaded.has(typedWidget.i)

              return (
                <div
                  key={typedWidget.i}
                  className="h-full"
                  data-customizing={isCustomizing}
                  data-grid-dimensions={`${dimensions.w}x${dimensions.h}`}
                >
                  <WidgetWrapper
                    onRemove={() => removeWidget(typedWidget.i)}
                    onChangeSize={(size) => changeWidgetSize(typedWidget.i, size)}
                    isCustomizing={isCustomizing}
                    size={typedWidget.size as WidgetSize}
                    currentType={typedWidget.type as WidgetType}
                  >
                    {isLoaded ? renderWidget(typedWidget) : renderWidgetPlaceholder(typedWidget)}
                  </WidgetWrapper>
                </div>
              )
            })}
          </GridLayoutWithProvider>
        </div>
      ) : layoutInitialized ? (
        // Show empty state only after layout is initialized but empty
        <div className="flex items-center justify-center h-64 mt-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">No widgets configured</p>
            <Button onClick={() => addWidget('statisticsWidget' as WidgetType)} variant="outline">
              Add Widget
            </Button>
          </div>
        </div>
      ) : (
        // Show loading state while layout is being initialized
        <div className="flex items-center justify-center h-64 mt-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      )}
      
      {/* Edit Mode Controls - floating save/cancel buttons */}
      <EditModeControls 
        onSave={handleSaveChanges}
        onCancel={handleCancelChanges}
        onResetToDefault={handleResetToDefault}
      />
    </div>
  )
}
