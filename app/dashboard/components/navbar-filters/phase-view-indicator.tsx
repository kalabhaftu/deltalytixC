"use client"

import { X, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAccountFilterSettings } from "@/hooks/use-account-filter-settings"
import { cn } from "@/lib/utils"

export function PhaseViewIndicator() {
  const { settings, updateSettings } = useAccountFilterSettings()

  if (!settings.viewingSpecificPhase || !settings.selectedMasterAccountId) {
    return null
  }

  const handleClearView = async () => {
    await updateSettings({
      viewingSpecificPhase: false,
      selectedMasterAccountId: null,
      selectedPhaseId: null,
      selectedPhaseNumber: null
    })
  }

  const getPhaseText = () => {
    if (!settings.selectedPhaseNumber) {
      return "All Phases"
    }
    return `Phase ${settings.selectedPhaseNumber}`
  }

  const getStatusBadge = () => {
    if (!settings.selectedPhaseNumber) {
      return <Badge variant="secondary" className="text-xs h-5">Combined View</Badge>
    }
    return (
      <Badge 
        variant={settings.selectedPhaseNumber === 3 ? "default" : "secondary"} 
        className="text-xs h-5"
      >
        {settings.selectedPhaseNumber === 1 ? "Phase 1" : 
         settings.selectedPhaseNumber === 2 ? "Phase 2" : "Funded"}
      </Badge>
    )
  }

  return (
    <div className={cn(
      "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md",
      "bg-muted/50 border border-border",
      "text-foreground"
    )}>
      <Eye className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">Viewing:</span>
      {getStatusBadge()}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearView}
        className="h-5 w-5 p-0 hover:bg-muted/80"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}

