"use client"

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Button } from "@/components/ui/button"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Save, X, AlertTriangle, RotateCcw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useDashboardEditStore } from '@/store/dashboard-edit-store'
import { useData } from '@/context/data-provider'
import { useUserStore } from '@/store/user-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface EditModeControlsProps {
  onSave: () => void
  onCancel: () => void
  onResetToDefault: () => void
}

export function EditModeControls({ onSave, onCancel, onResetToDefault }: EditModeControlsProps) {
  const { isCustomizing, hasUnsavedChanges } = useDashboardEditStore()
  const { isMobile } = useData()
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  const handleSave = () => {
    onSave()
    toast.success('Layout saved', { duration: 2000 })
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true)
    } else {
      onCancel()
      toast.info('Edit mode disabled', { duration: 2000 })
    }
  }

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false)
    onCancel()
    toast.info('Changes discarded', { duration: 2000 })
  }

  const handleKeepEditing = () => {
    setShowUnsavedDialog(false)
  }

  const handleResetClick = () => {
    setShowResetDialog(true)
  }

  const handleConfirmReset = () => {
    setShowResetDialog(false)
    onResetToDefault()
    toast.success('Dashboard reset', {
      description: "All widgets restored to default",
      duration: 3000,
    })
  }

  const handleCancelReset = () => {
    setShowResetDialog(false)
  }

  if (!isCustomizing) return null

  const controlsContent = (
    <>
      <AnimatePresence>
        {isCustomizing && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={cn(
              "fixed bottom-6 right-6 z-[9999]",
              "bg-background/30 backdrop-blur-xl border border-border/30 rounded-2xl shadow-xl shadow-background/10",
              "ring-1 ring-white/5 p-2",
              "hover:bg-background/80 hover:border-border/60 transition-all duration-300"
            )}
            style={{ 
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999
            }}
          >
            <div className="flex flex-col items-center gap-2">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  onClick={handleSave}
                  size="sm"
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 font-medium p-0",
                    hasUnsavedChanges 
                      ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 border border-emerald-500/20"
                      : "bg-gradient-to-r from-muted to-muted/80 hover:from-muted/90 hover:to-muted/70 text-muted-foreground shadow-lg shadow-muted/20 border border-border"
                  )}
                  disabled={!hasUnsavedChanges}
                  title={hasUnsavedChanges ? "Save Changes" : "No Changes"}
                >
                  <Save className="h-4 w-4 shrink-0" />
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  onClick={handleResetClick}
                  size="sm"
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 font-medium border p-0",
                    "hover:bg-orange-100 hover:text-orange-600 hover:shadow-md hover:border-orange-200 border-border dark:hover:bg-orange-950/20 dark:hover:border-orange-800/30"
                  )}
                  title="Reset to Default"
                >
                  <RotateCcw className="h-4 w-4 shrink-0" />
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  onClick={handleCancel}
                  size="sm"
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 font-medium border p-0",
                    "hover:bg-destructive/10 hover:text-destructive hover:shadow-md hover:border-destructive/20 border-border"
                  )}
                  title="Cancel"
                >
                  <X className="h-4 w-4 shrink-0" />
                </Button>
              </motion.div>

              {hasUnsavedChanges && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center w-10 h-6 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/30"
                  title="Unsaved changes"
                >
                  <AlertTriangle className="h-3 w-3" />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Unsaved Changes
            </AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to your dashboard layout. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleKeepEditing}>
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border border-emerald-500/20"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleDiscardChanges}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              Reset to Default Layout
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will restore your dashboard to the default layout with all widgets in their original positions. Any current customizations will be lost. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelReset}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white border border-orange-500/20"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  // Use portal to render directly to document.body for true viewport positioning
  if (typeof document !== 'undefined') {
    return createPortal(controlsContent, document.body)
  }
  
  return controlsContent
}