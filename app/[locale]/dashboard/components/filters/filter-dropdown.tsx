"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Filter } from "lucide-react"
import { useI18n } from "@/locales/client"
import { PnlFilter } from "./pnl-filter"
import { InstrumentFilter } from "./instrument-filter"
// import { AccountFilter } from "./account-filter" // Removed - using persistent settings instead
import { useData } from "@/context/data-provider"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AccountGroupBoard } from "./account-group-board"
import { useModalStateStore } from "../../../../../store/modal-state-store"

export function FilterDropdown() {
  const t = useI18n()
  const { isMobile } = useData()
  const [open, setOpen] = useState(false)
  const [accountFilterOpen, setAccountFilterOpen] = useState(false)
  const { accountGroupBoardOpen } = useModalStateStore()

  // Close both dropdowns when account board is open
  useEffect(() => {
    if (accountGroupBoardOpen) {
      setOpen(false)
    }
  }, [accountGroupBoardOpen])

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost"
            className={cn(
              "h-8 rounded-full flex items-center justify-center transition-transform active:scale-95",
              isMobile ? "w-8 p-0" : "min-w-[100px] gap-2 px-3"
            )}
          >
            <Filter className="h-4 w-4 shrink-0" />
            {!isMobile && (
              <span className="text-sm font-medium">
                {t('filters.title')}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('filters.accounts')}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="w-[300px]">
                {/* AccountFilter removed - using persistent account filtering settings instead */}
                <div className="p-4 text-sm text-muted-foreground">
                  Account filtering is now managed in Settings → Account Filtering
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {t('filters.pnl')}
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
              {t('filters.instrument')}
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
}