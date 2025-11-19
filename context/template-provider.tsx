'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { 
  getUserTemplates, 
  getActiveTemplate, 
  createTemplate as createTemplateAction, 
  deleteTemplate as deleteTemplateAction, 
  switchTemplate as switchTemplateAction,
  updateTemplateLayout as updateTemplateLayoutAction,
  type DashboardTemplate,
  type WidgetLayout
} from '@/server/dashboard-templates'
import { toast } from 'sonner'

interface TemplateContextType {
  templates: DashboardTemplate[]
  activeTemplate: DashboardTemplate | null
  isLoading: boolean
  createTemplate: (name: string) => Promise<DashboardTemplate>
  deleteTemplate: (templateId: string) => Promise<void>
  switchTemplate: (templateId: string) => Promise<DashboardTemplate>
  updateLayout: (templateId: string, layout: WidgetLayout[]) => Promise<DashboardTemplate>
  reload: () => Promise<void>
}

const TemplateContext = createContext<TemplateContextType | null>(null)

// Default layout for instant rendering
const DEFAULT_LAYOUT = [
  // Row 1: KPI Widgets (5 columns)
  { i: 'kpi-1', type: 'accountBalancePnl', size: 'kpi', x: 0, y: 0, w: 1, h: 1 },
  { i: 'kpi-2', type: 'tradeWinRate', size: 'kpi', x: 1, y: 0, w: 1, h: 1 },
  { i: 'kpi-3', type: 'dayWinRate', size: 'kpi', x: 2, y: 0, w: 1, h: 1 },
  { i: 'kpi-4', type: 'profitFactor', size: 'kpi', x: 3, y: 0, w: 1, h: 1 },
  { i: 'kpi-5', type: 'avgWinLoss', size: 'kpi', x: 4, y: 0, w: 1, h: 1 },
  // Row 2: Current Streak (full width)
  { i: 'current-streak', type: 'currentStreak', size: 'kpi', x: 0, y: 1, w: 5, h: 1 },
  // Row 3: 3 Chart Widgets (3 equal columns - independent layout)
  { i: 'net-daily-pnl', type: 'netDailyPnL', size: 'small-long', x: 0, y: 2, w: 3, h: 2 },
  { i: 'daily-cumulative-pnl', type: 'dailyCumulativePnL', size: 'small-long', x: 3, y: 2, w: 3, h: 2 },
  { i: 'account-balance', type: 'accountBalanceChart', size: 'small-long', x: 6, y: 2, w: 3, h: 2 },
  // Row 4: Calendar (full width)
  { i: 'advanced-calendar', type: 'calendarAdvanced', size: 'extra-large', x: 0, y: 4, w: 12, h: 12 },
]

export function TemplateProvider({ children }: { children: React.ReactNode }) {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([])
  const [activeTemplate, setActiveTemplate] = useState<DashboardTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start as true - wait for real template
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)
  const [showFallback, setShowFallback] = useState(false)

  // Load templates
  const loadTemplates = useCallback(async () => {
    // Prevent duplicate loads
    if (hasLoadedRef.current || isLoadingRef.current) {
      return
    }
    
    isLoadingRef.current = true
    hasLoadedRef.current = true
    
    try {
      // Try to load user's saved template first
      const [allTemplates, active] = await Promise.all([
        getUserTemplates(),
        getActiveTemplate(),
      ])
      
      // If we got templates, use them immediately
      if (allTemplates.length > 0 && active) {
        setTemplates(allTemplates)
        setActiveTemplate(active)
        setIsLoading(false)
        return
      }
      
      // No templates yet - create default for new users
      const { ensureDefaultTemplate } = await import('@/server/seed-default-template')
      await ensureDefaultTemplate()
      
      // Reload after creating default
      const [newTemplates, newActive] = await Promise.all([
        getUserTemplates(),
        getActiveTemplate(),
      ])
      
      if (newTemplates.length > 0 && newActive) {
        setTemplates(newTemplates)
        setActiveTemplate(newActive)
      } else {
        // Fallback to default layout if something went wrong
        setActiveTemplate({
          id: 'fallback',
          userId: 'temp',
          name: 'Default',
          isDefault: true,
          isActive: true,
          layout: DEFAULT_LAYOUT,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      }
    } catch (error) {
      // Failed to load templates
      setTimeout(() => toast.error('Failed to load templates'), 0)
      
      // Use fallback on error
      setActiveTemplate({
        id: 'fallback',
        userId: 'temp',
        name: 'Default',
        isDefault: true,
        isActive: true,
        layout: DEFAULT_LAYOUT,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      
      hasLoadedRef.current = false // Allow retry on error
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [])

  // Load on mount - only once
  useEffect(() => {
    let mounted = true
    
    const load = async () => {
      if (!mounted) return
      await loadTemplates()
    }
    
    load()
    
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Create new template
  const handleCreateTemplate = useCallback(async (name: string) => {
    try {
      const newTemplate = await createTemplateAction(name)
      setTemplates(prev => [...prev, newTemplate])
      setTimeout(() => toast.success(`Template "${name}" created successfully`), 0)
      return newTemplate
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create template'
      setTimeout(() => toast.error(message), 0)
      throw error
    }
  }, [])

  // Delete template
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteTemplateAction(templateId)
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      
      // If deleted template was active, reload to get new active template
      if (activeTemplate?.id === templateId) {
        hasLoadedRef.current = false
        await loadTemplates()
      }
      
      setTimeout(() => toast.success('Template deleted successfully'), 0)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete template'
      setTimeout(() => toast.error(message), 0)
      throw error
    }
  }, [activeTemplate, loadTemplates])

  // Switch template
  const handleSwitchTemplate = useCallback(async (templateId: string) => {
    try {
      const updated = await switchTemplateAction(templateId)
      setActiveTemplate(updated)
      setTemplates(prev => prev.map(t => ({
        ...t,
        isActive: t.id === templateId,
      })))
      // Toast removed - template-selector shows "Template updated" text instead
      // setTimeout(() => toast.success('Template switched successfully'), 0)
      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to switch template'
      setTimeout(() => toast.error(message), 0)
      throw error
    }
  }, [])

  // Update template layout
  const handleUpdateLayout = useCallback(async (templateId: string, layout: WidgetLayout[]) => {
    try {
      const updated = await updateTemplateLayoutAction(templateId, layout)
      setTemplates(prev => prev.map(t => t.id === templateId ? updated : t))
      if (activeTemplate?.id === templateId) {
        setActiveTemplate(updated)
      }
      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update layout'
      setTimeout(() => toast.error(message), 0)
      throw error
    }
  }, [activeTemplate])

  const value: TemplateContextType = {
    templates,
    activeTemplate,
    isLoading,
    createTemplate: handleCreateTemplate,
    deleteTemplate: handleDeleteTemplate,
    switchTemplate: handleSwitchTemplate,
    updateLayout: handleUpdateLayout,
    reload: loadTemplates,
  }

  return <TemplateContext.Provider value={value}>{children}</TemplateContext.Provider>
}

export function useTemplates() {
  const context = useContext(TemplateContext)
  if (!context) {
    throw new Error('useTemplates must be used within a TemplateProvider')
  }
  return context
}



