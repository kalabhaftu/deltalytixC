'use server'

import { prisma, safeDbOperation } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getUserId } from './auth-utils'

export interface WidgetLayout {
  i: string
  type: string
  size: string
  x: number
  y: number
  w: number
  h: number
}

export interface DashboardTemplate {
  id: string
  userId: string
  name: string
  isDefault: boolean
  isActive: boolean
  layout: WidgetLayout[]
  createdAt: Date
  updatedAt: Date
}

// Global default layout - immutable, always fresh
// Cannot export non-function from 'use server' file, so keep internal
const DEFAULT_LAYOUT: WidgetLayout[] = [
  // Row 0: KPI Widgets (5 slots) - Move to the very top
  { i: 'kpi-1', type: 'accountBalancePnl', size: 'kpi', x: 0, y: 0, w: 1, h: 1 },
  { i: 'kpi-2', type: 'tradeWinRate', size: 'kpi', x: 1, y: 0, w: 1, h: 1 },
  { i: 'kpi-3', type: 'dayWinRate', size: 'kpi', x: 2, y: 0, w: 1, h: 1 },
  { i: 'kpi-4', type: 'profitFactor', size: 'kpi', x: 3, y: 0, w: 1, h: 1 },
  { i: 'kpi-5', type: 'avgWinLoss', size: 'kpi', x: 4, y: 0, w: 1, h: 1 },
  // Row 1: Recent Trades (left, smaller) and Mini Calendar (right, larger)
  { i: 'recent-trades', type: 'recentTrades', size: 'small', x: 0, y: 1, w: 4, h: 3 },
  { i: 'mini-calendar', type: 'calendarMini', size: 'large', x: 4, y: 1, w: 8, h: 3 },
  // Row 2: 3 Chart Widgets
  { i: 'net-daily-pnl', type: 'netDailyPnL', size: 'small-long', x: 0, y: 4, w: 4, h: 3 },
  { i: 'daily-cumulative-pnl', type: 'dailyCumulativePnL', size: 'small-long', x: 4, y: 4, w: 4, h: 3 },
  { i: 'account-balance', type: 'accountBalanceChart', size: 'small-long', x: 8, y: 4, w: 4, h: 3 },
  // Row 3: 3 More Charts
  { i: 'weekday-pnl', type: 'weekdayPnL', size: 'small-long', x: 0, y: 7, w: 4, h: 3 },
  { i: 'trade-duration', type: 'tradeDurationPerformance', size: 'small-long', x: 4, y: 7, w: 4, h: 3 },
  { i: 'pnl-by-strategy', type: 'pnlByStrategy', size: 'small-long', x: 8, y: 7, w: 4, h: 3 },
  // Row 4: 3 Performance/Analysis Widgets
  { i: 'performance-score', type: 'performanceScore', size: 'small-long', x: 0, y: 10, w: 4, h: 3 },
  { i: 'pnl-by-instrument', type: 'pnlByInstrument', size: 'small-long', x: 4, y: 10, w: 4, h: 3 },
  { i: 'win-rate-by-strategy', type: 'winRateByStrategy', size: 'small-long', x: 8, y: 10, w: 4, h: 3 },
  // Row 5: Full Calendar at the bottom (full width)
  { i: 'calendar-advanced', type: 'calendarAdvanced', size: 'extra-large', x: 0, y: 13, w: 12, h: 4 },
]

/**
 * Get the default layout - used for default template and new templates
 */
export async function getDefaultLayout(): Promise<WidgetLayout[]> {
  return DEFAULT_LAYOUT
}

/**
 * Get all templates for the current user
 */
export async function getUserTemplates(): Promise<DashboardTemplate[]> {
  const userId = await getUserId()

  const templates = await safeDbOperation(
    () => prisma.dashboardTemplate.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { createdAt: 'asc' },
      ],
    }),
    [] // Return empty array if database is unavailable
  )

  return (templates || []).map(t => JSON.parse(JSON.stringify({
    ...t,
    layout: t.layout as unknown as WidgetLayout[],
  })))
}

/**
 * Get the active template for the current user
 */
export async function getActiveTemplate(): Promise<DashboardTemplate | null> {
  try {
    const userId = await getUserId()
    if (!userId) return null

    const template = await safeDbOperation(
      () => prisma.dashboardTemplate.findFirst({
        where: {
          userId,
          isActive: true,
        },
      }),
      null
    )

    if (!template) return null

    // If it's the default template, always return the global DEFAULT_LAYOUT
    if (template.isDefault) {
      return JSON.parse(JSON.stringify({
        ...template,
        layout: DEFAULT_LAYOUT,
      }))
    }

    return JSON.parse(JSON.stringify({
      ...template,
      layout: template.layout as unknown as WidgetLayout[],
    }))
  } catch (error) {
    console.error('getActiveTemplate failed:', error)
    return null
  }
}

/**
 * Initialize default template for new users
 */
