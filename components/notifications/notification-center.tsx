'use client'

import { useState, useEffect, useCallback } from 'react'
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

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  // Dialog states
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [phaseTransitionDialogOpen, setPhaseTransitionDialogOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/notifications')
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

  // Fetch on mount and when popover opens
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen, fetchNotifications])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        // Only poll count when popover is closed
        fetch('/api/notifications?limit=1')
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              setUnreadCount(result.data.unreadCount)
            }
          })
          .catch(() => {})
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

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
      // Delete all notifications one by one
      await Promise.all(
        notifications.map(n => 
          fetch(`/api/notifications/${n.id}`, { method: 'DELETE' })
        )
      )
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
    fetchNotifications()
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
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  You'll see updates here when something happens
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

