import { useUserStore } from '@/store/user-store'
import { useDashboardEditStore } from '@/store/dashboard-edit-store'
import { WidgetType, WidgetSize } from '../types/dashboard'
import { WIDGET_REGISTRY } from '../config/widget-registry-lazy'
import { toast } from 'sonner'
import { useCallback } from 'react'
// import { saveDashboardLayout } from '@/context/data-provider' // Deprecated in original code

// Helper function to convert widget size to grid dimensions
export const sizeToGrid = (size: WidgetSize, isSmallScreen = false): { w: number, h: number } => {
    if (isSmallScreen) {
        switch (size) {
            case 'tiny': return { w: 12, h: 1 }
            case 'small': return { w: 12, h: 2 }
            case 'small-long': return { w: 12, h: 2 }
            case 'medium': return { w: 12, h: 4 }
            case 'large':
            case 'extra-large': return { w: 12, h: 10 }
            case 'kpi': return { w: 12, h: 3 }
            default: return { w: 12, h: 4 }
        }
    }

    switch (size) {
        case 'tiny': return { w: 3, h: 1 }
        case 'small': return { w: 3, h: 4 }
        case 'small-long': return { w: 6, h: 2 }
        case 'medium': return { w: 6, h: 4 }
        case 'large': return { w: 6, h: 8 }
        case 'extra-large': return { w: 12, h: 12 }
        case 'kpi': return { w: 2.3, h: 2.4 }
        default: return { w: 6, h: 4 }
    }
}

export function useDashboardLayout() {
    const user = useUserStore(state => state.supabaseUser)
    const { dashboardLayout: layouts, setDashboardLayout: setLayouts, isMobile } = useUserStore(state => state)
    const {
        isCustomizing,
        setIsCustomizing,
        hasUnsavedChanges,
        setOriginalLayout,
        resetChanges,
        markAsChanged
    } = useDashboardEditStore()

    const handleEditToggle = useCallback(() => {
        if (isCustomizing) {
            if (!hasUnsavedChanges) {
                setIsCustomizing(false)
                resetChanges()
                toast.success('Edit mode disabled', { duration: 2000 })
            }
        } else {
            if (layouts) {
                setOriginalLayout(layouts)
            }
            setIsCustomizing(true)
            toast.success('Edit mode enabled', {
                description: 'Drag widgets to move, resize handles to resize',
                duration: 2500
            })
        }
    }, [isCustomizing, hasUnsavedChanges, layouts, setOriginalLayout, setIsCustomizing, resetChanges])

    const addWidget = useCallback((type: WidgetType, size?: WidgetSize) => {
        if (!layouts || !user?.id) return

        const activeLayout = isMobile ? 'mobile' : 'desktop'
        const currentLayoutWidgets = layouts[activeLayout] || []

        // Check for duplicate widget
        const existingWidget = currentLayoutWidgets.find(widget => widget.type === type)
        if (existingWidget) {
            toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} widget already exists`, {
                description: "Each widget type can only be added once",
                duration: 3000,
            })
            return
        }

        // Get default size from registry
        const config = WIDGET_REGISTRY[type]
        const effectiveSize = size || config?.defaultSize || 'medium'
        const grid = sizeToGrid(effectiveSize, activeLayout === 'mobile')

        // Find the best position at bottom with gap filling
        let bestX = 0
        let bestY = 0
        let lowestY = 0

        // Find the lowest Y coordinate
        currentLayoutWidgets.forEach(widget => {
            const widgetBottom = widget.y + widget.h
            if (widgetBottom > lowestY) {
                lowestY = widgetBottom
            }
        })

        // Try to find gaps in the last few rows first
        let foundGap = false
        for (let y = Math.max(0, lowestY - 3); y <= lowestY && !foundGap; y++) {
            for (let x = 0; x <= 12 - grid.w && !foundGap; x++) {
                // Check if this position is available
                const isPositionFree = !currentLayoutWidgets.some(widget => {
                    return !(
                        x >= widget.x + widget.w ||
                        x + grid.w <= widget.x ||
                        y >= widget.y + widget.h ||
                        y + grid.h <= widget.y
                    )
                })

                if (isPositionFree) {
                    bestX = x
                    bestY = y
                    foundGap = true
                }
            }
        }

        // If no gap found, place at bottom
        if (!foundGap) {
            bestX = 0
            bestY = lowestY
        }

        // Create new widget
        const newWidget = {
            i: `widget_${Date.now()}`,
            type,
            size: effectiveSize,
            x: bestX,
            y: bestY,
            w: grid.w,
            h: grid.h
        }

        const updatedLayouts = {
            ...layouts,
            [activeLayout]: [...currentLayoutWidgets, newWidget]
        }

        setLayouts(updatedLayouts)

        if (isCustomizing) {
            markAsChanged()
        }

        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} widget added`, {
            description: "Widget added and saved",
            duration: 3000,
        })
    }, [layouts, user, isMobile, setLayouts, isCustomizing, markAsChanged])

    return {
        handleEditToggle,
        addWidget
    }
}
