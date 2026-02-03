'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Bell, Check, CheckCheck } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { useCurrentUser } from '@/hooks/use-current-user'
import { cn } from '@/lib/utils'
import type { Notification } from '@/lib/models/notification/notification'

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { user } = useCurrentUser()
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications(user?.id)

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins}m`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays < 7) return `Hace ${diffDays}d`

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
      case 'BOOKING_REMINDER':
      case 'BOOKING_UPDATED':
        return '📅'
      case 'BOOKING_CANCELLED':
        return '❌'
      case 'REVIEW_REQUEST':
        return '⭐'
      case 'NEW_CHAT_MESSAGE':
        return '💬'
      case 'PROMOTIONAL_OFFER':
        return '🎉'
      case 'NEWSLETTER_UPDATE':
        return '📰'
      case 'ACCOUNT_UPDATE':
        return '👤'
      default:
        return '📢'
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setIsOpen(true)}
      >
        <Bell className="!h-5 !w-5" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:w-[400px] sm:max-w-none">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Notificaciones</SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs gap-1"
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar todas leídas
                </Button>
              )}
            </div>
            <SheetDescription>
              {unreadCount > 0
                ? `Tienes ${unreadCount} notificación${
                    unreadCount > 1 ? 'es' : ''
                  } sin leer`
                : 'No tienes notificaciones sin leer'}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Cargando...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  No tienes notificaciones
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'w-full text-left p-4 rounded-lg border transition-colors',
                      'hover:bg-accent hover:border-accent-foreground/20',
                      notification.is_read
                        ? 'bg-card border-border'
                        : 'bg-primary/5 border-primary/20'
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-medium text-sm line-clamp-1">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        {notification.body && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {notification.body}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatTime(notification.created_at)}
                          </span>
                          {notification.is_read && (
                            <Check className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}
