'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { AddBacktestForm } from './add-backtest-form'
import { Plus } from 'lucide-react'

interface AddBacktestDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (backtest: any) => Promise<void>
}

export function AddBacktestDialog({ isOpen, onClose, onAdd }: AddBacktestDialogProps) {
  const handleAdd = async (backtest: any) => {
    await onAdd(backtest)
    // Dialog will close automatically via onClose in parent after successful add
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="flex-shrink-0 bg-background border-b px-6 py-4">
          <DialogTitle className="flex items-center text-base sm:text-lg">
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Add New Backtest
          </DialogTitle>
          <DialogDescription>
            Record a new backtested trade with all execution details and analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <AddBacktestForm onAdd={handleAdd} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

