"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useData } from "@/context/data-provider"
import { useState } from "react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function PnlFilter() {
  const { pnlRange, setPnlRange } = useData()
  const [customMin, setCustomMin] = useState<string>("")
  const [customMax, setCustomMax] = useState<string>("")

  const handlePresetSelect = (min: number | undefined, max: number | undefined) => {
    setPnlRange({ min, max })
  }

  const handleCustomRangeApply = () => {
    setPnlRange({
      min: customMin === "" ? undefined : Number(customMin),
      max: customMax === "" ? undefined : Number(customMax)
    })
  }

  return (
    <div className="p-2 space-y-2">
      <DropdownMenuItem onClick={() => handlePresetSelect(undefined, undefined)}>
        {"All trades"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handlePresetSelect(0, undefined)}>
        {"Profitable trades"}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => handlePresetSelect(undefined, 0)}>
        {"Losing trades"}
      </DropdownMenuItem>
      <div className="space-y-2 pt-2">
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Min P&L"
            value={customMin}
            onChange={(e) => setCustomMin(e.target.value)}
            className="w-full"
          />
          <Input
            type="number"
            placeholder="Max P&L"
            value={customMax}
            onChange={(e) => setCustomMax(e.target.value)}
            className="w-full"
          />
        </div>
        <Button 
          onClick={handleCustomRangeApply}
          className="w-full"
          variant="secondary"
        >
          {"Apply"}
        </Button>
      </div>
    </div>
  )
} 