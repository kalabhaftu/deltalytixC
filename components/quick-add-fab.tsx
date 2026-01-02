'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface QuickAddFABProps {
    className?: string
}

export function QuickAddFAB({ className }: QuickAddFABProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        instrument: '',
        side: 'long' as 'long' | 'short',
        pnl: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.instrument || !formData.pnl) {
            toast.error('Please fill in all fields')
            return
        }

        setIsSubmitting(true)

        try {
            const response = await fetch('/api/trades/quick-add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instrument: formData.instrument.toUpperCase(),
                    side: formData.side,
                    pnl: parseFloat(formData.pnl),
                    entryDate: new Date().toISOString()
                })
            })

            if (response.ok) {
                toast.success('Trade added successfully')
                setFormData({ instrument: '', side: 'long', pnl: '' })
                setIsOpen(false)
                // Reload page to refresh data
                window.location.reload()
            } else {
                throw new Error('Failed to add trade')
            }
        } catch (error) {
            toast.error('Failed to add trade')
        } finally {
            setIsSubmitting(false)
        }
    }

    const pnlValue = parseFloat(formData.pnl) || 0

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    size="icon"
                    className={cn(
                        "fixed bottom-28 right-6 h-14 w-14 rounded-full shadow-lg z-[60]",
                        "bg-primary hover:bg-primary/90 text-primary-foreground",
                        "lg:hidden", // Match bottom nav breakpoint
                        "shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]", // Subtle glow
                        className
                    )}
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Quick Add Trade</DialogTitle>
                    <DialogDescription>
                        Add a trade with just the essentials
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="instrument">Instrument</Label>
                        <Input
                            id="instrument"
                            placeholder="e.g., ES, NQ, EURUSD"
                            value={formData.instrument}
                            onChange={(e) => setFormData(prev => ({ ...prev, instrument: e.target.value }))}
                            className="uppercase"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Direction</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={formData.side === 'long' ? 'default' : 'outline'}
                                className={cn(
                                    "flex-1 gap-2",
                                    formData.side === 'long' && "bg-green-600 hover:bg-green-700"
                                )}
                                onClick={() => setFormData(prev => ({ ...prev, side: 'long' }))}
                            >
                                <TrendingUp className="h-4 w-4" />
                                Long
                            </Button>
                            <Button
                                type="button"
                                variant={formData.side === 'short' ? 'default' : 'outline'}
                                className={cn(
                                    "flex-1 gap-2",
                                    formData.side === 'short' && "bg-red-600 hover:bg-red-700"
                                )}
                                onClick={() => setFormData(prev => ({ ...prev, side: 'short' }))}
                            >
                                <TrendingDown className="h-4 w-4" />
                                Short
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pnl">P&L ($)</Label>
                        <Input
                            id="pnl"
                            type="number"
                            step="0.01"
                            placeholder="e.g., 150 or -50"
                            value={formData.pnl}
                            onChange={(e) => setFormData(prev => ({ ...prev, pnl: e.target.value }))}
                            className={cn(
                                pnlValue > 0 && "text-green-500 border-green-500/50",
                                pnlValue < 0 && "text-red-500 border-red-500/50"
                            )}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Adding...' : 'Add Trade'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
