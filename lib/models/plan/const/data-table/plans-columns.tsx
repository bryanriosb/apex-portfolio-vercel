'use client'

import { Plan } from '@/lib/models/plan/plan'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCircle, XCircle, Building2, Users, UserCircle } from 'lucide-react'

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const },
  inactive: { label: 'Inactivo', variant: 'secondary' as const },
  deprecated: { label: 'Descontinuado', variant: 'destructive' as const },
}

const billingPeriodLabels = {
  monthly: 'Mensual',
  yearly: 'Anual',
  lifetime: 'Vitalicio',
}

export const PLANS_COLUMNS: ColumnDef<Plan>[] = [
  {
    accessorKey: 'status',
    header: 'status',
    meta: { hidden: true },
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Plan',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const code = row.original.code
      const description = row.original.description
      return (
        <div className="max-w-xs">
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{code}</div>
          {description && (
            <div className="text-xs text-muted-foreground truncate mt-1">
              {description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'price_cents',
    header: 'Precio',
    cell: ({ row }) => {
      const priceCents = row.getValue('price_cents') as number
      const billingPeriod = row.original.billing_period
      return (
        <div>
          <span className="font-medium">{formatPrice(priceCents)}</span>
          <span className="text-xs text-muted-foreground ml-1">
            / {billingPeriodLabels[billingPeriod]}
          </span>
        </div>
      )
    },
  },
  {
    id: 'limits',
    header: 'Límites',
    cell: ({ row }) => {
      const plan = row.original
      return (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span>{plan.max_businesses} negocio(s)</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>{plan.max_users_per_business} usuarios/negocio</span>
          </div>
          <div className="flex items-center gap-1">
            <UserCircle className="h-3 w-3 text-muted-foreground" />
            <span>{plan.max_specialists_per_business} especialistas/negocio</span>
          </div>
        </div>
      )
    },
  },
  {
    id: 'features',
    header: 'Características',
    cell: ({ row }) => {
      const features = row.original.features
      const activeFeatures = Object.entries(features)
        .filter(([key, value]) => typeof value === 'boolean' && value)
        .map(([key]) => key)

      return (
        <div className="flex flex-wrap gap-1 max-w-xs">
          {activeFeatures.slice(0, 3).map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature.replace('has_', '').replace(/_/g, ' ')}
            </Badge>
          ))}
          {activeFeatures.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{activeFeatures.length - 3}
            </Badge>
          )}
          {activeFeatures.length === 0 && (
            <span className="text-muted-foreground text-xs">Sin características</span>
          )}
        </div>
      )
    },
  },
  {
    id: 'status_badge',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.original.status
      const config = statusConfig[status]
      return (
        <Badge variant={config.variant} className="gap-1">
          {status === 'active' ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <XCircle className="h-3 w-3" />
          )}
          {config.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Creación',
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
      return (
        <span className="text-sm text-muted-foreground">
          {format(new Date(date), 'dd MMM yyyy', { locale: es })}
        </span>
      )
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
  },
]
