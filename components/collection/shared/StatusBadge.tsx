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
        color: 'bg-gray-500 text-white border-transparent',
    },
    processing: {
        label: 'Procesando',
        variant: 'default',
        color: 'bg-blue-600 text-white border-transparent',
    },
    completed: {
        label: 'Completado',
        variant: 'default',
        color: 'bg-green-600 text-white border-transparent',
    },
    failed: {
        label: 'Error',
        variant: 'destructive',
        color: 'text-white border-transparent',
    },
    paused: {
        label: 'Pausado',
        variant: 'default',
        color: 'bg-yellow-600 text-white border-transparent',
    },
    // Client statuses
    queued: {
        label: 'En Cola',
        variant: 'secondary',
        color: 'bg-gray-400 text-white border-transparent',
    },
    sent: {
        label: 'Enviado',
        variant: 'default',
        color: 'bg-blue-500 text-white border-transparent',
    },
    delivered: {
        label: 'Entregado',
        variant: 'default',
        color: 'bg-green-500 text-white border-transparent',
    },
    opened: {
        label: 'Abierto',
        variant: 'default',
        color: 'bg-emerald-500 text-white border-transparent',
    },
    clicked: {
        label: 'Clic',
        variant: 'default',
        color: 'bg-indigo-500 text-white border-transparent',
    },
    bounced: {
        label: 'Rebotado',
        variant: 'destructive',
        color: 'text-white border-transparent',
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
