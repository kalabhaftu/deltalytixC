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

interface Rule {
  text: string
  category: 'entry' | 'exit' | 'risk' | 'general'
}

interface TradingModel {
  id: string
  name: string
  rules: (Rule | string)[]
  notes?: string | null
  createdAt: string
  updatedAt: string
}

interface AddEditModelModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; rules: Rule[]; notes?: string }) => Promise<void>
  model?: TradingModel | null
  mode: 'add' | 'edit'
}

export function AddEditModelModal({ isOpen, onClose, onSave, model, mode }: AddEditModelModalProps) {
  const [name, setName] = useState('')
  const [rules, setRules] = useState<Rule[]>([
    { text: '', category: 'entry' },
    { text: '', category: 'exit' },
    { text: '', category: 'risk' }
  ])
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form when model changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && model) {
        setName(model.name)
        // Handle migration from string[] to Rule[]
        const modelRules = Array.isArray(model.rules) ? model.rules : []
        const formattedRules = modelRules.map((r: any) => {
          if (typeof r === 'string') return { text: r, category: 'general' as const }
          return r as Rule
        })
        setRules(formattedRules.length > 0 ? formattedRules : [
          { text: '', category: 'entry' },
          { text: '', category: 'exit' },
          { text: '', category: 'risk' }
        ])
        setNotes(model.notes || '')
      } else {
        setName('')
        setRules([
          { text: '', category: 'entry' },
          { text: '', category: 'exit' },
          { text: '', category: 'risk' }
        ])
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
      const rulesChanged = JSON.stringify(rules.filter(r => r.text.trim())) !== JSON.stringify(model.rules)
      const notesChanged = notes !== (model.notes || '')
      setHasChanges(nameChanged || rulesChanged || notesChanged)
    } else {
      setHasChanges(name.trim() !== '' || rules.some(r => r.text.trim() !== '') || notes.trim() !== '')
    }
  }, [name, rules, notes, model, mode, isOpen])

  const handleAddRule = () => {
    setRules([...rules, { text: '', category: 'general' }])
  }

  const handleRemoveRule = (index: number) => {
    if (rules.length > 1) {
      setRules(rules.filter((_, i) => i !== index))
    }
  }

  const handleRuleChange = (index: number, field: keyof Rule, value: string) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], [field]: value }
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
      const filteredRules = rules.filter(rule => rule.text.trim() !== '')
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-2xl border-border/40">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-black tracking-tighter uppercase">
              {mode === 'add' ? 'INITIALIZE STRATEGY' : 'REFINE STRATEGY'}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
              {mode === 'add'
                ? 'Building a systematic framework for risk and execution'
                : `Updating protocol: ${model?.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8 py-4">
            {/* Model Name */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                Strategy Designation <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., HTF EQUILIBRIUM, SMART MONEY CONCEPTS"
                className="font-bold tracking-tight h-11 bg-muted/10 border-border/40 focus:border-primary/50 transition-all uppercase"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Rules */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Execution Protocol (Rules)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRule}
                  className="h-8 px-3 font-black uppercase tracking-tighter text-[10px]"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Append Rule
                </Button>
              </div>
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <select
                      className="h-10 px-3 rounded-lg bg-muted/40 border border-border/40 text-[10px] font-black uppercase tracking-tighter focus:outline-none focus:ring-1 focus:ring-primary/50"
                      value={rule.category}
                      onChange={(e) => handleRuleChange(index, 'category', e.target.value as any)}
                    >
                      <option value="entry">Entry</option>
                      <option value="exit">Exit</option>
                      <option value="risk">Risk</option>
                      <option value="general">Gen</option>
                    </select>
                    <Input
                      placeholder="Define specific condition..."
                      className="font-medium text-sm h-10 bg-muted/10 border-border/40"
                      value={rule.text}
                      onChange={(e) => handleRuleChange(index, 'text', e.target.value)}
                      maxLength={100}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveRule(index)}
                      className="h-10 w-10 shrink-0 opacity-40 hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/50 font-medium italic">
                Structured protocols ensure consistency. Define criteria for entry, exit, and risk management.
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

