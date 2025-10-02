'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  getUserTemplates, 
  getActiveTemplate, 
  createTemplate, 
  deleteTemplate, 
  switchTemplate,
  updateTemplateLayout,
  type DashboardTemplate,
  type WidgetLayout
} from '@/server/dashboard-templates'
import { toast } from 'sonner'

export function useDashboardTemplates() {
  const [templates, setTemplates] = useState<DashboardTemplate[]>([])
  const [activeTemplate, setActiveTemplate] = useState<DashboardTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const hasLoadedRef = useRef(false)

  // Load templates
  const loadTemplates = useCallback(async () => {
    // Prevent duplicate loads
    if (hasLoadedRef.current) {
      console.log('[useDashboardTemplates] Already loaded, skipping')
      return
    }
    
    hasLoadedRef.current = true
    
    try {
      // First ensure default template exists
      const { ensureDefaultTemplate } = await import('@/server/seed-default-template')
      await ensureDefaultTemplate()
      
      const [allTemplates, active] = await Promise.all([
        getUserTemplates(),
        getActiveTemplate(),
      ])
      setTemplates(allTemplates)
      setActiveTemplate(active)
    } catch (error) {
      console.error('Failed to load templates:', error)
      setTimeout(() => toast.error('Failed to load templates'), 0)
      hasLoadedRef.current = false // Allow retry on error
    } finally {
      setIsLoading(false)
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
  }, []) // Empty deps - only load once on mount

  // Create new template
  const handleCreateTemplate = useCallback(async (name: string) => {
    try {
      const newTemplate = await createTemplate(name)
      setTemplates(prev => [...prev, newTemplate])
      // Defer toast to avoid setState during render
      setTimeout(() => toast.success(`Template "${name}" created successfully`), 0)
      return newTemplate
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create template'
      // Defer toast to avoid setState during render
      setTimeout(() => toast.error(message), 0)
      throw error
    }
  }, [])

  // Delete template
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteTemplate(templateId)
      setTemplates(prev => prev.filter(t => t.id !== templateId))
      
      // If deleted template was active, reload to get new active template
      if (activeTemplate?.id === templateId) {
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
      const updated = await switchTemplate(templateId)
      setActiveTemplate(updated)
      setTemplates(prev => prev.map(t => ({
        ...t,
        isActive: t.id === templateId,
      })))
      setTimeout(() => toast.success('Template switched successfully'), 0)
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
      const updated = await updateTemplateLayout(templateId, layout)
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

  return {
    templates,
    activeTemplate,
    isLoading,
    createTemplate: handleCreateTemplate,
    deleteTemplate: handleDeleteTemplate,
    switchTemplate: handleSwitchTemplate,
    updateLayout: handleUpdateLayout,
    reload: loadTemplates,
  }
}
