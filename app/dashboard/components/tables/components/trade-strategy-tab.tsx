
import React from 'react'
import { Label } from '@/components/ui/label'
import { MARKET_BIAS_OPTIONS } from '@/lib/constants'
import { TagSelector } from '@/app/dashboard/components/tags/tag-selector'
import { MarketBias } from '@/types/trade-extended'

interface TradingModel {
    id: string
    name: string
    rules: string[]
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
    return (
        <div className="space-y-6 px-1">
            {/* Market Bias */}
            <div className="space-y-4">
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">Market Bias</h3>
                    <p className="text-xs text-muted-foreground">What was your overall market sentiment for this trade?</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {MARKET_BIAS_OPTIONS.map(({ value, label, activeClass }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setMarketBias(value as MarketBias)}
                            className={`py-2.5 px-4 border rounded-md text-sm font-medium transition-all ${marketBias === value
                                ? activeClass
                                : 'bg-background hover:bg-muted/50 border-input'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                {/* Order Type */}
                <div className="space-y-2">
                    <Label htmlFor="order-type" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Execution Type</Label>
                    <select
                        id="order-type"
                        value={orderType || ''}
                        onChange={(e) => setOrderType(e.target.value || null)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:border-primary/50 focus:ring-0 transition-colors"
                    >
                        <option value="">Not specified</option>
                        <option value="market">Market Order</option>
                        <option value="limit">Limit Order</option>
                    </select>
                </div>

                {/* Trading Model */}
                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trading Model</Label>
                    <select
                        value={selectedModelId || ''}
                        onChange={(e) => {
                            const modelId = e.target.value || null
                            setModelId(modelId)
                            const model = tradingModels.find(m => m.id === modelId)
                            setSelectedModel(model || null)
                            // Note: We don't clear selectedRules here in the parent logic automatically, 
                            // but we should respect the parent's handler logic if it differs.
                            // In this refactor, we are just triggering the props.
                            if (modelId !== selectedModelId) {
                                setSelectedRules([])
                            }
                        }}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:border-primary/50 focus:ring-0 transition-colors"
                    >
                        <option value="">No model selected</option>
                        {tradingModels.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {selectedModel && selectedModel.rules.length > 0 && (
                <div className="space-y-3 pt-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Verification Rules</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 border rounded-lg p-4 bg-muted/20">
                        {selectedModel.rules.map((rule, idx) => (
                            <label key={idx} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={selectedRules.includes(rule)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedRules([...selectedRules, rule])
                                        } else {
                                            setSelectedRules(selectedRules.filter(r => r !== rule))
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                />
                                <span className="text-sm text-foreground group-hover:text-primary transition-colors">{rule}</span>
                            </label>
                        ))}
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
