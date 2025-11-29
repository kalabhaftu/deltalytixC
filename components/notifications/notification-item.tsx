'use client'

import { formatDistanceToNow } from 'date-fns'
import { 
  Check, 
  Trash2, 
  Trophy, 
  XCircle, 
  DollarSign, 
  Bell,
  ChevronRight,
  AlertCircle,
  ArrowRight,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Notification, NotificationType } from '@prisma/client'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  onAction: (notification: Notification) => void
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  FUNDED_PENDING_APPROVAL: <Trophy className="h-4 w-4 text-primary" />,
  FUNDED_APPROVED: <Trophy className="h-4 w-4 text-long" />,
  FUNDED_DECLINED: <XCircle className="h-4 w-4 text-short" />,
  PHASE_TRANSITION_PENDING: <ArrowRight className="h-4 w-4 text-primary" />,
  PAYOUT_APPROVED: <DollarSign className="h-4 w-4 text-long" />,
  PAYOUT_REJECTED: <DollarSign className="h-4 w-4 text-short" />,
  SYSTEM: <Bell className="h-4 w-4 text-muted-foreground" />
}

const notificationColors: Record<NotificationType, string> = {
  FUNDED_PENDING_APPROVAL: 'border-l-primary',
  FUNDED_APPROVED: 'border-l-long',
  FUNDED_DECLINED: 'border-l-short',
  PHASE_TRANSITION_PENDING: 'border-l-primary',
  PAYOUT_APPROVED: 'border-l-long',
  PAYOUT_REJECTED: 'border-l-short',
  SYSTEM: 'border-l-muted-foreground'
}

export function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete, 
  onAction 
}: NotificationItemProps) {
  const isActionable = notification.actionRequired && (
    notification.type === 'FUNDED_PENDING_APPROVAL' || 
    notification.type === 'PHASE_TRANSITION_PENDING'
  )
  
  return (
    <div
      className={cn(
        "p-4 hover:bg-muted/50 transition-colors border-l-4 relative group",
        notificationColors[notification.type],
        !notification.isRead && "bg-muted/30"
      )}
    >
      {/* Delete button - always visible on hover */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(notification.id)
        }}
        title="Delete notification"
      >
        <X className="h-3.5 w-3.5" />
      </Button>

      <div className="flex items-start gap-3 pr-6">
        <div className="shrink-0 mt-0.5">
          {notificationIcons[notification.type]}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className={cn(
                "text-sm line-clamp-1",
                !notification.isRead && "font-semibold"
              )}>
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {notification.message}
              </p>
            </div>
            
            {!notification.isRead && (
              <div className="shrink-0 h-2 w-2 rounded-full bg-primary mt-1" />
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            
            <div className="flex items-center gap-1">
              {isActionable ? (
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => onAction(notification)}
                >
                  Take Action
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              ) : (
                !notification.isRead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onMarkAsRead(notification.id)}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Mark read
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Show additional info for declined notifications */}
          {notification.type === 'FUNDED_DECLINED' && notification.data && (
            <div className="mt-2 p-2 bg-destructive/10 rounded text-xs">
              <div className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" />
                <span className="font-medium">Decline reason:</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {(notification.data as any).reason || 'No reason provided'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
