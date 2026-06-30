import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { IntegrationConfig } from '@/lib/models/integrations/integration-config'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'

export const getIntegrationsColumns = (timezone: string = 'America/Bogota'): ColumnDef<IntegrationConfig>[] => [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const description = row.original.description
      return (
        <div className="space-y-0.5">
          <div className="font-medium">{name}</div>
          {description && (
            <div className="text-xs text-muted-foreground max-w-[200px] truncate">
              {description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'connector_id',
    header: 'Conector',
    cell: ({ row }) => {
      const connector = row.getValue('connector_id') as string
      return <Badge variant="outline">{connector}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'scope',
    header: 'Alcance',
    cell: ({ row }) => {
      const scope = row.getValue('scope') as string
      return (
        <Badge variant={scope === 'Account' ? 'default' : 'secondary'}>
          {scope === 'Account' ? 'Cuenta' : 'Negocio'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Estado',
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const isActive = row.getValue(id) as boolean
      return value.includes(String(isActive))
    },
  },
  {
    accessorKey: 'updated_at',
    header: 'Última Actualización',
    cell: ({ row }) => {
      const date = row.getValue('updated_at') as string
      if (!date) return <div className="text-sm text-muted-foreground">-</div>

      const formatted = formatInBusinessTimeZone(date, 'MMM d, yyyy HH:mm', timezone)
      return (
        <div className="text-sm text-muted-foreground font-mono">
          {formatted}
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    cell: () => null,
  },
]
