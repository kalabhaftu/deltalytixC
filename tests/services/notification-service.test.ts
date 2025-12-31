import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationService } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority } from '@prisma/client'

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
    prisma: {
        notification: {
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            count: vi.fn()
        }
    }
}))

// Mock Next.js cache
vi.mock('next/cache', () => ({
    revalidateTag: vi.fn()
}))

import { prisma } from '@/lib/prisma'

describe('NotificationService', () => {
    const userId = 'test-user-id'
    const phaseAccountId = 'test-phase-id'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('createOrUpdate', () => {
        it('should CREATE new notification when no invalidation key exists', async () => {
            vi.mocked(prisma.notification.create).mockResolvedValue({
                id: 'new-id',
                userId,
                type: NotificationType.SYSTEM,
                title: 'Test',
                message: 'Test message',
                data: null,
                isRead: false,
                actionRequired: false,
                invalidationKey: null,
                priority: NotificationPriority.MEDIUM,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await NotificationService.createOrUpdate(userId, {
                type: NotificationType.SYSTEM,
                title: 'Test',
                message: 'Test message'
            })

            expect(result.success).toBe(true)
            expect(result.action).toBe('created')
            expect(prisma.notification.create).toHaveBeenCalledTimes(1)
        })

        it('should UPDATE existing unread notification with same invalidation key', async () => {
            const existingNotification = {
                id: 'existing-id',
                userId,
                type: NotificationType.RISK_DAILY_LOSS_80,
                title: 'Old title',
                message: 'Old message',
                data: { percentage: 80 },
                isRead: false,
                actionRequired: false,
                invalidationKey: 'risk_daily_loss_test-phase',
                priority: NotificationPriority.HIGH,
                createdAt: new Date(),
                updatedAt: new Date()
            }

            vi.mocked(prisma.notification.findFirst).mockResolvedValue(existingNotification)
            vi.mocked(prisma.notification.update).mockResolvedValue({
                ...existingNotification,
                title: 'Updated title',
                message: 'Updated message',
                data: { percentage: 85 }
            })

            const result = await NotificationService.createOrUpdate(userId, {
                type: NotificationType.RISK_DAILY_LOSS_80,
                title: 'Updated title',
                message: 'Updated message',
                invalidationKey: 'risk_daily_loss_test-phase',
                data: { percentage: 85 }
            })

            expect(result.success).toBe(true)
            expect(result.action).toBe('updated')
            expect(prisma.notification.findFirst).toHaveBeenCalledWith({
                where: {
                    userId,
                    invalidationKey: 'risk_daily_loss_test-phase',
                    isRead: false
                }
            })
            expect(prisma.notification.update).toHaveBeenCalledTimes(1)
            expect(prisma.notification.create).not.toHaveBeenCalled()
        })

        it('should CREATE new notification if existing is already read', async () => {
            // findFirst returns null because no UNREAD notification exists
            vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)
            vi.mocked(prisma.notification.create).mockResolvedValue({
                id: 'new-id',
                userId,
                type: NotificationType.RISK_DAILY_LOSS_95,
                title: 'New alert',
                message: 'New message',
                data: null,
                isRead: false,
                actionRequired: true,
                invalidationKey: 'risk_daily_loss_test-phase',
                priority: NotificationPriority.CRITICAL,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await NotificationService.createOrUpdate(userId, {
                type: NotificationType.RISK_DAILY_LOSS_95,
                title: 'New alert',
                message: 'New message',
                invalidationKey: 'risk_daily_loss_test-phase'
            })

            expect(result.success).toBe(true)
            expect(result.action).toBe('created')
            expect(prisma.notification.create).toHaveBeenCalledTimes(1)
        })
    })

    describe('createRiskAlert', () => {
        const metadata = {
            accountName: 'Test Account',
            currentBalance: 9500,
            limit: 1000,
            used: 800
        }

        it('should create HIGH priority alert at 80% daily loss', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)
            vi.mocked(prisma.notification.create).mockResolvedValue({
                id: 'alert-id',
                userId,
                type: NotificationType.RISK_DAILY_LOSS_80,
                title: '⚠️ WARNING: Daily Loss Limit at 80%',
                message: expect.any(String),
                data: expect.any(Object),
                isRead: false,
                actionRequired: false,
                invalidationKey: `risk_daily_loss_${phaseAccountId}`,
                priority: NotificationPriority.HIGH,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await NotificationService.createRiskAlert(
                userId,
                phaseAccountId,
                'daily_loss',
                80.5,
                metadata
            )

            expect(result.success).toBe(true)
            const createCall = vi.mocked(prisma.notification.create).mock.calls[0][0]
            expect(createCall.data.type).toBe(NotificationType.RISK_DAILY_LOSS_80)
            expect(createCall.data.priority).toBe(NotificationPriority.HIGH)
            expect(createCall.data.actionRequired).toBe(false)
        })

        it('should create CRITICAL priority alert at 95% daily loss', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)
            vi.mocked(prisma.notification.create).mockResolvedValue({
                id: 'alert-id',
                userId,
                type: NotificationType.RISK_DAILY_LOSS_95,
                title: '🚨 CRITICAL: Daily Loss Limit at 95%',
                message: expect.any(String),
                data: expect.any(Object),
                isRead: false,
                actionRequired: true,
                invalidationKey: `risk_daily_loss_${phaseAccountId}`,
                priority: NotificationPriority.CRITICAL,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await NotificationService.createRiskAlert(
                userId,
                phaseAccountId,
                'daily_loss',
                96.2,
                metadata
            )

            expect(result.success).toBe(true)
            const createCall = vi.mocked(prisma.notification.create).mock.calls[0][0]
            expect(createCall.data.type).toBe(NotificationType.RISK_DAILY_LOSS_95)
            expect(createCall.data.priority).toBe(NotificationPriority.CRITICAL)
            expect(createCall.data.actionRequired).toBe(true)
        })

        it('should update same notification when percentage increases', async () => {
            // Simulate existing 80% alert
            vi.mocked(prisma.notification.findFirst).mockResolvedValue({
                id: 'existing-alert',
                userId,
                type: NotificationType.RISK_DAILY_LOSS_80,
                title: '⚠️ WARNING: Daily Loss Limit at 80%',
                message: 'Old message',
                data: { percentage: 80.5 },
                isRead: false,
                actionRequired: false,
                invalidationKey: `risk_daily_loss_${phaseAccountId}`,
                priority: NotificationPriority.HIGH,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            vi.mocked(prisma.notification.update).mockResolvedValue({
                id: 'existing-alert',
                userId,
                type: NotificationType.RISK_DAILY_LOSS_80,
                title: '⚠️ WARNING: Daily Loss Limit at 80%',
                message: 'Updated message',
                data: { percentage: 85.2 },
                isRead: false,
                actionRequired: false,
                invalidationKey: `risk_daily_loss_${phaseAccountId}`,
                priority: NotificationPriority.HIGH,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await NotificationService.createRiskAlert(
                userId,
                phaseAccountId,
                'daily_loss',
                85.2,
                metadata
            )

            expect(result.success).toBe(true)
            expect(result.action).toBe('updated')
            expect(prisma.notification.update).toHaveBeenCalledTimes(1)
            expect(prisma.notification.create).not.toHaveBeenCalled()
        })
    })

    describe('createImportNotification', () => {
        const importId = 'import-123'

        it('should create "processing" notification', async () => {
            vi.mocked(prisma.notification.create).mockResolvedValue({
                id: 'import-notif',
                userId,
                type: NotificationType.IMPORT_PROCESSING,
                title: '⏳ Import in Progress',
                message: expect.any(String),
                data: { importId, status: 'processing', startedAt: expect.any(String) },
                isRead: false,
                actionRequired: false,
                invalidationKey: `import_${importId}`,
                priority: NotificationPriority.MEDIUM,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await NotificationService.createImportNotification(
                userId,
                importId,
                'processing'
            )

            expect(result.success).toBe(true)
            expect(result.action).toBe('created')
        })

        it('should update to "complete" notification with summary', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue({
                id: 'import-notif',
                userId,
                type: NotificationType.IMPORT_PROCESSING,
                title: '⏳ Import in Progress',
                message: 'Old message',
                data: { importId, status: 'processing' },
                isRead: false,
                actionRequired: false,
                invalidationKey: `import_${importId}`,
                priority: NotificationPriority.MEDIUM,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            vi.mocked(prisma.notification.update).mockResolvedValue({
                id: 'import-notif',
                userId,
                type: NotificationType.IMPORT_COMPLETE,
                title: '✅ Import Complete',
                message: 'Successfully imported 145 trades in 3.2s. ',
                data: { importId, status: 'complete', summary: { tradesImported: 145, errors: 0, duration: 3.2 } },
                isRead: false,
                actionRequired: false,
                invalidationKey: `import_${importId}`,
                priority: NotificationPriority.MEDIUM,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await NotificationService.createImportNotification(
                userId,
                importId,
                'complete',
                {
                    tradesImported: 145,
                    errors: 0,
                    warnings: 2,
                    duration: 3.2
                }
            )

            expect(result.success).toBe(true)
            expect(result.action).toBe('updated')
        })

        it('should mark as HIGH priority if errors exist', async () => {
            vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)
            vi.mocked(prisma.notification.create).mockResolvedValue({
                id: 'import-notif',
                userId,
                type: NotificationType.IMPORT_COMPLETE,
                title: '✅ Import Complete (5 errors)',
                message: expect.any(String),
                data: expect.any(Object),
                isRead: false,
                actionRequired: true,
                invalidationKey: `import_${importId}`,
                priority: NotificationPriority.HIGH,
                createdAt: new Date(),
                updatedAt: new Date()
            })

            const result = await NotificationService.createImportNotification(
                userId,
                importId,
                'complete',
                {
                    tradesImported: 140,
                    errors: 5,
                    duration: 4.1
                }
            )

            expect(result.success).toBe(true)
            const createCall = vi.mocked(prisma.notification.create).mock.calls[0][0]
            expect(createCall.data.priority).toBe(NotificationPriority.HIGH)
            expect(createCall.data.actionRequired).toBe(true)
        })
    })

    describe('dismissByType', () => {
        it('should mark all notifications of type as read', async () => {
            vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 3 })

            const result = await NotificationService.dismissByType(
                userId,
                NotificationType.RISK_ALERT
            )

            expect(result.success).toBe(true)
            expect(prisma.notification.updateMany).toHaveBeenCalledWith({
                where: {
                    userId,
                    type: NotificationType.RISK_ALERT,
                    isRead: false
                },
                data: {
                    isRead: true
                }
            })
        })
    })

    describe('getStats', () => {
        it('should return notification statistics', async () => {
            vi.mocked(prisma.notification.count)
                .mockResolvedValueOnce(25) // total
                .mockResolvedValueOnce(8)  // unread
                .mockResolvedValueOnce(2)  // critical

            const result = await NotificationService.getStats(userId)

            expect(result.success).toBe(true)
            expect(result.data).toEqual({
                total: 25,
                unread: 8,
                critical: 2
            })
        })
    })
})
