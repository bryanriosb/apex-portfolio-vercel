'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  loading?: boolean
  className?: string
  variant?: 'default' | 'warning' | 'danger' | 'success'
}

const variantStyles = {
  default: {
    card: '',
    value: '',
    icon: 'text-muted-foreground',
  },
  warning: {
    card: 'border-amber-200 bg-amber-50/50',
    value: 'text-amber-700',
    icon: 'text-amber-500',
  },
  danger: {
    card: 'border-red-200 bg-red-50/50',
    value: 'text-red-700',
    icon: 'text-red-500',
  },
  success: {
    card: 'border-green-200 bg-green-50/50',
    value: 'text-green-700',
    icon: 'text-green-500',
  },
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
  className,
  variant = 'default',
}: KPICardProps) {
  const styles = variantStyles[variant]

  if (loading) {
    return (
      <Card className={cn('border', className)}>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-32 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border', styles.card, className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{title}</span>
          {Icon && <Icon className={cn('h-4 w-4', styles.icon)} />}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold', styles.value)}>{value}</span>
          {trend && (
            <span
              className={cn(
                'flex items-center text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {Math.abs(trend.value).toFixed(1)}%
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  )
}

interface KPIGridProps {
  children: React.ReactNode
  className?: string
}

export function KPIGrid({ children, className }: KPIGridProps) {
  return (
    <div
      className={cn(
        'grid gap-4 grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  )
}
