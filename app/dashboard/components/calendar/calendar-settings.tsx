
'use client'

import { Check, Settings2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Command, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { useCalendarViewStore, VisibleStats } from "@/store/calendar-view"
import { cn } from "@/lib/utils"

export function CalendarSettings() {
    const { visibleStats, setVisibleStats, showWeekNumbers, setShowWeekNumbers } = useCalendarViewStore()

    const stats: { key: keyof VisibleStats; label: string }[] = [
        { key: "pnl", label: "Daily P/L" },
        { key: "trades", label: "Number of Trades" },
        { key: "winRate", label: "Day Winrate" },
        { key: "rMultiple", label: "R Multiple" },
    ]

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 sm:w-auto sm:px-2.5 text-[11px] font-bold gap-1.5 border-dashed bg-transparent hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all"
                    title="Calendar Settings"
                >
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Settings</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                    <CommandList>
                        <CommandGroup heading="Layout">
                            <CommandItem
                                onSelect={() => setShowWeekNumbers(!showWeekNumbers)}
                                className="flex items-center justify-between py-2.5"
                            >
                                <span className="text-sm">Week Numbers</span>
                                {showWeekNumbers && (
                                    <Check className="h-4 w-4 text-primary" />
                                )}
                            </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Display Stats">
                            {stats.map((stat) => (
                                <CommandItem
                                    key={stat.key}
                                    onSelect={() => {
                                        setVisibleStats({ [stat.key]: !visibleStats[stat.key] })
                                    }}
                                    className="flex items-center justify-between py-2.5"
                                >
                                    <span className="text-sm">{stat.label}</span>
                                    {visibleStats[stat.key] && (
                                        <Check className="h-4 w-4 text-primary" />
                                    )}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
