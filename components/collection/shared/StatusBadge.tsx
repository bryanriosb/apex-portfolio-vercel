import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ExecutionStatus, ClientStatus } from '@/lib/models/collection'

interface StatusBadgeProps {
    status: ExecutionStatus | ClientStatus
    className?: string
}

const statusConfig: Record<
    ExecutionStatus | ClientStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
> = {
    // Execution statuses
    pending: {
        label: 'Pendiente',
        variant: 'secondary',
        color: 'text-gray-600',
    },
    processing: {
        label: 'Procesando',
        variant: 'default',
        color: 'text-white',
    },
    completed: {
        label: 'Completado',
        variant: 'outline',
        color: 'text-green-600',
    },
    failed: {
        label: 'Error',
        variant: 'destructive',
        color: 'text-red-600',
    },
    paused: {
        label: 'Pausado',
        variant: 'secondary',
        color: 'text-yellow-600',
    },
    // Client statuses
    queued: {
        label: 'En Cola',
        variant: 'secondary',
        color: 'text-gray-600',
    },
    sent: {
        label: 'Enviado',
        variant: 'default',
        color: 'text-blue-600',
    },
    delivered: {
        label: 'Entregado',
        variant: 'outline',
        color: 'text-green-600',
    },
    opened: {
        label: 'Abierto',
        variant: 'outline',
        color: 'text-emerald-600',
    },
    bounced: {
        label: 'Rebotado',
        variant: 'destructive',
        color: 'text-red-600',
    },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status] || statusConfig.pending

    return (
        <Badge variant={config.variant} className={cn(config.color, className)}>
            {config.label}
        </Badge>
    )
}
