'use client'

import { classifyTrade } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { useMemo } from 'react'
import {
    Area,
    AreaChart,
    Bar,
    // @ts-ignore
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    XAxis,
    YAxis
} from 'recharts'

interface DiverseChartsProps {
    trades: any[]
}

export function DiverseCharts({ trades }: DiverseChartsProps) {
    const equityData = useMemo(() => {
        if (!trades || trades.length === 0) return []
        
        const sorted = [...trades].sort((a, b) => {
            const dateA = a.entryDate ? new Date(a.entryDate).getTime() : 0
            const dateB = b.entryDate ? new Date(b.entryDate).getTime() : 0
            return dateA - dateB
        })

        let cumulative = 0
        return sorted.map((t, idx) => {
            const net = (t.pnl || 0) + (t.commission || 0)
            cumulative += net
            return {
                name: t.entryDate ? format(parseISO(t.entryDate), 'MMM dd') : `T${idx+1}`,
                date: t.entryDate,
                equity: cumulative,
                netPnL: net
            }
        })
    }, [trades])

    const outcomeData = useMemo(() => {
        if (!trades || trades.length === 0) return []
        let wins = 0; let losses = 0; let breakevens = 0
        
        trades.forEach(t => {
            const net = (t.pnl || 0) + (t.commission || 0)
            const outcome = classifyTrade(net)
            if (outcome === 'win') wins++
            else if (outcome === 'loss') losses++
            else breakevens++
        })

        return [
            { name: 'Wins', value: wins, color: 'hsl(var(--long))' },
            { name: 'Losses', value: losses, color: 'hsl(var(--short))' },
            { name: 'Breakeven', value: breakevens, color: 'hsl(var(--muted-foreground))' }
        ].filter(d => d.value > 0)
    }, [trades])

    const dayOfWeekData = useMemo(() => {
        if (!trades || trades.length === 0) return []
        
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const dayStats: Record<string, { win: number; loss: number }> = {}
        
        days.forEach(d => { dayStats[d] = { win: 0, loss: 0 }})

        trades.forEach(t => {
            if (!t.entryDate) return
            const date = new Date(t.entryDate.includes('Z') ? t.entryDate : `${t.entryDate}Z`)
            const dayName = days[date.getDay()]
            
            const net = (t.pnl || 0) + (t.commission || 0)
            const outcome = classifyTrade(net)
            
            if (outcome === 'win') dayStats[dayName].win += net
            else if (outcome === 'loss') dayStats[dayName].loss += Math.abs(net)
        })

        return days.map(day => ({
            name: day.substring(0, 3),
            Win: Number(dayStats[day].win.toFixed(2)),
            Loss: Number(dayStats[day].loss.toFixed(2))
        })).filter(d => d.Win > 0 || d.Loss > 0)
    }, [trades])

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-card border border-border/50 p-3 rounded-lg shadow-xl !backdrop-blur-md">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground/70 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 mb-1 border-b border-border/20 pb-1 last:border-0 last:pb-0 last:mb-0">
                            <span className="text-xs font-medium text-foreground capitalize" style={{ color: entry.color }}>
                                {entry.name}:
                            </span>
                            <span className="text-xs font-mono font-bold">
                                {entry.name === 'equity' || entry.name === 'Win' || entry.name === 'Loss' ? '$' : ''}
                                {typeof entry.value === 'number' && entry.value % 1 !== 0 ? entry.value.toFixed(2) : entry.value}
                            </span>
                        </div>
                    ))}
                </div>
            )
        }
        return null
    }

    if (!trades || trades.length === 0) return null

    return (
        <div className="space-y-6">
            <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-muted-foreground">Portfolio Visualizations</h2>
            
            {/* Top Row: Equity Curve & Outcome Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Cumulative Equity Curve (Area Chart) */}
                <div className="lg:col-span-2 bg-muted/10 border border-border/40 rounded-2xl p-6 h-[320px] flex flex-col">
                    <h3 className="text-[10px] uppercase font-black text-muted-foreground mb-4">Cumulative Equity Curve</h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={equityData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} 
                                    minTickGap={30}
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                    tickFormatter={(val) => `$${val}`}
                                />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="equity" 
                                    name="Equity"
                                    stroke="hsl(var(--primary))" 
                                    strokeWidth={3}
                                    fillOpacity={1} 
                                    fill="url(#colorEquity)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Outcome Distribution (Donut Chart) */}
                <div className="bg-muted/10 border border-border/40 rounded-2xl p-6 h-[320px] flex flex-col">
                    <h3 className="text-[10px] uppercase font-black text-muted-foreground mb-4">Outcome Distribution</h3>
                    <div className="flex-1 w-full min-h-0 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={outcomeData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {outcomeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black">{trades.length}</span>
                            <span className="text-[9px] uppercase font-bold text-muted-foreground">Trades</span>
                        </div>
                    </div>
                    {/* Custom Legend */}
                    <div className="flex justify-center gap-4 mt-2">
                        {outcomeData.map((entry, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{entry.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Bottom Row: Day of Week Performance (Bar Chart) */}
            <div className="bg-muted/10 border border-border/40 rounded-2xl p-6 h-[320px] flex flex-col">
                <h3 className="text-[10px] uppercase font-black text-muted-foreground mb-4">Performance by Day of Week</h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickFormatter={(val) => `$${Math.abs(val)}`}
                            />
                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.2)' }} />
                            <Bar dataKey="Win" name="Gross Win" fill="hsl(var(--long))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="Loss" name="Gross Loss" fill="hsl(var(--short))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

        </div>
    )
}
