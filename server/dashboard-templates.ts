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
  // Row 1: KPI Widgets (5 slots) - Only 5 KPI widgets shown by default
  { i: 'kpi-1', type: 'accountBalancePnl', size: 'kpi', x: 0, y: 0, w: 1, h: 1 },
  { i: 'kpi-2', type: 'tradeWinRate', size: 'kpi', x: 1, y: 0, w: 1, h: 1 },
  { i: 'kpi-3', type: 'dayWinRate', size: 'kpi', x: 2, y: 0, w: 1, h: 1 },
  { i: 'kpi-4', type: 'profitFactor', size: 'kpi', x: 3, y: 0, w: 1, h: 1 },
  { i: 'kpi-5', type: 'avgWinLoss', size: 'kpi', x: 4, y: 0, w: 1, h: 1 },
  // Row 2: Recent Trades (left, smaller) and Mini Calendar (right, larger)
  { i: 'recent-trades', type: 'recentTrades', size: 'small', x: 0, y: 1, w: 4, h: 2 },
  { i: 'mini-calendar', type: 'calendarMini', size: 'large', x: 4, y: 1, w: 8, h: 2 },
  // Row 3: 3 Chart Widgets (equal columns - 4 columns each in 12-column grid)
  { i: 'net-daily-pnl', type: 'netDailyPnL', size: 'small-long', x: 0, y: 3, w: 4, h: 2 },
  { i: 'daily-cumulative-pnl', type: 'dailyCumulativePnL', size: 'small-long', x: 4, y: 3, w: 4, h: 2 },
  { i: 'account-balance', type: 'accountBalanceChart', size: 'small-long', x: 8, y: 3, w: 4, h: 2 },
  // Row 4: 3 Standard Height Chart Widgets (equal columns - 4 columns each in 12-column grid)
  { i: 'weekday-pnl', type: 'weekdayPnL', size: 'small-long', x: 0, y: 5, w: 4, h: 2 },
  { i: 'trade-duration', type: 'tradeDurationPerformance', size: 'small-long', x: 4, y: 5, w: 4, h: 2 },
  { i: 'pnl-by-strategy', type: 'pnlByStrategy', size: 'small-long', x: 8, y: 5, w: 4, h: 2 },
  // Row 5: 3 Taller Performance/Analysis Widgets (equal columns - 4 columns each, TALLER height)
  { i: 'performance-score', type: 'performanceScore', size: 'small-long', x: 0, y: 7, w: 4, h: 3 },
  { i: 'pnl-by-instrument', type: 'pnlByInstrument', size: 'small-long', x: 4, y: 7, w: 4, h: 3 },
  { i: 'win-rate-by-strategy', type: 'winRateByStrategy', size: 'small-long', x: 8, y: 7, w: 4, h: 3 },
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

  return (templates || []).map(t => ({
    ...t,
    layout: t.layout as unknown as WidgetLayout[],
  }))
}

/**
 * Get the active template for the current user
 * If the active template is "Default", return the global DEFAULT_LAYOUT
 */
export async function getActiveTemplate(): Promise<DashboardTemplate | null> {
  const userId = await getUserId()

  const template = await safeDbOperation(
    () => prisma.dashboardTemplate.findFirst({
      where: {
        userId,
        isActive: true,
      },
    }),
    null // Return null if database is unavailable
  )

  if (!template) return null

  // If it's the default template, always return the global DEFAULT_LAYOUT
  if (template.isDefault) {
    return {
      ...template,
      layout: (await getDefaultLayout()) as any, // Always use fresh global layout
    }
  }

  return {
    ...template,
    layout: template.layout as unknown as WidgetLayout[],
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
 * Create a new template
 */
export async function createTemplate(name: string): Promise<DashboardTemplate> {
  const userId = await getUserId()

  // Check if name already exists
  const existing = await safeDbOperation(
    () => prisma.dashboardTemplate.findUnique({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
    }),
    null
  )

  if (existing) {
    throw new Error(`A template with the name "${name}" already exists. Please use a different name or delete the existing template.`)
  }

  // Always copy from the global DEFAULT_LAYOUT (not from user's default template)
  // This ensures new templates always start with the latest default layout
  const layout = await getDefaultLayout()

  const template = await safeDbOperation(
    () => prisma.dashboardTemplate.create({
      data: {
        userId,
        name,
        isDefault: false,
        isActive: false,
        layout: layout as any,
      },
    }),
    null
  )

  if (!template) {
    throw new Error('Failed to create template')
  }

  revalidatePath('/dashboard')

  return {
    ...template,
    layout: template.layout as unknown as WidgetLayout[],
  }
}

/**
 * Delete a template (cannot delete default template)
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const userId = await getUserId()

  const template = await safeDbOperation(
    () => prisma.dashboardTemplate.findUnique({
      where: { id: templateId },
    }),
    null
  )

  if (!template) {
    throw new Error('Template not found')
  }

  if (template.userId !== userId) {
    throw new Error('Unauthorized')
  }

  if (template.isDefault) {
    throw new Error('Cannot delete the default template')
  }

  // If deleting active template, switch to default
  if (template.isActive) {
    await safeDbOperation(
      () => prisma.dashboardTemplate.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isActive: true,
        },
      })
    )
  }

  await safeDbOperation(
    () => prisma.dashboardTemplate.delete({
      where: { id: templateId },
    })
  )

  revalidatePath('/dashboard')
}

/**
 * Switch to a different template
 */
export async function switchTemplate(templateId: string): Promise<DashboardTemplate> {
  const userId = await getUserId()

  const template = await safeDbOperation(
    () => prisma.dashboardTemplate.findUnique({
      where: { id: templateId },
    }),
    null
  )

  if (!template || template.userId !== userId) {
    throw new Error('Template not found')
  }

  // Deactivate all templates
  await safeDbOperation(
    () => prisma.dashboardTemplate.updateMany({
      where: { userId },
      data: { isActive: false },
    })
  )

  // Activate selected template
  const updated = await safeDbOperation(
    () => prisma.dashboardTemplate.update({
      where: { id: templateId },
      data: { isActive: true },
    }),
    null
  )

  if (!updated) {
    throw new Error('Failed to update template')
  }

  revalidatePath('/dashboard')

  // If it's the default template, always return the global DEFAULT_LAYOUT
  if (updated.isDefault) {
    return {
      ...updated,
      layout: (await getDefaultLayout()) as any,
    }
  }

  return {
    ...updated,
    layout: updated.layout as unknown as WidgetLayout[],
  }
}

/**
 * Update template layout
 * Cannot update default template - it's immutable
 */
export async function updateTemplateLayout(
  templateId: string,
  layout: WidgetLayout[]
): Promise<DashboardTemplate> {
  const userId = await getUserId()

  const template = await safeDbOperation(
    () => prisma.dashboardTemplate.findUnique({
      where: { id: templateId },
    }),
    null
  )

  if (!template || template.userId !== userId) {
    throw new Error('Template not found')
  }

  // Cannot update default template - it's immutable
  if (template.isDefault) {
    throw new Error('Cannot modify default template. Please create a new template to customize your layout.')
  }

  const updated = await safeDbOperation(
    () => prisma.dashboardTemplate.update({
      where: { id: templateId },
      data: { layout: layout as any },
    }),
    null
  )

  if (!updated) {
    throw new Error('Failed to update template layout')
  }

  revalidatePath('/dashboard')

  return {
    ...updated,
    layout: updated.layout as unknown as WidgetLayout[],
  }
}
