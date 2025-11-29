'use server'

import { prisma } from '@/lib/prisma'
import { getUserId } from '@/server/auth-utils'
import { revalidateTag } from 'next/cache'
import { NotificationType } from '@prisma/client'

/**
 * Create a new notification for the user
 */
export async function createNotificationAction(data: {
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  actionRequired?: boolean
}) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data ?? undefined,
      actionRequired: data.actionRequired ?? false
    }
  })

  revalidateTag(`notifications-${userId}`)
  return notification
}

/**
 * Get all notifications for the user
 */
export async function getNotificationsAction(options?: {
  unreadOnly?: boolean
  limit?: number
}) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      ...(options?.unreadOnly ? { isRead: false } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50
  })

  return notifications
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCountAction() {
  const userId = await getUserId()
  if (!userId) return 0

  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false
    }
  })

  return count
}

/**
 * Mark a notification as read
 */
export async function markNotificationReadAction(notificationId: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  const notification = await prisma.notification.update({
    where: {
      id: notificationId,
      userId // Ensure user owns this notification
    },
    data: { isRead: true }
  })

  revalidateTag(`notifications-${userId}`)
  return notification
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsReadAction() {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false
    },
    data: { isRead: true }
  })

  revalidateTag(`notifications-${userId}`)
}

/**
 * Delete a notification
 */
export async function deleteNotificationAction(notificationId: string) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  await prisma.notification.delete({
    where: {
      id: notificationId,
      userId // Ensure user owns this notification
    }
  })

  revalidateTag(`notifications-${userId}`)
}

/**
 * Handle funded approval action from user
 * User clicks "Firm Approved" → Create funded phase with account ID
 */
export async function handleFundedApprovalAction(data: {
  notificationId: string
  masterAccountId: string
  fundedAccountId: string
}) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  // Get the master account and validate ownership
  const masterAccount = await prisma.masterAccount.findFirst({
    where: {
      id: data.masterAccountId,
      userId
    },
    include: {
      PhaseAccount: {
        orderBy: { phaseNumber: 'desc' }
      }
    }
  })

  if (!masterAccount) {
    throw new Error('Account not found')
  }

  // Find the pending_approval phase
  const pendingPhase = masterAccount.PhaseAccount.find(p => p.status === 'pending_approval')
  if (!pendingPhase) {
    throw new Error('No pending approval found for this account')
  }

  // Update the phase to active with the funded account ID
  await prisma.$transaction(async (tx) => {
    // Determine funded phase based on evaluation type
    // For Instant accounts: the pending_approval phase IS the funded phase (phaseNumber = 1)
    // For One Step: funded is phase 2
    // For Two Step: funded is phase 3
    const isInstantAccount = masterAccount.evaluationType === 'Instant'
    
    if (isInstantAccount) {
      // For Instant accounts, the pending_approval phase IS the funded phase
      // Just update it directly with the new account ID and activate it
      await tx.phaseAccount.update({
        where: { id: pendingPhase.id },
        data: {
          phaseId: data.fundedAccountId,
          status: 'active'
        }
      })
    } else {
      // For One Step and Two Step accounts, mark current phase as passed
      // and activate the next phase (the funded phase)
      await tx.phaseAccount.update({
        where: { id: pendingPhase.id },
        data: { status: 'passed' }
      })

      // Find the funded phase - it should always exist from account creation
      const fundedPhaseNumber = pendingPhase.phaseNumber + 1
      const fundedPhase = masterAccount.PhaseAccount.find(p => p.phaseNumber === fundedPhaseNumber)

      if (!fundedPhase) {
        // Critical error: funded phase should always exist from account creation
        throw new Error(`Funded phase (phase ${fundedPhaseNumber}) not found for master account ${data.masterAccountId}. The account may be in a corrupted state.`)
      }

      // Update funded phase with the new account ID and activate it
      await tx.phaseAccount.update({
        where: { id: fundedPhase.id },
        data: {
          phaseId: data.fundedAccountId,
          status: 'active'
        }
      })
    }

    // Update master account current phase
    // For Instant accounts, funded phase is phase 1
    // For One Step, funded phase is phase 2
    // For Two Step, funded phase is phase 3
    const currentPhaseForFunded = isInstantAccount ? 1 : pendingPhase.phaseNumber + 1
    await tx.masterAccount.update({
      where: { id: data.masterAccountId },
      data: {
        currentPhase: currentPhaseForFunded,
        status: 'funded'
      }
    })

    // Mark notification as read and update data
    await tx.notification.update({
      where: { id: data.notificationId },
      data: {
        isRead: true,
        actionRequired: false
      }
    })

    // Create approval notification
    await tx.notification.create({
      data: {
        userId,
        type: 'FUNDED_APPROVED',
        title: 'Funded Account Activated',
        message: `Congratulations! Your ${masterAccount.accountName} account is now funded.`,
        data: {
          masterAccountId: data.masterAccountId,
          fundedAccountId: data.fundedAccountId
        },
        actionRequired: false
      }
    })
  })

  revalidateTag(`notifications-${userId}`)
  revalidateTag(`accounts-${userId}`)
}

/**
 * Handle funded decline action from user
 * User clicks "Firm Declined" → Mark account as failed with reason
 */
export async function handleFundedDeclineAction(data: {
  notificationId: string
  masterAccountId: string
  reason: string
}) {
  const userId = await getUserId()
  if (!userId) throw new Error('Unauthorized')

  // Get the master account and validate ownership
  const masterAccount = await prisma.masterAccount.findFirst({
    where: {
      id: data.masterAccountId,
      userId
    },
    include: {
      PhaseAccount: true
    }
  })

  if (!masterAccount) {
    throw new Error('Account not found')
  }

  // Find the pending_approval phase
  const pendingPhase = masterAccount.PhaseAccount.find(p => p.status === 'pending_approval')
  if (!pendingPhase) {
    throw new Error('No pending approval found for this account')
  }

  await prisma.$transaction(async (tx) => {
    // Update the phase to failed
    await tx.phaseAccount.update({
      where: { id: pendingPhase.id },
      data: { status: 'failed' }
    })

    // Update master account status
    await tx.masterAccount.update({
      where: { id: data.masterAccountId },
      data: { status: 'failed' }
    })

    // Mark notification as read
    await tx.notification.update({
      where: { id: data.notificationId },
      data: {
        isRead: true,
        actionRequired: false
      }
    })

    // Create decline notification with reason in data
    await tx.notification.create({
      data: {
        userId,
        type: 'FUNDED_DECLINED',
        title: 'Funded Request Declined',
        message: `Your ${masterAccount.accountName} account was declined by the firm.`,
        data: {
          masterAccountId: data.masterAccountId,
          reason: data.reason,
          note: 'Met profit target but failed firm review'
        },
        actionRequired: false
      }
    })
  })

  revalidateTag(`notifications-${userId}`)
  revalidateTag(`accounts-${userId}`)
}

