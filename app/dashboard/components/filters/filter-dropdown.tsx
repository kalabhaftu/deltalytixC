"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Funnel } from "@phosphor-icons/react"
import { forwardRef } from "react"
import { InstrumentFilter } from "./instrument-filter"
import { PnlFilter } from "./pnl-filter"
// import { AccountFilter } from "./account-filter" // Removed - using persistent Settings instead
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useState } from "react"
export const FilterDropdown = forwardRef<HTMLButtonElement>((props, ref) => {
  const { isMobile } = useData()
  const [open, setOpen] = useState(false)
  const [accountFilterOpen, setAccountFilterOpen] = useState(false)

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            ref={ref}
            variant="ghost"
            className={cn(
              "h-8 rounded-full flex items-center justify-center transition-transform active:scale-95",
              isMobile ? "w-8 p-0" : "min-w-[100px] gap-2 px-3"
            )}
          >
            <Funnel weight="light" className="h-4 w-4 shrink-0" />
            {!isMobile && (
              <span className="text-sm font-medium">
                {"Filters"}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {"Accounts"}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-[300px]">
                {/* AccountFilter removed - using persistent account filtering Settings instead */}
                <div className="p-4 text-sm text-muted-foreground">
                  Account filtering is now managed in Settings → Account Filtering
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {"PnL"}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <PnlFilter />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {"Instrument"}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <InstrumentFilter />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

    </>
  )
})

FilterDropdown.displayName = "FilterDropdown"