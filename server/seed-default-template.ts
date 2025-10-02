'use server'

import { prisma } from '@/lib/prisma'
import { getUserId } from './auth-utils'

const DEFAULT_LAYOUT = [
  // Row 1: KPI Widgets (5 columns)
  { i: 'kpi-1', type: 'accountBalancePnl', size: 'kpi', x: 0, y: 0, w: 1, h: 1 },
  { i: 'kpi-2', type: 'tradeWinRate', size: 'kpi', x: 1, y: 0, w: 1, h: 1 },
  { i: 'kpi-3', type: 'dayWinRate', size: 'kpi', x: 2, y: 0, w: 1, h: 1 },
  { i: 'kpi-4', type: 'profitFactor', size: 'kpi', x: 3, y: 0, w: 1, h: 1 },
  { i: 'kpi-5', type: 'avgWinLoss', size: 'kpi', x: 4, y: 0, w: 1, h: 1 },
  // Row 2: Current Streak (full width)
  { i: 'current-streak', type: 'currentStreak', size: 'kpi', x: 0, y: 1, w: 5, h: 1 },
  // Row 3: 3 Chart Widgets (3 equal columns - independent layout)
  { i: 'net-daily-pnl', type: 'netDailyPnL', size: 'small-long', x: 0, y: 2, w: 3, h: 2 },
  { i: 'daily-cumulative-pnl', type: 'dailyCumulativePnL', size: 'small-long', x: 3, y: 2, w: 3, h: 2 },
  { i: 'account-balance', type: 'accountBalanceChart', size: 'small-long', x: 6, y: 2, w: 3, h: 2 },
  // Row 4: Calendar (full width)
  { i: 'advanced-calendar', type: 'calendarAdvanced', size: 'extra-large', x: 0, y: 4, w: 12, h: 12 },
]

/**
 * Ensure the current user has a default template
 * Called on first dashboard load
 */
export async function ensureDefaultTemplate() {
  try {
    const userId = await getUserId()

    // Check if user has any templates
    const existingTemplates = await prisma.dashboardTemplate.findMany({
      where: { userId },
    })

    if (existingTemplates.length === 0) {
      // Create default template
      await prisma.dashboardTemplate.create({
        data: {
          userId,
          name: 'Default',
          isDefault: true,
          isActive: true,
          layout: DEFAULT_LAYOUT,
        },
      })
    } else {
      // Ensure there's an active template
      const hasActive = existingTemplates.some(t => t.isActive)
      if (!hasActive) {
        const defaultTemplate = existingTemplates.find(t => t.isDefault) || existingTemplates[0]
        await prisma.dashboardTemplate.update({
          where: { id: defaultTemplate.id },
          data: { isActive: true },
        })
      }
    }
  } catch (error) {
    console.error('Failed to ensure default template:', error)
  }
}
