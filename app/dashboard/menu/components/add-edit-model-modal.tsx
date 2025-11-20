'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
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

interface TradingModel {
  id: string
  name: string
  rules: string[]
  notes?: string | null
}

interface AddEditModelModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; rules: string[]; notes?: string }) => Promise<void>
  model?: TradingModel | null
  mode: 'add' | 'edit'
}

export function AddEditModelModal({ isOpen, onClose, onSave, model, mode }: AddEditModelModalProps) {
  const [name, setName] = useState('')
  const [rules, setRules] = useState<string[]>(['', '', ''])
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form when model changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && model) {
        setName(model.name)
        setRules(model.rules.length > 0 ? [...model.rules] : ['', '', ''])
        setNotes(model.notes || '')
      } else {
        setName('')
        setRules(['', '', ''])
        setNotes('')
      }
      setHasChanges(false)
    }
  }, [isOpen, model, mode])

  // Track changes
  useEffect(() => {
    if (!isOpen) return

    if (mode === 'edit' && model) {
      const nameChanged = name !== model.name
      const rulesChanged = JSON.stringify(rules.filter(r => r.trim())) !== JSON.stringify(model.rules)
      const notesChanged = notes !== (model.notes || '')
      setHasChanges(nameChanged || rulesChanged || notesChanged)
    } else {
      setHasChanges(name.trim() !== '' || rules.some(r => r.trim() !== '') || notes.trim() !== '')
    }
  }, [name, rules, notes, model, mode, isOpen])

  const handleAddRule = () => {
    setRules([...rules, ''])
  }

  const handleRemoveRule = (index: number) => {
    if (rules.length > 3) {
      setRules(rules.filter((_, i) => i !== index))
    }
  }

  const handleRuleChange = (index: number, value: string) => {
    const newRules = [...rules]
    newRules[index] = value
    setRules(newRules)
  }

  const handleClose = () => {
    if (hasChanges) {
      setShowUnsavedWarning(true)
    } else {
      onClose()
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Model name is required')
      return
    }

    setIsSaving(true)
    try {
      const filteredRules = rules.filter(rule => rule.trim() !== '')
      await onSave({
        name: name.trim(),
        rules: filteredRules,
        notes: notes.trim() || undefined,
      })
      toast.success(mode === 'add' ? 'Model created successfully' : 'Model updated successfully')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save model')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'add' ? 'Add Trading Model' : 'Edit Trading Model'}</DialogTitle>
            <DialogDescription>
              {mode === 'add' 
                ? 'Create a new trading model with optional rules and notes'
                : 'Update your trading model details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Model Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                Model Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., ICT 2022, Smart Money Concepts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Rules (Optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRule}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              </div>
              <div className="space-y-2">
                {rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Rule ${index + 1} (e.g., Bias, Session, Kill Zone)`}
                      value={rule}
                      onChange={(e) => handleRuleChange(index, e.target.value)}
                      maxLength={100}
                    />
                    {rules.length > 3 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveRule(index)}
                        className="h-10 w-10 shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Add rules that define this trading model. You can check which rules were used when editing trades.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes about this model..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/1000 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isSaving}>
              {isSaving ? 'Saving...' : mode === 'add' ? 'Create Model' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowUnsavedWarning(false)}>
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowUnsavedWarning(false)
                onClose()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

