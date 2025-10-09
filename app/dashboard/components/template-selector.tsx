'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LayoutTemplate, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTemplates } from '@/context/template-provider'
import { useTemplateEditStore } from '@/store/template-edit-store'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface TemplateSelectorProps {
  className?: string
}

export default function TemplateSelector({ className }: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showUpdatedText, setShowUpdatedText] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  
  const { templates, activeTemplate, switchTemplate, createTemplate, deleteTemplate } = useTemplates()
  const { enterEditMode } = useTemplateEditStore()

  // Handle template switch
  const handleTemplateSwitch = async (templateId: string) => {
    await switchTemplate(templateId)
    setShowUpdatedText(true)
    setTimeout(() => setShowUpdatedText(false), 3000)
    setIsOpen(false)
  }

  // Handle create template
  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) return
    
    try {
      await createTemplate(newTemplateName.trim())
      setNewTemplateName('')
      setCreateDialogOpen(false)
      setIsOpen(false)
    } catch (error) {
      // Error already shown by hook via toast
      console.error('Template creation failed:', error)
    }
  }

  // Handle delete template
  const handleDeleteTemplate = async () => {
    if (!templateToDelete) return
    
    try {
      await deleteTemplate(templateToDelete)
      setTemplateToDelete(null)
      setDeleteDialogOpen(false)
    } catch (error) {
      // Error handled by hook
    }
  }

  const openDeleteDialog = (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTemplateToDelete(templateId)
    setDeleteDialogOpen(true)
  }

  const handleEditTemplate = (template: typeof templates[0], e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Don't allow editing temporary/fallback template or default template
    if (template.id === 'default-temp' || template.id === 'fallback' || template.isDefault) {
      if (template.isDefault) {
        setTimeout(() => {
          toast.error('Cannot edit default template', {
            description: 'Please create a new template to customize your layout.',
            duration: 3000,
          })
        }, 0)
      }
      return
    }
    
    if (template.layout) {
      enterEditMode(template.layout)
      setIsOpen(false)
    }
  }

  return (
    <div className={cn("flex items-center justify-end px-6 py-1", className)}>
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
              <LayoutTemplate className="h-4 w-4" />
              <span className="sr-only">Template options</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[300px] p-4 bg-background/95 backdrop-blur-xl border border-border/50 shadow-2xl" 
            align="end"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Templates</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-1">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-md hover:bg-accent/80 transition-colors cursor-pointer",
                      activeTemplate?.id === template.id && "bg-accent"
                    )}
                    onClick={() => !template.isActive && handleTemplateSwitch(template.id)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-sm">{template.name}</span>
                      {template.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Default
                        </span>
                      )}
                      {template.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-primary/20"
                        onClick={(e) => handleEditTemplate(template, e)}
                        disabled={!template.isActive || template.isDefault}
                        title={template.isDefault ? 'Default template cannot be edited' : 'Edit template'}
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </Button>
                      
                      {!template.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive"
                          onClick={(e) => openDeleteDialog(template.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a new dashboard template. It will be initialized with the default layout.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                placeholder="My Custom Template"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateTemplate()
                  }
                }}
                maxLength={50}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} disabled={!newTemplateName.trim()}>
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
