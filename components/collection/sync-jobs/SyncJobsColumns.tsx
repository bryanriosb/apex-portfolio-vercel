import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { JobRecord } from '@/lib/models/collection/sync-jobs'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'default'
    case 'failed':
      return 'destructive'
    case 'in_progress':
    case 'running':
      return 'default'
    case 'pending':
    case 'recurring':
      return 'outline'
    case 'cancelled':
      return 'outline'
    default:
      return 'outline'
  }
}

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'Completado'
    case 'failed':
      return 'Fallido'
    case 'in_progress':
    case 'running':
      return 'Procesando'
    case 'pending':
      return 'Pendiente'
    case 'recurring':
      return 'Recurrente'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status
  }
}

const getJobTypeLabel = (kind: string, cron: string | null) => {
  if (cron) return 'Recurrente'
  switch (kind?.toLowerCase()) {
    case 'single': return 'Única'
    case 'scheduled': return 'Programada'
    case 'recurring': return 'Recurrente'
    default: return kind || 'Desconocido'
  }
}

const parseDateValue = (val: any): Date | null => {
  if (!val) return null;
  // Si es numérico (timestamp)
  if (!isNaN(Number(val))) {
    const num = Number(val);
    // Si tiene 10 o menos dígitos, asumimos que está en segundos
    return new Date(num * (String(Math.floor(num)).length <= 10 ? 1000 : 1));
  }
  // Si es un string tipo "YYYY-MM-DD HH:mm:ss", reemplazar espacio por T y forzar UTC agregando Z si no lo tiene
  if (typeof val === 'string') {
    let parsedStr = val.replace(' ', 'T');
    if (!parsedStr.endsWith('Z') && !parsedStr.includes('+') && !parsedStr.includes('-')) {
      parsedStr += 'Z'; // Asumimos que viene en UTC de la BD
    }
    return new Date(parsedStr);
  }
  return new Date(val);
};

export const getSyncJobsColumns = (timezone: string): ColumnDef<JobRecord>[] => [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-sm">{row.original.name || 'Sincronización'}</span>
        <span className="text-xs text-muted-foreground">{row.original.category}</span>
      </div>
    ),
  },
  {
    accessorKey: 'kind',
    header: 'Tipo de Ejecución',
    cell: ({ row }) => {
      const typeLabel = getJobTypeLabel(row.original.kind, row.original.cron)
      return <Badge variant="secondary">{typeLabel}</Badge>
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge variant={getStatusBadgeVariant(status) as any}>
          {getStatusLabel(status)}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Fecha de Creación',
    cell: ({ row }) => {
      const val = row.original.created_at
      if (!val) return '-'
      try {
        const date = parseDateValue(val)
        if (!date || isNaN(date.getTime())) return '-'
        return (
          <span className="text-sm font-mono">
            {formatInTimeZone(date, timezone, "MMM dd, yyyy HH:mm", { locale: es })}
          </span>
        )
      } catch (err) {
        return '-'
      }
    },
  },
  {
    accessorKey: 'scheduled_at',
    header: 'Programación',
    cell: ({ row }) => {
      const { scheduled_at, cron } = row.original
      if (cron) {
        return <span className="text-sm font-mono">Cron: {cron}</span>
      }
      if (!scheduled_at) return <span className="text-sm text-muted-foreground">-</span>
      try {
        const date = parseDateValue(scheduled_at)
        if (!date || isNaN(date.getTime())) return '-'
        return (
          <span className="text-sm font-mono">
            {formatInTimeZone(date, timezone, "MMM dd, yyyy HH:mm", { locale: es })}
          </span>
        )
      } catch (err) {
        return '-'
      }
    },
  },
  {
    id: 'actions',
    header: '',
  },
]
