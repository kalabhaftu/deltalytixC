'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Bell, Check, CheckCheck, Trash2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { NotificationItem } from './notification-item'
import { FundedApprovalDialog } from '@/components/prop-firm/funded-approval-dialog'
import { PhaseTransitionApprovalDialog } from '@/components/prop-firm/phase-transition-approval-dialog'
import { toast } from 'sonner'
import { Notification } from '@prisma/client'
import { useDatabaseRealtime } from '@/lib/realtime/database-realtime'
import { useUserStore } from '@/store/user-store'

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const user = useUserStore(state => state.user)

  // Dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [phaseTransitionDialogOpen, setPhaseTransitionDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  // Use ref for isOpen to avoid stale closures in real-time callback
  const isOpenRef = useRef(isOpen)
  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      // Add cache-busting timestamp to prevent stale data
      const response = await fetch(`/api/notifications?t=${Date.now()}`, {
        cache: 'no-store' // Prevent browser caching
      })
      const result = await response.json()

      if (result.success) {
        setNotifications(result.data.notifications)
        setUnreadCount(result.data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Explicitly refresh unread count (useful after server-side operations)
  const refreshUnreadCount = useCallback(async () => {
    try {
      // Add cache-busting to prevent stale count
      const response = await fetch(`/api/notifications?unreadOnly=true&limit=1&t=${Date.now()}`, {
        cache: 'no-store'
      })
      const result = await response.json()
      if (result.success) {
        setUnreadCount(result.data.unreadCount)
      }
    } catch (error) {
      // Silent fail - will update on next fetch
    }
  }, [])

  // Fetch unread count on mount to show badge immediately
  // This ensures the badge shows correct count even before user opens the popover
  useEffect(() => {
    refreshUnreadCount()
  }, [refreshUnreadCount])

  // Auto-fetch full notifications on initial mount
  // This pre-loads notifications so they're ready when user opens the popover
  useEffect(() => {
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount

  // Refetch when popover opens for fresh data
  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Poll for new notifications every 60 seconds when popover is closed
  // This keeps the badge count accurate without requiring user interaction
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpenRef.current) {
        refreshUnreadCount()
      }
    }, 60000) // 60 seconds

    return () => clearInterval(interval)
  }, [refreshUnreadCount])

  // Subscribe to realtime notification changes
  useDatabaseRealtime({
    userId: user?.id,
    enabled: !!user?.id,
    onNotificationChange: (change) => {
      // Only refresh if the notification belongs to the current user
      const notificationUserId = (change.newRecord?.userId || change.oldRecord?.userId) as string | undefined
      if (notificationUserId === user?.id) {
        // Handle different event types
        if (change.event === 'INSERT' && change.newRecord) {
          // New notification created - optimistically update count
          const isRead = change.newRecord.isRead as boolean | undefined
          // Treat undefined as unread (default state for new notifications)
          if (isRead !== true) {
            // Optimistically increment count for new unread notifications
            // Increment if explicitly unread (false) or undefined (default unread state)
            setUnreadCount(prev => prev + 1)
          }

          // Use ref to check current popover state (avoids stale closure)
          if (isOpenRef.current) {
            // If popover is open, fetch full list to show the new notification
            fetchNotifications()
          }
        } else if (change.event === 'UPDATE' || change.event === 'DELETE') {
          // Notification updated or deleted - need to fetch accurate count
          // Use ref to check current popover state (avoids stale closure)
          if (isOpenRef.current) {
            // If popover is open, fetch full list (which includes count)
            fetchNotifications()
          } else {
            // If popover is closed, always refresh count to ensure badge is accurate
            // This ensures badge updates even when panel is closed
            refreshUnreadCount()
          }
        }
      }
    }
  })

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      })

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      toast.error('Failed to mark notification as read')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH'
      })

      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success('All notifications marked as read')
    } catch (error) {
      toast.error('Failed to mark all as read')
    }
  }

  const handleDelete = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      const deleted = notifications.find(n => n.id === notificationId)
      if (deleted && !deleted.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      toast.success('Notification deleted')
    } catch (error) {
      toast.error('Failed to delete notification')
    }
  }

  const handleClearAll = async () => {
    try {
      // Use bulk delete endpoint
      await fetch('/api/notifications', { method: 'DELETE' })

      setNotifications([])
      setUnreadCount(0)
      toast.success('All notifications cleared')
    } catch (error) {
      toast.error('Failed to clear notifications')
    }
  }

  const handleNotificationAction = (notification: Notification) => {
    // Handle funded approval actions
    if (notification.type === 'FUNDED_PENDING_APPROVAL' && notification.actionRequired) {
      setSelectedNotification(notification)
      setApprovalDialogOpen(true)
      setIsOpen(false)
    }
    // Handle phase transition actions
    else if (notification.type === 'PHASE_TRANSITION_PENDING' && notification.actionRequired) {
      setSelectedNotification(notification)
      setPhaseTransitionDialogOpen(true)
      setIsOpen(false)
    }
    else {
      // Mark as read for non-actionable notifications
      if (!notification.isRead) {
        handleMarkAsRead(notification.id)
      }
    }
  }

  const handleApprovalComplete = () => {
    setApprovalDialogOpen(false)
    setSelectedNotification(null)
    fetchNotifications()
  }

  const handlePhaseTransitionComplete = () => {
    setPhaseTransitionDialogOpen(false)
    setSelectedNotification(null)
    // Fetch full notifications list
    fetchNotifications()
    // Also explicitly refresh unread count after a delay to catch any new notifications
    // created server-side during phase transition
    setTimeout(() => {
      refreshUnreadCount()
    }, 500)
  }

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 sm:w-96 p-0"
          align="end"
          sideOffset={8}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2"
                  onClick={handleMarkAllAsRead}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Read all
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 text-muted-foreground hover:text-destructive"
                  onClick={handleClearAll}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  We'll let you know when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                    onAction={handleNotificationAction}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Funded Approval Dialog */}
      <FundedApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        notification={selectedNotification}
        onComplete={handleApprovalComplete}
      />

      {/* Phase Transition Dialog */}
      <PhaseTransitionApprovalDialog
        open={phaseTransitionDialogOpen}
        onOpenChange={setPhaseTransitionDialogOpen}
        notification={selectedNotification}
        onComplete={handlePhaseTransitionComplete}
      />
    </>
  )
}

