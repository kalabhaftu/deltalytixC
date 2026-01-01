import React from 'react'
import { Label } from '@/components/ui/label'
import { MARKET_BIAS_OPTIONS } from '@/lib/constants'
import { TagSelector } from '@/app/dashboard/components/tags/tag-selector'
import { MarketBias } from '@/types/trade-extended'
import { cn } from '@/lib/utils'

interface Rule {
    text: string
    category: 'entry' | 'exit' | 'risk' | 'general'
}

interface TradingModel {
    id: string
    name: string
    rules: (string | Rule)[]
    notes?: string | null
}

interface TradeStrategyTabProps {
    marketBias: MarketBias | null
    setMarketBias: (bias: MarketBias | null) => void
    orderType: string | null
    setOrderType: (type: string | null) => void
    selectedModelId: string | null
    setModelId: (id: string | null) => void
    tradingModels: TradingModel[]
    selectedModel: TradingModel | null
    setSelectedModel: (model: TradingModel | null) => void
    selectedRules: string[]
    setSelectedRules: (rules: string[]) => void
    selectedTags: string[]
    setSelectedTags: (tags: string[]) => void
}

export function TradeStrategyTab({
    marketBias,
    setMarketBias,
    orderType,
    setOrderType,
    selectedModelId,
    setModelId,
    tradingModels,
    selectedModel,
    setSelectedModel,
    selectedRules,
    setSelectedRules,
    selectedTags,
    setSelectedTags
}: TradeStrategyTabProps) {
    const compliance = selectedModel && selectedModel.rules.length > 0
        ? (selectedRules.length / selectedModel.rules.length) * 100
        : 0

    return (
        <div className="space-y-8 px-1">
            {/* Market Bias */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Contextual Bias</h3>
                    <p className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-wider">Overall market sentiment for this execution</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {MARKET_BIAS_OPTIONS.map(({ value, label, activeClass }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setMarketBias(value as MarketBias)}
                            className={cn(
                                "py-3 px-4 border rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all",
                                marketBias === value
                                    ? activeClass
                                    : 'bg-muted/10 hover:bg-muted/20 border-border/40 text-muted-foreground'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                {/* Order Type */}
                <div className="space-y-3">
                    <Label htmlFor="order-type" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Execution Logic</Label>
                    <select
                        id="order-type"
                        value={orderType || ''}
                        onChange={(e) => setOrderType(e.target.value || null)}
                        className="w-full h-11 rounded-xl border border-border/40 bg-muted/10 px-4 py-1 text-xs font-bold uppercase tracking-tighter focus:border-primary/50 focus:ring-0 transition-all cursor-pointer"
                    >
                        <option value="">UNCATEGORIZED</option>
                        <option value="market">MARKET ORDER</option>
                        <option value="limit">LIMIT ORDER</option>
                    </select>
                </div>

                {/* Trading Model */}
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Trading System (Model)</Label>
                    <select
                        value={selectedModelId || ''}
                        onChange={(e) => {
                            const modelId = e.target.value || null
                            setModelId(modelId)
                            const model = tradingModels.find(m => m.id === modelId)
                            setSelectedModel(model || null)
                            if (modelId !== selectedModelId) {
                                setSelectedRules([])
                            }
                        }}
                        className="w-full h-11 rounded-xl border border-border/40 bg-muted/10 px-4 py-1 text-xs font-bold uppercase tracking-tighter focus:border-primary/50 focus:ring-0 transition-all cursor-pointer"
                    >
                        <option value="">NO ACTIVE MODEL</option>
                        {tradingModels.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.name.toUpperCase()}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedModel && selectedModel.rules.length > 0 && (
                <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">Verification Protocol</Label>
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full",
                            compliance === 100 ? "bg-long/10 text-long" : compliance > 50 ? "bg-amber-500/10 text-amber-500" : "bg-short/10 text-short"
                        )}>
                            Compliance: {compliance.toFixed(0)}%
                        </span>
                    </div>

                    <div className="space-y-6 border border-border/40 rounded-2xl p-6 bg-muted/5">
                        {(['entry', 'exit', 'risk', 'general'] as const).map(cat => {
                            const catRules = selectedModel.rules.filter(r =>
                                (typeof r === 'string' && cat === 'general') || (typeof r === 'object' && r.category === cat)
                            )
                            if (catRules.length === 0) return null

                            return (
                                <div key={cat} className="space-y-3">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/70">{cat} criteria</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        {catRules.map((rule, idx) => {
                                            const ruleText = typeof rule === 'string' ? rule : rule.text
                                            return (
                                                <label key={idx} className="flex items-center gap-3 cursor-pointer group py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRules.includes(ruleText)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRules([...selectedRules, ruleText])
                                                            } else {
                                                                setSelectedRules(selectedRules.filter(r => r !== ruleText))
                                                            }
                                                        }}
                                                        className="h-4 w-4 rounded-md border-border/40 bg-muted/20 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                                    />
                                                    <span className="text-xs font-bold text-muted-foreground/80 group-hover:text-foreground transition-colors uppercase tracking-tight">{ruleText}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Tags */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trade Tags</Label>
                </div>
                <div className="p-1">
                    <TagSelector
                        selectedTagIds={selectedTags}
                        onChange={setSelectedTags}
                    />
                </div>
            </div>
        </div>
    )
}
