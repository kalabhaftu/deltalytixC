"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

interface FormData {
  number: string
  name: string
  propfirm: string
  startingBalance: number
  dailyDrawdownAmount: number
  maxDrawdownAmount: number
  evaluationType: 'one_step' | 'two_step'
  payoutCycleDays: number
  profitSplitPercent: number
}

export function SimpleAccountForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    number: '',
    name: '',
    propfirm: '',
    startingBalance: 100000,
    dailyDrawdownAmount: 5, // 5%
    maxDrawdownAmount: 10, // 10%
    evaluationType: 'two_step',
    payoutCycleDays: 14,
    profitSplitPercent: 80
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/prop-firm/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dailyDrawdownType: 'percent',
          maxDrawdownType: 'percent',
          drawdownModeMax: 'static'
        })
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Prop firm account created successfully!"
        })
        // Reset form
        setFormData({
          number: '',
          name: '',
          propfirm: '',
          startingBalance: 100000,
          dailyDrawdownAmount: 5,
          maxDrawdownAmount: 10,
          evaluationType: 'two_step',
          payoutCycleDays: 14,
          profitSplitPercent: 80
        })
      } else {
        throw new Error(result.message || 'Failed to create account')
      }
    } catch (error) {
      console.error('Error creating account:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create account',
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Prop Firm Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="number">Account Number *</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => setFormData({...formData, number: e.target.value})}
                placeholder="e.g., FTMO-123456"
                required
              />
            </div>
            <div>
              <Label htmlFor="name">Account Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., FTMO Challenge Account"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="propfirm">Prop Firm *</Label>
            <Input
              id="propfirm"
              value={formData.propfirm}
              onChange={(e) => setFormData({...formData, propfirm: e.target.value})}
              placeholder="e.g., FTMO, MyForexFunds, etc."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startingBalance">Starting Balance ($) *</Label>
              <Input
                id="startingBalance"
                type="number"
                value={formData.startingBalance}
                onChange={(e) => setFormData({...formData, startingBalance: Number(e.target.value)})}
                min={1000}
                max={10000000}
                required
              />
            </div>
            <div>
              <Label htmlFor="evaluationType">Evaluation Type</Label>
              <Select 
                value={formData.evaluationType}
                onValueChange={(value) => setFormData({...formData, evaluationType: value as 'one_step' | 'two_step'})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one_step">One Step (Phase 1 → Funded)</SelectItem>
                  <SelectItem value="two_step">Two Step (Phase 1 → Phase 2 → Funded)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dailyDrawdownAmount">Daily Drawdown (%)</Label>
              <Input
                id="dailyDrawdownAmount"
                type="number"
                value={formData.dailyDrawdownAmount}
                onChange={(e) => setFormData({...formData, dailyDrawdownAmount: Number(e.target.value)})}
                min={0}
                max={100}
                step={0.1}
              />
            </div>
            <div>
              <Label htmlFor="maxDrawdownAmount">Max Drawdown (%)</Label>
              <Input
                id="maxDrawdownAmount"
                type="number"
                value={formData.maxDrawdownAmount}
                onChange={(e) => setFormData({...formData, maxDrawdownAmount: Number(e.target.value)})}
                min={0}
                max={100}
                step={0.1}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payoutCycleDays">Payout Cycle (Days)</Label>
              <Select 
                value={formData.payoutCycleDays.toString()}
                onValueChange={(value) => setFormData({...formData, payoutCycleDays: Number(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Weekly (7 days)</SelectItem>
                  <SelectItem value="14">Bi-weekly (14 days)</SelectItem>
                  <SelectItem value="30">Monthly (30 days)</SelectItem>
                  <SelectItem value="60">Bi-monthly (60 days)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="profitSplitPercent">Profit Split (%)</Label>
              <Input
                id="profitSplitPercent"
                type="number"
                value={formData.profitSplitPercent}
                onChange={(e) => setFormData({...formData, profitSplitPercent: Number(e.target.value)})}
                min={0}
                max={100}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}


