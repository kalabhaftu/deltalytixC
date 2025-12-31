'use server'

import { prisma } from '@/lib/prisma'
import { NotificationType, NotificationPriority } from '@prisma/client'
import { revalidateTag } from 'next/cache'

export interface NotificationPayload {
    type: NotificationType
    title: string
    message: string
    data?: Record<string, any>
    actionRequired?: boolean
    priority?: NotificationPriority
    invalidationKey?: string
}

/**
 * NotificationService - Intelligent notification system with smart invalidation
 * 
 * Core Feature: Updates existing unread notifications instead of creating spam
 * 
 * Use Cases:
 * - Risk alerts that escalate (65% → 80% → 95%)
 * - Import lifecycle (Processing → Complete)
 * - Strategy deviations grouped by day
 */

/**
 * Create or update notification with smart invalidation
 * 
 * Logic:
 * 1. If invalidationKey provided:
 *    - Check for existing UNREAD notification with same key
 *    - If found: UPDATE existing notification (prevents spam)
 *    - If not found OR existing is READ: CREATE new notification
 * 2. If no invalidationKey: CREATE new notification
 */
export async function createOrUpdateNotification(userId: string, notification: NotificationPayload) {
    try {
        if (notification.invalidationKey) {
            // Try to find existing unread notification with same invalidation key
            const existing = await prisma.notification.findFirst({
                where: {
                    userId,
                    invalidationKey: notification.invalidationKey,
                    isRead: false
                }
            })

            if (existing) {
                // UPDATE existing unread notification
                const updated = await prisma.notification.update({
                    where: { id: existing.id },
                    data: {
                        type: notification.type,
                        title: notification.title,
                        message: notification.message,
                        data: notification.data,
                        priority: notification.priority || NotificationPriority.MEDIUM,
                        actionRequired: notification.actionRequired ?? false,
                        updatedAt: new Date() // Bump to top of notification list
                    }
                })

                revalidateTag(`notifications-${userId}`)
                return { success: true, data: updated, action: 'updated' as const }
            }
        }

        // CREATE new notification (either no invalidation key or existing was already read)
        const created = await prisma.notification.create({
            data: {
                userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                data: notification.data,
                invalidationKey: notification.invalidationKey,
                priority: notification.priority || NotificationPriority.MEDIUM,
                actionRequired: notification.actionRequired ?? false
            }
        })

        revalidateTag(`notifications-${userId}`)
        return { success: true, data: created, action: 'created' as const }

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create notification'
        }
    }
}

/**
 * Risk Alert: Daily Loss Limit or Max Drawdown
 * Smart invalidation: Updates same notification as percentage increases
 * 
 * Example: Daily loss 65% → 80% → 95% (updates same notification)
 */
export async function createRiskAlert(
    userId: string,
    phaseAccountId: string,
    riskType: 'daily_loss' | 'max_drawdown',
    currentPercentage: number,
    metadata: {
        accountName: string
        currentBalance: number
        limit: number
        used: number
    }
) {
    // Determine severity level
    let type: NotificationType
    let priority: NotificationPriority
    let title: string

    if (riskType === 'daily_loss') {
        if (currentPercentage >= 95) {
            type = NotificationType.RISK_DAILY_LOSS_95
            priority = NotificationPriority.CRITICAL
            title = '🚨 CRITICAL: Daily Loss Limit at 95%'
        } else {
            type = NotificationType.RISK_DAILY_LOSS_80
            priority = NotificationPriority.HIGH
            title = '⚠️ WARNING: Daily Loss Limit at 80%'
        }
    } else {
        if (currentPercentage >= 95) {
            type = NotificationType.RISK_MAX_DRAWDOWN_95
            priority = NotificationPriority.CRITICAL
            title = '🚨 CRITICAL: Max Drawdown at 95%'
        } else {
            type = NotificationType.RISK_MAX_DRAWDOWN_80
            priority = NotificationPriority.HIGH
            title = '⚠️ WARNING: Max Drawdown at 80%'
        }
    }

    const message = `Your account "${metadata.accountName}" has used ${currentPercentage.toFixed(1)}% of the ${riskType === 'daily_loss' ? 'daily loss' : 'max drawdown'} limit. Current: $${metadata.used.toFixed(2)} / Limit: $${metadata.limit.toFixed(2)}`

    return await createOrUpdateNotification(userId, {
        type,
        title,
        message,
        priority,
        actionRequired: priority === NotificationPriority.CRITICAL,
        invalidationKey: `risk_${riskType}_${phaseAccountId}`,
        data: {
            phaseAccountId,
            riskType,
            percentage: currentPercentage,
            ...metadata
        }
    })
}

