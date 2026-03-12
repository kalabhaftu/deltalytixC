"use client"

import { X, Eye } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"

export function PhaseViewIndicator() {
  const { accountFilterGear: Gear, updateAccountFilterGear: updateGear } = useData()

  if (!Gear || !Gear.viewingSpecificPhase || !Gear.selectedMasterAccountId) {
    return null
  }

  const handleClearView = async () => {
    await updateGear({
      viewingSpecificPhase: false,
      selectedMasterAccountId: null,
      selectedPhaseId: null,
      selectedPhaseNumber: null
    })
  }

  const getPhaseText = () => {
    if (!Gear.selectedPhaseNumber) {
      return "All Phases"
    }
    return `Phase ${Gear.selectedPhaseNumber}`
  }

  const getStatusBadge = () => {
    if (!Gear.selectedPhaseNumber) {
      return <Badge variant="secondary" className="text-xs h-5">Combined View</Badge>
    }
    return (
      <Badge 
        variant={Gear.selectedPhaseNumber === 3 ? "default" : "secondary"} 
        className="text-xs h-5"
      >
        {Gear.selectedPhaseNumber === 1 ? "Phase 1" : 
         Gear.selectedPhaseNumber === 2 ? "Phase 2" : "Funded"}
      </Badge>
    )
  }

  return (
    <div className={cn(
      "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md",
      "bg-muted/50 border border-border",
      "text-foreground"
    )}>
      <Eye weight="light" className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">Viewing:</span>
      {getStatusBadge()}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClearView}
        className="h-5 w-5 p-0 hover:bg-muted/80"
      >
        <X weight="light" className="h-3 w-3" />
      </Button>
    </div>
  )
}

