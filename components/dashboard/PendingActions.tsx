'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  fetchPendingActionsAction,
  type PendingAction,
} from '@/lib/actions/dashboard'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Clock, UserX, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PendingActionsProps {
  businessId: string
}

const actionConfig = {
  unconfirmed: {
    icon: Clock,
    title: 'Sin Confirmar',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  no_show_followup: {
    icon: UserX,
    title: 'No Presentados',
    color: 'text-red-600',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    badgeColor: 'bg-red-100 text-red-800',
  },
  vip_today: {
    icon: CheckCircle,
    title: 'Clientes VIP',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    badgeColor: 'bg-purple-100 text-purple-800',
  },
}

function ActionCard({ action }: { action: PendingAction }) {
  const config = actionConfig[action.type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'rounded-lg border p-2 sm:p-3',
        config.borderColor,
        config.bgColor
      )}
    >
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', config.color)} />
          <span className={cn('font-medium text-xs sm:text-sm', config.color)}>
            {config.title}
          </span>
        </div>
        <Badge
          variant="secondary"
          className={cn('text-[10px] sm:text-xs', config.badgeColor)}
        >
          {action.count}
        </Badge>
      </div>
      <div className="space-y-1 sm:space-y-1.5">
        {action.items.slice(0, 2).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between text-xs sm:text-sm"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium truncate block">{item.title}</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {item.subtitle}
              </span>
            </div>
            {item.time && (
              <span className="text-[10px] sm:text-xs text-muted-foreground ml-2 shrink-0">
                {format(new Date(item.time), 'HH:mm', { locale: es })}
              </span>
            )}
          </div>
        ))}
        {action.items.length > 2 && (
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            +{action.items.length - 2} más
          </span>
        )}
      </div>
    </div>
  )
}

function ActionSkeleton() {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-8" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  )
}

export function PendingActions({ businessId }: PendingActionsProps) {
  const [loading, setLoading] = useState(true)
  const [actions, setActions] = useState<PendingAction[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const data = await fetchPendingActionsAction(businessId)
        setActions(data)
      } catch (error) {
        console.error('Error fetching pending actions:', error)
      } finally {
        setLoading(false)
      }
    }

    if (businessId) {
      fetchData()
    }
  }, [businessId])

  const hasActions = actions.length > 0

  return (
    <Card className="border h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <AlertTriangle
            className={cn(
              'h-4 w-4',
              hasActions ? 'text-amber-500' : 'text-muted-foreground'
            )}
          />
          <span className="truncate">Requiere Atención</span>
          {hasActions && (
            <Badge
              variant="destructive"
              className="text-[10px] sm:text-xs shrink-0"
            >
              {actions.reduce((sum, a) => sum + a.count, 0)}
            </Badge>
          )}
        </CardTitle>
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          Citas sin confirmar y clientes que no se presentaron
        </p>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {loading ? (
          <div className="space-y-2 sm:space-y-3">
            <ActionSkeleton />
            <ActionSkeleton />
          </div>
        ) : hasActions ? (
          <div className="space-y-2 sm:space-y-3">
            {actions.map((action) => (
              <ActionCard key={action.type} action={action} />
            ))}
          </div>
        ) : (
          <div className="py-4 sm:py-8 text-center h-full flex flex-col items-center justify-center">
            <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-primary mb-2 sm:mb-3" />
            <p className="text-muted-foreground text-xs sm:text-sm">
              Todo en orden
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
