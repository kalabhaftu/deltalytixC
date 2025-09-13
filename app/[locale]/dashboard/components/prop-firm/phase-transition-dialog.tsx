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
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PhaseTransitionDialogProps {
  isOpen: boolean
  onClose: () => void
  accountId: string
  currentPhase: {
    phaseType: 'phase_1' | 'phase_2' | 'funded'
    phaseStatus: string
    profitTarget?: number
    netProfitSincePhaseStart: number
    currentBalance: number
  }
  nextPhaseType: 'phase_2' | 'funded'
  startingBalance: number
}

export function PhaseTransitionDialog({
  isOpen,
  onClose,
  accountId,
  currentPhase,
  nextPhaseType,
  startingBalance
}: PhaseTransitionDialogProps) {
  const router = useRouter()
  const [newAccountId, setNewAccountId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'phase_1': return 'Phase 1'
      case 'phase_2': return 'Phase 2'  
      case 'funded': return 'Funded'
      default: return phase
    }
  }

  const handleTransition = async () => {
    if (!newAccountId.trim()) {
      toast({
        title: "Account ID Required",
        description: "Please enter the new account ID provided by your prop firm.",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/prop-firm/accounts/${accountId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newAccountId: newAccountId.trim(),
          nextPhaseType,
          currentPhaseProfit: currentPhase.netProfitSincePhaseStart
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Phase Transition Successful!",
          description: `Account successfully transitioned to ${getPhaseDisplayName(nextPhaseType)}`,
        })
        onClose()
        router.refresh() // Refresh the page to show updated data
      } else {
        toast({
          title: "Transition Failed",
          description: result.error || "Failed to transition to next phase",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Phase transition error:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred during phase transition",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkipTransition = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/prop-firm/accounts/${accountId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newAccountId: null, // Skip account ID update
          nextPhaseType,
          currentPhaseProfit: currentPhase.netProfitSincePhaseStart
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Phase Transition Completed",
          description: `Account transitioned to ${getPhaseDisplayName(nextPhaseType)} with existing account ID`,
        })
        onClose()
        router.refresh()
      } else {
        toast({
          title: "Transition Failed",
          description: result.error || "Failed to transition to next phase",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Phase transition error:', error)
      toast({
        title: "Error", 
        description: "An unexpected error occurred during phase transition",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Congratulations! Phase Transition
          </DialogTitle>
          <DialogDescription>
            Your account has successfully completed {getPhaseDisplayName(currentPhase.phaseType)} and is ready to advance to {getPhaseDisplayName(nextPhaseType)}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Summary */}
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {getPhaseDisplayName(currentPhase.phaseType)} COMPLETED
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="default">
                    {getPhaseDisplayName(nextPhaseType)} READY
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Profit Achieved:</span>
                  <p className="font-medium text-green-600">
                    {formatCurrency(currentPhase.netProfitSincePhaseStart)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Required:</span>
                  <p className="font-medium">
                    {currentPhase.profitTarget ? formatCurrency(currentPhase.profitTarget) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Account ID Input */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-800">
                  New Account ID Required
                </p>
                <p className="text-xs text-blue-600">
                  Most prop firms provide a new account ID when you advance to {getPhaseDisplayName(nextPhaseType)}. 
                  Please check your email or prop firm dashboard for the new account credentials.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newAccountId">
                {getPhaseDisplayName(nextPhaseType)} Account ID
              </Label>
              <Input
                id="newAccountId"
                placeholder={`Enter your new ${getPhaseDisplayName(nextPhaseType)} account ID...`}
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                This is typically provided by your prop firm via email or their platform
              </p>
            </div>
          </div>

          {/* Next Phase Info */}
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                {getPhaseDisplayName(nextPhaseType)} Requirements
              </h4>
              <div className="space-y-2 text-sm">
                {nextPhaseType === 'phase_2' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Starting Balance:</span>
                      <span className="font-medium">{formatCurrency(startingBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit Target:</span>
                      <span className="font-medium">{formatCurrency(startingBalance * 0.05)} (5%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Daily DD Limit:</span>
                      <span className="font-medium text-red-600">{formatCurrency(startingBalance * 0.04)} (4%)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Max DD Limit:</span>
                      <span className="font-medium text-red-600">{formatCurrency(startingBalance * 0.08)} (8%)</span>
                    </div>
                  </>
                )}
                {nextPhaseType === 'funded' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-green-600">Funded Trader</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profit Split:</span>
                      <span className="font-medium">80% (You) / 20% (Firm)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payout Frequency:</span>
                      <span className="font-medium">Every 14 days</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button 
              onClick={handleTransition}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Processing..." : `Advance to ${getPhaseDisplayName(nextPhaseType)}`}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleSkipTransition}
              disabled={isLoading}
              className="w-full"
            >
              Continue with Current Account ID
            </Button>
            
            <Button 
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="w-full text-muted-foreground"
            >
              Cancel (Stay in {getPhaseDisplayName(currentPhase.phaseType)})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