/**
 * Import Lifecycle: Processing → Complete
 * Smart invalidation: Updates same notification from "processing" to "complete"
 * 
 * Example: "Import in progress" → "Import complete (145 trades)"
 */
export async function createImportNotification(
    userId: string,
    importId: string,
    status: 'processing' | 'complete',
    summary?: {
        tradesImported?: number
        errors?: number
        warnings?: number
        duration?: number
    }
) {
    if (status === 'processing') {
        return await createOrUpdateNotification(userId, {
            type: NotificationType.IMPORT_PROCESSING,
            title: '⏳ Import in Progress',
            message: 'Your trades are being imported. This may take a few moments...',
            priority: NotificationPriority.MEDIUM,
            invalidationKey: `import_${importId}`,
            data: {
                importId,
                status: 'processing',
                startedAt: new Date().toISOString()
            }
        })
    } else {
        const hasErrors = summary?.errors && summary.errors > 0
        const title = hasErrors
            ? `✅ Import Complete (${summary.errors} errors)`
            : '✅ Import Complete'

        const message = summary
            ? `Successfully imported ${summary.tradesImported} trades in ${summary.duration}s. ${hasErrors ? `${summary.errors} errors found.` : ''}`
            : 'Your trades have been imported successfully.'

        return await createOrUpdateNotification(userId, {
            type: NotificationType.IMPORT_COMPLETE,
            title,
            message,
            priority: hasErrors ? NotificationPriority.HIGH : NotificationPriority.MEDIUM,
            actionRequired: Boolean(hasErrors),
            invalidationKey: `import_${importId}`,
            data: {
                importId,
                status: 'complete',
                summary,
                completedAt: new Date().toISOString()
            }
        })
    }
}

/**
 * Strategy Deviation: Trade outside allowed sessions/rules
 * Smart invalidation: Groups same deviation type for the day
 * 
 * Example: All "after-hours" trades for today in single notification
 */
export async function createStrategyDeviation(
    userId: string,
    deviationType: 'session_violation' | 'rule_violation',
    metadata: {
        tradeId: string
        tradePair: string
        expectedSession?: string
        actualSession?: string
        ruleViolated?: string
    }
) {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    let title: string
    let message: string

    if (deviationType === 'session_violation') {
        title = '📊 Strategy Deviation: Session Violation'
        message = `Trade ${metadata.tradePair} executed outside allowed session. Expected: ${metadata.expectedSession}, Actual: ${metadata.actualSession}`
    } else {
        title = '📊 Strategy Deviation: Rule Violation'
        message = `Trade ${metadata.tradePair} violated rule: ${metadata.ruleViolated}`
    }

    return await createOrUpdateNotification(userId, {
        type: NotificationType.STRATEGY_SESSION_VIOLATION,
        title,
        message,
        priority: NotificationPriority.MEDIUM,
        actionRequired: false,
        invalidationKey: `strategy_deviation_${deviationType}_${today}`,
        data: {
            deviationType,
            date: today,
            ...metadata,
            occurrences: 1 // This will be incremented in data.occurrences on UPDATE
        }
    })
}

/**
 * System Announcement: Admin-to-user broadcasts
 * No invalidation - each announcement is unique
 */
export async function createSystemAnnouncement(
    userId: string,
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.MEDIUM
) {
    return await createOrUpdateNotification(userId, {
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        title,
        message,
        priority,
        actionRequired: false
        // No invalidationKey - each announcement is unique
    })
}

/**
 * Dismiss all notifications of a specific type
 */
export async function dismissNotificationsByType(userId: string, type: NotificationType) {
    try {
        await prisma.notification.updateMany({
            where: {
                userId,
                type,
                isRead: false
            },
            data: {
                isRead: true
            }
        })

        revalidateTag(`notifications-${userId}`)
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Failed to dismiss notifications' }
    }
}

/**
 * Get notification statistics (for dashboard)
 */
export async function getNotificationStats(userId: string) {
    try {
        const [total, unread, critical] = await Promise.all([
            prisma.notification.count({ where: { userId } }),
            prisma.notification.count({ where: { userId, isRead: false } }),
            prisma.notification.count({
                where: {
                    userId,
                    isRead: false,
                    priority: NotificationPriority.CRITICAL
                }
            })
        ])

        return {
            success: true,
            data: { total, unread, critical }
        }
    } catch (error) {
        return {
            success: false,
            error: 'Failed to get notification stats'
        }
    }
}
