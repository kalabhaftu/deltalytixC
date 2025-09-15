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
  Mail,
  CreditCard,
  X
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
        // Force immediate refresh and reload
        router.refresh()
        setTimeout(() => {
          window.location.reload()
        }, 500)
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
        // Force immediate refresh and reload
        router.refresh()
        setTimeout(() => {
          window.location.reload()
        }, 500)
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
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <div className="p-2 bg-muted rounded-full">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
            <Trophy className="h-5 w-5 text-muted-foreground" />
            Phase Completed!
          </DialogTitle>
          <DialogDescription className="text-base">
            Your account crushed {getPhaseDisplayName(currentPhase.phaseType)} and is ready for {getPhaseDisplayName(nextPhaseType)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Summary */}
          <Card className="border-border bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-center mb-4">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="px-3 py-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {getPhaseDisplayName(currentPhase.phaseType)}
                  </Badge>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <Badge variant="default" className="px-3 py-1 flex items-center gap-1">
                    <Rocket className="h-3 w-3" />
                    {getPhaseDisplayName(nextPhaseType)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Profit Made</span>
                  </div>
                  <p className="font-bold text-foreground text-lg">
                    {formatCurrency(currentPhase.netProfitSincePhaseStart)}
                  </p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Target className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Target Was</span>
                  </div>
                  <p className="font-semibold text-sm">
                    {currentPhase.profitTarget ? formatCurrency(currentPhase.profitTarget) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Account ID Input */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 border rounded-xl bg-muted/30">
              <div className="p-1 bg-muted rounded-full">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">
                    Need Your New Account ID
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your prop firm should've sent you a new account ID for {getPhaseDisplayName(nextPhaseType)}. 
                    Check your email or their dashboard!
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="newAccountId" className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                {getPhaseDisplayName(nextPhaseType)} Account ID
              </Label>
              <Input
                id="newAccountId"
                placeholder={`e.g., 987654321`}
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                className="font-mono text-center text-lg py-3"
              />
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                <CreditCard className="h-3 w-3" />
                Usually found in your prop firm's trader portal or email
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
          <div className="flex flex-col gap-2 pt-2">
            <Button 
              onClick={handleTransition}
              disabled={isLoading}
              className="w-full py-3 text-base font-semibold"
            >
{isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Advance to {getPhaseDisplayName(nextPhaseType)}
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleSkipTransition}
              disabled={isLoading}
              className="w-full py-2"
            >
<CreditCard className="h-4 w-4 mr-2" />
              Keep Current Account ID
            </Button>
            
            <Button 
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
              className="w-full text-muted-foreground py-1"
            >
<X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
