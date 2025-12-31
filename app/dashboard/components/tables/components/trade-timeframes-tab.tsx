
import React from 'react'
import { Label } from '@/components/ui/label'
import { TIMEFRAME_OPTIONS } from '@/lib/constants'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'

interface TradeTimeframesTabProps {
    biasTimeframe: string | null
    setBiasTimeframe: (value: string | null) => void
    structureTimeframe: string | null
    setStructureTimeframe: (value: string | null) => void
    narrativeTimeframe: string | null
    setNarrativeTimeframe: (value: string | null) => void
    entryTimeframe: string | null
    setEntryTimeframe: (value: string | null) => void
    chartLinks: string[]
    setChartLinks: (links: string[]) => void
}

export function TradeTimeframesTab({
    biasTimeframe,
    setBiasTimeframe,
    structureTimeframe,
    setStructureTimeframe,
    narrativeTimeframe,
    setNarrativeTimeframe,
    entryTimeframe,
    setEntryTimeframe,
    chartLinks,
    setChartLinks
}: TradeTimeframesTabProps) {
    return (
        <div className="space-y-8 px-1">
            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Multi-Timeframe Analysis</h3>
                    <p className="text-xs text-muted-foreground">Select the timeframes used for each stage of your analysis.</p>
                </div>

                <div className="grid grid-cols-1 gap-5 max-w-md">
                    {/* Bias Timeframe */}
                    <div className="space-y-2">
                        <Label htmlFor="bias-timeframe" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bias</Label>
                        <select
                            id="bias-timeframe"
                            value={biasTimeframe || ''}
                            onChange={(e) => setBiasTimeframe(e.target.value || null)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus:border-primary/50 focus:ring-0"
                        >
                            <option value="">None</option>
                            {TIMEFRAME_OPTIONS.map(tf => (
                                <option key={tf.value} value={tf.value}>{tf.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Structure Timeframe */}
                    <div className="space-y-2">
                        <Label htmlFor="structure-timeframe" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Structure</Label>
                        <select
                            id="structure-timeframe"
                            value={structureTimeframe || ''}
                            onChange={(e) => setStructureTimeframe(e.target.value || null)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus:border-primary/50 focus:ring-0"
                        >
                            <option value="">None</option>
                            {TIMEFRAME_OPTIONS.map(tf => (
                                <option key={tf.value} value={tf.value}>{tf.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Narrative Timeframe */}
                    <div className="space-y-2">
                        <Label htmlFor="narrative-timeframe" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Narrative</Label>
                        <select
                            id="narrative-timeframe"
                            value={narrativeTimeframe || ''}
                            onChange={(e) => setNarrativeTimeframe(e.target.value || null)}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm transition-colors focus:border-primary/50 focus:ring-0"
                        >
                            <option value="">None</option>
                            {TIMEFRAME_OPTIONS.map(tf => (
                                <option key={tf.value} value={tf.value}>{tf.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Entry Timeframe */}
                    <div className="space-y-2">
                        <Label htmlFor="entry-timeframe" className="text-[10px] font-bold uppercase tracking-wider text-primary">Entry</Label>
                        <select
                            id="entry-timeframe"
                            value={entryTimeframe || ''}
                            onChange={(e) => setEntryTimeframe(e.target.value || null)}
                            className="w-full h-9 rounded-md border border-primary/30 bg-background px-3 py-1 text-sm transition-colors focus:border-primary focus:ring-0 font-medium"
                        >
                            <option value="">None</option>
                            {TIMEFRAME_OPTIONS.map(tf => (
                                <option key={tf.value} value={tf.value}>{tf.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Chart Links */}
            <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Chart Analysis Links</h3>
                    <p className="text-xs text-muted-foreground">Add links to your TradingView chart analysis (up to 8)</p>
                </div>
                <div className="space-y-3 max-w-2xl">
                    {chartLinks.map((link, index) => (
                        <div key={index} className="flex items-center gap-2 group">
                            <div className="flex-1">
                                <Input
                                    type="text"
                                    placeholder="https://www.tradingview.com/x/..."
                                    value={link}
                                    onChange={(e) => {
                                        const newLinks = [...chartLinks]
                                        newLinks[index] = e.target.value
                                        setChartLinks(newLinks)
                                    }}
                                    className="text-sm h-9 bg-muted/20 border-border/50 focus:bg-background transition-all"
                                />
                            </div>
                            {index >= 4 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 text-muted-foreground hover:text-destructive transition-colors"
                                    onClick={() => {
                                        const newLinks = chartLinks.filter((_, i) => i !== index)
                                        setChartLinks(newLinks)
                                    }}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                    {chartLinks.length < 8 && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setChartLinks([...chartLinks, ''])}
                            className="w-full h-9 border-dashed border-border/60 hover:border-primary/50 text-muted-foreground hover:text-primary transition-all"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Analysis Link ({chartLinks.length}/8)
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