export async function initializeDefaultTemplate(userId: string): Promise<DashboardTemplate> {
  const existingDefault = await safeDbOperation(
    () => prisma.dashboardTemplate.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    }),
    null
  )

  if (existingDefault) {
    return {
      ...existingDefault,
      layout: existingDefault.layout as unknown as WidgetLayout[],
    }
  }

  // Get the default layout first
  const layout = await getDefaultLayout()

  const template = await safeDbOperation(
    () => prisma.dashboardTemplate.create({
      data: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        userId,
        name: 'Default',
        isDefault: true,
        isActive: true,
        layout: layout as any,
      },
    }),
    null
  )

  if (!template) {
    throw new Error('Failed to create default template')
  }

  return {
    ...template,
    layout: template.layout as unknown as WidgetLayout[],
  }
}

/**
 * Create a new template for the current user
 */
export async function createTemplate(name: string): Promise<DashboardTemplate> {
  try {
    const userId = await getUserId()
    if (!userId) throw new Error('Authentication required')

    // Check if name already exists for this user
    const existing = await safeDbOperation(
      () => prisma.dashboardTemplate.findFirst({
        where: {
          userId,
          name: {
            equals: name,
            mode: 'insensitive'
          }
        },
      }),
      null
    )

    if (existing) {
      throw new Error(`A template with the name "${name}" already exists.`)
    }

    // Deactivate current active template
    await safeDbOperation(() =>
      prisma.dashboardTemplate.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      })
    )

    // Create new template
    const template = await safeDbOperation(() =>
      prisma.dashboardTemplate.create({
        data: {
          id: crypto.randomUUID(),
          updatedAt: new Date(),
          userId,
          name,
          isActive: true,
          isDefault: false,
          layout: DEFAULT_LAYOUT as any,
        },
      })
    )

    if (!template) {
      throw new Error('Failed to create template record')
    }

    revalidatePath('/dashboard')

    // Explicitly serialize to plain object for Vercel stability
    return JSON.parse(JSON.stringify({
      ...template,
      layout: template.layout as unknown as WidgetLayout[],
    }))
  } catch (error) {
    console.error('createTemplate failed:', error)
    throw error // Re-throw for client-side catch
  }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
  try {
    const userId = await getUserId()
    if (!userId) throw new Error('Authentication required')

    const template = await safeDbOperation(() =>
      prisma.dashboardTemplate.findUnique({
        where: { id },
      })
    )

    if (!template || template.userId !== userId) {
      throw new Error('Template not found')
    }

    if (template.isDefault) {
      throw new Error('Cannot delete default template')
    }

    // If deleting active template, make default active
    if (template.isActive) {
      await safeDbOperation(() =>
        prisma.dashboardTemplate.updateMany({
          where: { userId, isDefault: true },
          data: { isActive: true },
        })
      )
    }

    await safeDbOperation(() =>
      prisma.dashboardTemplate.delete({
        where: { id },
      })
    )

    revalidatePath('/dashboard')
  } catch (error) {
    console.error('deleteTemplate failed:', error)
    throw error
  }
}

/**
 * Switch to a different template
 */
export async function switchTemplate(id: string): Promise<DashboardTemplate> {
  try {
    const userId = await getUserId()
    if (!userId) throw new Error('Authentication required')

    // Deactivate all
    await safeDbOperation(() =>
      prisma.dashboardTemplate.updateMany({
        where: { userId, isActive: true },
        data: { isActive: false },
      })
    )

    // Activate the selected one
    const template = await safeDbOperation(() =>
      prisma.dashboardTemplate.update({
        where: { id },
        data: { isActive: true },
      })
    )

    if (!template) {
      throw new Error('Template not found')
    }

    revalidatePath('/dashboard')

    return JSON.parse(JSON.stringify({
      ...template,
      layout: template.isDefault ? DEFAULT_LAYOUT : (template.layout as unknown as WidgetLayout[]),
    }))
  } catch (error) {
    console.error('switchTemplate failed:', error)
    throw error
  }
}

/**
 * Update the layout of a template
 */
export async function updateTemplateLayout(id: string, layout: WidgetLayout[]): Promise<DashboardTemplate> {
  try {
    const userId = await getUserId()
    if (!userId) throw new Error('Authentication required')

    const template = await safeDbOperation(() =>
      prisma.dashboardTemplate.findUnique({
        where: { id },
      })
    )

    if (!template || template.userId !== userId) {
      throw new Error('Template not found')
    }

    if (template.isDefault) {
      throw new Error('Cannot modify default template layout')
    }

    const updated = await safeDbOperation(() =>
      prisma.dashboardTemplate.update({
        where: { id },
        data: {
          layout: layout as any,
          updatedAt: new Date()
        },
      })
    )

    if (!updated) {
      throw new Error('Failed to update template layout')
    }

    revalidatePath('/dashboard')

    return JSON.parse(JSON.stringify({
      ...updated,
      layout: updated.layout as unknown as WidgetLayout[],
    }))
  } catch (error) {
    console.error('updateTemplateLayout failed:', error)
    throw error
  }
}
