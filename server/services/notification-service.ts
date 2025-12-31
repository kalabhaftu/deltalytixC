import { prisma } from '@/lib/prisma'
import { NotificationType, Notification } from '@prisma/client'
import { revalidateTag } from 'next/cache'

export type NotificationData = {
    type: NotificationType
    title: string
    message: string
    userId: string
    data?: Record<string, any>
    actionRequired?: boolean
    referenceId?: string // Key for smart invalidation (e.g., trade_id)
    invalidationKey?: string // Explicit key for invalidation groups
}

export class NotificationService {
    /**
     * Send a notification with Smart Invalidation support.
     * If a notification with the same `invalidationKey` exists and is unread,
     * it can be updated instead of creating a new one (to reduce noise).
     */
    static async send(payload: NotificationData) {
        const { userId, type, title, message, data, actionRequired, referenceId, invalidationKey } = payload

        // 1. Smart Invalidation / Deduplication
        if (invalidationKey) {
            // Find existing unread notification with the same key
            const existing = await prisma.notification.findFirst({
                where: {
                    userId,
                    isRead: false,
                    data: {
                        path: ['invalidationKey'],
                        equals: invalidationKey
                    }
                }
            })

            if (existing) {
                // Update existing notification instead of creating new one
                const updated = await prisma.notification.update({
                    where: { id: existing.id },
                    data: {
                        title,   // Update title (e.g. "Trade Pending" -> "Trade Filled")
                        message, // Update message
                        type,    // Update type
                        data: { ...(existing.data as object || {}), ...data, invalidationKey }, // Merge data
                        updatedAt: new Date() // Bump timestamp
                    }
                })
                revalidateTag(`notifications-${userId}`)
                return updated
            }
        }

        // 2. Create new notification
        const notification = await prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                actionRequired: actionRequired ?? false,
                data: { ...data, invalidationKey, referenceId }
            }
        })

        revalidateTag(`notifications-${userId}`)
        return notification
    }

    /**
     * bulkInvalidate: Mark a group of notifications as read/handled
     * e.g., when a user visits the "Import" page, clear all "Import Status" alerts.
     */
    static async bulkInvalidate(userId: string, type: NotificationType) {
        await prisma.notification.updateMany({
            where: {
                userId,
                type,
                isRead: false
            },
            data: { isRead: true }
        })
        revalidateTag(`notifications-${userId}`)
    }
}
