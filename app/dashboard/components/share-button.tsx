"use client"

import { useState, useMemo, useEffect, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Share, Check, ChevronsUpDown, Copy, Layout, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { addDays, startOfDay, endOfDay, format } from "date-fns"
import { createShared } from "@/server/shared"
import { useToast } from "@/hooks/use-toast"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DateRange } from "react-day-picker"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { SharedLayoutsManager } from "./shared-layouts-manager"
import { cn } from "@/lib/utils"
import confetti from 'canvas-confetti'

import { Switch } from "@/components/ui/switch"
import { useTradesStore } from "@/store/trades-store"
import { useUserStore } from "@/store/user-store"

interface ShareButtonProps {
  variant?: "ghost" | "outline" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  currentLayout?: {
    desktop: any[]
    mobile: any[]
  }
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

function triggerConfetti() {
  const count = 200
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  })

  fire(0.2, {
    spread: 60,
  })

  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  })

  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  })

  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  })
}

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(
  ({ variant = "ghost", size = "icon", currentLayout }, ref) => {
    const locale = 'en' // Default to English since i18n was removed
    const dateLocale = undefined
    const isMobile = useIsMobile()
    const { toast } = useToast()
    const user = useUserStore(state => state.user)
    const trades = useTradesStore(state => state.trades)
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
    const [open, setOpen] = useState(false)
    const [comboboxOpen, setComboboxOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [shareUrl, setShareUrl] = useState<string>("")
    const [showManager, setShowManager] = useState(false)
    const [shareTitle, setShareTitle] = useState("")
    const [shareAllAccounts, setShareAllAccounts] = useState(true)

    // Get the earliest and latest trade dates
    const defaultDateRange = useMemo(() => {
      if (!trades || trades.length === 0 || !Array.isArray(trades)) {
        return {
          from: new Date(),
          to: undefined
        }
      }

      const timestamps = trades.map(trade => new Date(trade.entryDate).getTime())
      return {
        from: startOfDay(new Date(Math.min(...timestamps))),
        to: undefined
      }
    }, [trades])

    const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
      from: defaultDateRange.from,
      to: undefined
    } as DateRange)

    // Update date range when trades change
    useEffect(() => {
      setSelectedDateRange({
        from: defaultDateRange.from,
        to: undefined
      })
    }, [defaultDateRange])

    // Get unique account numbers from trades
    const accountNumbers = useMemo(() => {
      if (!trades || !Array.isArray(trades)) return []
      return Array.from(new Set(trades.map(trade => trade.accountNumber)))
    }, [trades])

    const filteredAccounts = useMemo(() => {
      if (!searchQuery) return accountNumbers
      return accountNumbers.filter(account => 
        account.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }, [accountNumbers, searchQuery])

    const handleShare = async () => {
      try {
        if (!user) {
          toast({
            title: "Error",
            description: "Please sign in to share trades",
            variant: "destructive",
          })
          return
        }

        if (!shareAllAccounts && selectedAccounts.length === 0) {
          toast({
            title: "Error",
            description: "Please select at least one account",
            variant: "destructive",
          })
          return
        }

        if (!selectedDateRange.from) {
          toast({
            title: "Error",
            description: "Please select a start date",
            variant: "destructive",
          })
          return
        }

        const fromDate = startOfDay(selectedDateRange.from)
        const toDate = selectedDateRange.to ? endOfDay(selectedDateRange.to) : undefined

        const filteredTrades = trades.filter(trade => {
          const tradeDate = new Date(trade.entryDate)
          return (shareAllAccounts || selectedAccounts.includes(trade.accountNumber)) &&
            tradeDate >= fromDate &&
            (!toDate || tradeDate <= toDate)
        })

        if (filteredTrades.length === 0) {
          toast({
            title: "Error",
            description: "No trades found for the selected criteria",
            variant: "destructive",
          })
          return
        }

        const slug = await createShared({
          userId: user.id,
          title: shareTitle || `Shared trades${shareAllAccounts ? ' for all accounts' : ` for ${selectedAccounts.length} accounts`}`,
          description: `Trades from ${selectedDateRange.from.toLocaleDateString()}${selectedDateRange.to ? ` to ${selectedDateRange.to.toLocaleDateString()}` : ''}`,
          isPublic: true,
          accountNumbers: shareAllAccounts ? [] : selectedAccounts,
          dateRange: {
            from: fromDate,
            ...(toDate && { to: toDate })
          },
          expiresAt: addDays(new Date(), 7),
          desktop: currentLayout?.desktop || [
            {
              i: "widget1732477563848",
              type: "calendarWidget",
              size: "large",
              x: 0,
              y: 1,
              w: 6,
              h: 8
            },
            {
              i: "widget1732477566865",
              type: "equityChart",
              size: "medium",
              x: 6,
              y: 1,
              w: 6,
              h: 4
            },
            {
              i: "widget1734881236127",
              type: "pnlChart",
              size: "medium",
              x: 6,
              y: 5,
              w: 6,
              h: 4
            },
            {
              i: "widget1734881247979",
              type: "cumulativePnl",
              size: "tiny",
              x: 0,
              y: 0,
              w: 3,
              h: 1
            },
            {
              i: "widget1734881251266",
              type: "longShortPerformance",
              size: "tiny",
              x: 3,
              y: 0,
              w: 3,
              h: 1
            },
            {
              i: "widget1734881254352",
              type: "tradePerformance",
              size: "tiny",
              x: 6,
              y: 0,
              w: 3,
              h: 1
            },
            {
              i: "widget1734881263452",
              type: "averagePositionTime",
              size: "tiny",
              x: 9,
              y: 0,
              w: 3,
              h: 1
            }
          ],
          mobile: currentLayout?.mobile || [
            {
              i: "widget1732477563848",
              type: "calendarWidget",
              size: "large",
              x: 0,
              y: 2,
              w: 12,
              h: 6
            },
            {
              i: "widget1732477566865",
              type: "equityChart",
              size: "medium",
              x: 0,
              y: 8,
              w: 12,
              h: 6
            },
            {
              i: "widget1734881247979",
              type: "cumulativePnl",
              size: "tiny",
              x: 0,
              y: 0,
              w: 12,
              h: 1
            },
            {
              i: "widget1734881254352",
              type: "tradePerformance",
              size: "tiny",
              x: 0,
              y: 1,
              w: 12,
              h: 1
            }
          ]
        })

        // Set the share URL
        const url = `${window.location.origin}/shared/${slug}`
        setShareUrl(url)

        toast({
          title: "Share Created",
          description: "Your trading performance has been shared successfully.",
        })

        // Trigger confetti animation
        setTimeout(() => {
          triggerConfetti()
        }, 1000)
      } catch (error) {
        console.error('Error sharing trades:', error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Loading...",
          variant: "destructive",
        })
      }
    }

    const handleCopyUrl = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "URL Copied",
        })
      } catch (error) {
        console.error('Error copying URL:', error)
      }
    }

    const toggleAccount = (account: string) => {
      setSelectedAccounts(prev => 
        prev.includes(account) 
          ? prev.filter(a => a !== account)
          : [...prev, account]
      )
    }

    const selectAll = () => {
      setSelectedAccounts(accountNumbers)
    }

    const deselectAll = () => {
      setSelectedAccounts([])
    }

    return (
      <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (!isOpen) {
          setShowManager(false)
          setShareUrl("")
          setShareTitle("")
          setShareAllAccounts(false)
        }
      }}>
        <DialogTrigger asChild>
          <Button 
            ref={ref}
            variant={variant}
            className={cn(
              "h-8 rounded-full flex items-center justify-center transition-transform active:scale-95",
              isMobile ? "w-8 p-0" : "min-w-[100px] gap-2 px-3"
            )}
          >
            <Share className="h-4 w-4 shrink-0" />
            {!isMobile && (
              <span className="text-sm font-medium">
                Share
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-4xl h-[90vh] sm:h-[85vh] w-[95vw]">
          <div className="h-full flex flex-col overflow-y-hidden">
              <DialogHeader>
                <DialogTitle>Share Dashboard</DialogTitle>
                <DialogDescription>
                  Create a shareable link to your dashboard layout
                </DialogDescription>
              </DialogHeader>
            <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
              <div className="h-full">
                {showManager ? (
                  <SharedLayoutsManager onBack={() => setShowManager(false)} />
                ) : shareUrl ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="w-full max-w-xl space-y-6 -mt-20">
                      <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold">Share Link Created</h3>
                        <p className="text-muted-foreground">Your dashboard is now shareable with this link</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-center block">Share URL</Label>
                        <div className="relative">
                          <Input
                            readOnly
                            value={shareUrl}
                            className="pr-24 font-mono text-sm bg-muted text-center"
                          />
                          <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCopyUrl}
                              className="h-7 w-7"
                            >
                              <Copy className="h-4 w-4" />
                              <span className="sr-only">Copy URL</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(shareUrl, '_blank')}
                              className="h-7 w-7"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">Open in new tab</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-7xl mx-auto space-y-4">
                    <div className="space-y-2">
                      <Label>Dashboard Title</Label>
                      <Input
                        placeholder="Enter dashboard title"
                        value={shareTitle}
                        onChange={(e) => setShareTitle(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="share-all-accounts"
                        checked={shareAllAccounts}
                        onCheckedChange={setShareAllAccounts}
                      />
                      <Label htmlFor="share-all-accounts">Share all accounts</Label>
                    </div>
                    {!shareAllAccounts && (
                      <div className="space-y-2 relative">
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen} modal>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={comboboxOpen}
                              className="w-full justify-between"
                            >
                              <span className="flex items-center gap-2">
                                {selectedAccounts.length === 0 && "Select accounts"}
                                {selectedAccounts.length > 0 && (
                                  <span>
                                    {selectedAccounts.length} / {accountNumbers.length} accounts
                                  </span>
                                )}
                              </span>
                              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-[var(--radix-popover-trigger-width)] p-0" 
                            align="start" 
                            side="bottom" 
                            sideOffset={4}
                            style={{ zIndex: 99999 }}
                          >
                            <Command shouldFilter={false}>
                              <CommandInput 
                                placeholder="Search accounts..." 
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                              />
                              <CommandEmpty>No accounts found</CommandEmpty>
                              <CommandList>
                                <CommandGroup>
                                  <CommandItem
                                    value="select-all"
                                    onSelect={() => {
                                      if (selectedAccounts.length === accountNumbers.length) {
                                        deselectAll()
                                      } else {
                                        selectAll()
                                      }
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Check
                                      className="h-4 w-4 opacity-0 data-[selected=true]:opacity-100"
                                      data-selected={selectedAccounts.length === accountNumbers.length}
                                    />
                                    <span className="flex-1">Select all accounts</span>
                                  </CommandItem>
                                  <ScrollArea className="h-48">
                                    {filteredAccounts.map((account) => (
                                      <CommandItem
                                        key={account}
                                        value={account}
                                        onSelect={() => toggleAccount(account)}
                                        className="flex items-center gap-2 cursor-pointer"
                                      >
                                        <Check
                                          className="h-4 w-4 opacity-0 data-[selected=true]:opacity-100"
                                          data-selected={selectedAccounts.includes(account)}
                                        />
                                        <span className="flex-1">{account}</span>
                                      </CommandItem>
                                    ))}
                                  </ScrollArea>
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    <div className="grid gap-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <div className="space-y-2">
                            <Label>From Date</Label>
                            <div className="border rounded-lg bg-card p-2">
                              <Calendar
                                mode="single"
                                selected={selectedDateRange.from}
                                onSelect={(date) =>
                                  setSelectedDateRange((prev) => ({
                                    ...prev,
                                    from: date || prev.from
                                  }))
                                }
                                defaultMonth={selectedDateRange.from}
                                className="w-full [&_.rdp-nav]:p-0 [&_.rdp-caption]:p-2 [&_.rdp-months]:p-2 pt-0"
                                showOutsideDays
                                fixedWeeks
                                locale={dateLocale}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="space-y-2">
                            <Label>To Date</Label>
                            <div className="border rounded-lg bg-card p-2">
                              <Calendar
                                mode="single"
                                selected={selectedDateRange.to}
                                onSelect={(date) =>
                                  setSelectedDateRange((prev) => ({
                                    ...prev,
                                    to: date
                                  }))
                                }
                                defaultMonth={selectedDateRange.to || selectedDateRange.from}
                                fromDate={selectedDateRange.from}
                                disabled={(date) =>
                                  selectedDateRange.from ? date < selectedDateRange.from : false
                                }
                                className="w-full [&_.rdp-nav]:p-0 [&_.rdp-caption]:p-2 [&_.rdp-months]:p-2 pt-0"
                                showOutsideDays
                                fixedWeeks
                                locale={dateLocale}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <DialogFooter>
                {showManager ? null : !shareUrl ? (
                  <div className="w-full flex flex-col sm:flex-row gap-2 sm:gap-4 sm:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowManager(true)}
                    >
                      <Layout className="h-4 w-4 mr-2" />
                      Manage Layouts
                    </Button>
                    <Button onClick={handleShare}>Create Share Link</Button>
                  </div>
                ) : (
                  <Button onClick={() => {
                    setShareUrl("")
                    setShareTitle("")
                    setOpen(false)
                  }} className="w-full sm:w-auto">
                    Close
                  </Button>
                )}
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }
)

ShareButton.displayName = "ShareButton" 