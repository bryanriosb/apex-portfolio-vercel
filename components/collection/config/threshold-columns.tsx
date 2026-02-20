import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import { ColumnDef } from '@tanstack/react-table'

export const thresholdColumns: ColumnDef<NotificationThreshold>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => {
      const threshold = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{threshold.name}</span>
          {threshold.description && (
            <span className="text-xs text-muted-foreground">
              {threshold.description}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'days_from',
    header: 'Días Desde',
    cell: ({ row }) => {
      const threshold = row.original
      return <span>{threshold.days_from}</span>
    },
  },
  {
    accessorKey: 'days_to',
    header: 'Días Hasta',
    cell: ({ row }) => {
      const threshold = row.original
      return (
        <span>
          {threshold.days_to !== null && threshold.days_to !== undefined
            ? threshold.days_to
            : 'Sin límite'}
        </span>
      )
    },
  },
  {
    accessorKey: 'email_template',
    header: 'Plantilla Email',
    cell: ({ row }) => {
      const threshold = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{threshold.email_template?.name}</span>
          {threshold.email_template?.subject && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {threshold.email_template.subject}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'display_order',
    header: 'Orden',
    cell: ({ row }) => {
      const threshold = row.original
      return <span className="text-muted-foreground">{threshold.display_order}</span>
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: ({ row }) => {
      return null
    },
  },
]
