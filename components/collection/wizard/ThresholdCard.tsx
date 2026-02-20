'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ChevronRight, Layers, Mail, Users } from 'lucide-react'
import { truncateText } from '@/lib/utils'
import { GroupedClient } from './types'
import { NotificationThreshold } from '@/lib/models/collection/notification-threshold'

interface ThresholdCardProps {
  threshold: NotificationThreshold
  clients: GroupedClient[]
  count: number
  totalClients: number
  isSelected: boolean
  onClick: () => void
  onStopPropagation?: (e: React.MouseEvent) => void
  children?: React.ReactNode
}

export function ThresholdCard({
  threshold,
  clients,
  count,
  totalClients,
  isSelected,
  onClick,
  onStopPropagation,
  children,
}: ThresholdCardProps) {
  const percentage = totalClients > 0 ? Math.round((count / totalClients) * 100) : 0

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? 'border-primary ring-1 ring-primary'
          : 'hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">{threshold.name}</h4>
              <Badge variant="secondary" className="text-xs">
                {threshold.days_to
                  ? `${threshold.days_from}-${threshold.days_to} días`
                  : `${threshold.days_from}+ días`}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Mail className="h-3.5 w-3.5" />
              <span
                className="truncate"
                title={threshold.email_template?.name || 'No configurada'}
              >
                Plantilla:{' '}
                {truncateText(threshold.email_template?.name || 'No configurada')}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{count}</span>
                <span className="text-muted-foreground text-sm">clientes</span>
              </div>
              <span className="text-sm font-medium text-primary">{percentage}%</span>
            </div>
          </div>

          <ChevronRight
            className={`h-5 w-5 text-muted-foreground transition-transform ${
              isSelected ? 'rotate-90' : ''
            }`}
          />
        </div>

        <Progress value={percentage} className="h-2 mt-3" />

        {/* Contenido adicional (ej: detalle expandido) */}
        {children && (
          <div onClick={onStopPropagation}>{children}</div>
        )}
      </CardContent>
    </Card>
  )
}
