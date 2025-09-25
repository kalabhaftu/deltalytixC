'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  TrendingUp, 
  Target, 
  DollarSign,
  ArrowRight,
  AlertCircle,
  Trophy,
  CheckCircle,
  Rocket,
  Key,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PhaseTransitionDialogProps {
  isOpen: boolean
  onClose: () => void
  masterAccountId: string
  currentPhase: {
    phaseNumber: number
    profitTargetPercent?: number
    currentPnL: number
    phaseId: string
  }
  nextPhaseNumber: number
  propFirmName: string
  accountName: string
  onSuccess?: () => void
}

export function PhaseTransitionDialog({
  isOpen,
  onClose,
  masterAccountId,
  currentPhase,
  nextPhaseNumber,
  propFirmName,
  accountName,
  onSuccess
}: PhaseTransitionDialogProps) {
  const [nextPhaseId, setNextPhaseId] = useState('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const router = useRouter()

  const getPhaseDisplayName = (phaseNumber: number) => {
    if (phaseNumber === 1) return 'Phase 1'
    if (phaseNumber === 2) return 'Phase 2'
    if (phaseNumber >= 3) return 'Funded'
    return `Phase ${phaseNumber}`
  }

  const handleTransition = async () => {
    if (!nextPhaseId.trim()) {
      toast({
        title: "ID Required",
        description: "Please enter the account ID for your next phase.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsTransitioning(true)

      const response = await fetch(`/api/prop-firm-v2/accounts/${masterAccountId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nextPhaseId: nextPhaseId.trim()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to transition phase')
      }

      toast({
        title: "Phase Transition Successful! 🎉",
        description: `You've successfully advanced to ${getPhaseDisplayName(nextPhaseNumber)}!`,
        variant: "default"
      })

      // Call success callback to refresh data
      onSuccess?.()
      
      // Close dialog
      onClose()
      
      // Reset form
      setNextPhaseId('')

    } catch (error) {
      console.error('Error transitioning phase:', error)
      toast({
        title: "Transition Failed",
        description: error instanceof Error ? error.message : 'Failed to transition to next phase',
        variant: "destructive"
      })
    } finally {
      setIsTransitioning(false)
    }
  }

  const getTransitionIcon = () => {
    if (nextPhaseNumber >= 3) {
      return <Trophy className="h-8 w-8 text-yellow-500" />
    }
    return <TrendingUp className="h-8 w-8 text-green-500" />
  }

  const getTransitionTitle = () => {
    if (nextPhaseNumber >= 3) {
      return "🏆 Ready for Funded Account!"
    }
    return `🎉 Ready for ${getPhaseDisplayName(nextPhaseNumber)}!`
  }

  const getTransitionMessage = () => {
    if (nextPhaseNumber >= 3) {
      return "Congratulations! You've completed the evaluation and are ready for your funded account."
    }
    return `Great job! You've passed ${getPhaseDisplayName(currentPhase.phaseNumber)} and are ready to advance.`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full w-fit">
            {getTransitionIcon()}
          </div>
          <DialogTitle className="text-xl">
            {getTransitionTitle()}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {getTransitionMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Summary */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{accountName}</span>
                  <Badge variant="secondary">{propFirmName}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Phase</span>
                  <span className="font-semibold">{getPhaseDisplayName(currentPhase.phaseNumber)}</span>
                </div>

                {currentPhase.profitTargetPercent && currentPhase.profitTargetPercent > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Profit Target</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{currentPhase.profitTargetPercent}%</span>
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current P&L</span>
                  <span className={cn(
                    "font-semibold",
                    currentPhase.currentPnL >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {currentPhase.currentPnL >= 0 ? '+' : ''}${currentPhase.currentPnL.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phase Transition Flow */}
          <div className="flex items-center justify-center space-x-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium">{getPhaseDisplayName(currentPhase.phaseNumber)}</span>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Rocket className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">{getPhaseDisplayName(nextPhaseNumber)}</span>
              <div className="text-xs text-muted-foreground">Ready</div>
            </div>
          </div>

          {/* Next Phase ID Input */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Key className="h-5 w-5 text-blue-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">
                  Account ID Required
                </div>
                <div className="text-xs text-blue-700">
                  Enter your {getPhaseDisplayName(nextPhaseNumber)} account ID to continue
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextPhaseId" className="text-sm font-medium">
                {getPhaseDisplayName(nextPhaseNumber)} Account ID
              </Label>
              <Input
                id="nextPhaseId"
                value={nextPhaseId}
                onChange={(e) => setNextPhaseId(e.target.value)}
                placeholder={`Enter your ${getPhaseDisplayName(nextPhaseNumber)} account number...`}
                className="text-center font-mono"
                disabled={isTransitioning}
              />
              <p className="text-xs text-muted-foreground">
                This should be the new account number provided by {propFirmName} for your {getPhaseDisplayName(nextPhaseNumber).toLowerCase()}.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isTransitioning}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTransition}
              disabled={!nextPhaseId.trim() || isTransitioning}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isTransitioning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Transitioning...
                </>
              ) : (
                <>
                  Start {getPhaseDisplayName(nextPhaseNumber)}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Make sure you have the correct account details from {propFirmName} before proceeding.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}