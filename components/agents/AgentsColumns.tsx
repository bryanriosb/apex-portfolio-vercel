import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { Agent } from '@/lib/models/agents/agent'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'

export const getAgentsColumns = (
  timezone: string = 'America/Bogota'
): ColumnDef<Agent>[] => [
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
    accessorKey: 'model_provider',
    header: 'Proveedor',
    cell: ({ row }) => {
      const provider = row.getValue('model_provider') as string
      return <Badge variant="outline">{provider}</Badge>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'model_name',
    header: 'Modelo',
    cell: ({ row }) => {
      const model = row.getValue('model_name') as string
      return (
        <div className="text-sm text-muted-foreground font-mono max-w-[180px] truncate">
          {model}
        </div>
      )
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
    accessorKey: 'enable_ui',
    header: 'UI',
    cell: ({ row }) => {
      const enableUi = row.getValue('enable_ui') as boolean
      return (
        <Badge variant={enableUi ? 'default' : 'secondary'}>
          {enableUi ? 'Habilitada' : 'Deshabilitada'}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      const enableUi = row.getValue(id) as boolean
      return value.includes(String(enableUi))
    },
  },
  {
    accessorKey: 'skill_tags',
    header: 'Tags',
    cell: ({ row }) => {
      const tags = row.getValue('skill_tags') as string[]
      if (!tags || tags.length === 0) {
        return <div className="text-sm text-muted-foreground">-</div>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'updated_at',
    header: 'Última Actualización',
    cell: ({ row }) => {
      const date = row.getValue('updated_at') as string
      if (!date) return <div className="text-sm text-muted-foreground">-</div>

      const formatted = formatInBusinessTimeZone(
        date,
        'MMM d, yyyy HH:mm',
        timezone
      )
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
