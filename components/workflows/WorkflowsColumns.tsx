import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { WorkflowDefinition } from '@/lib/models/workflows/workflow'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'

export const getWorkflowsColumns = (
  timezone: string = 'America/Bogota'
): ColumnDef<WorkflowDefinition>[] => [
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
            <div className="text-xs text-muted-foreground max-w-[250px] truncate">
              {description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'nodes',
    header: 'Nodos',
    cell: ({ row }) => {
      const graphJson = row.original.graph_json
      const nodeCount = graphJson?.nodes?.length ?? 0
      const edgeCount = graphJson?.edges?.length ?? 0
      return (
        <div className="text-sm text-muted-foreground">
          {nodeCount} nodos · {edgeCount} aristas
        </div>
      )
    },
  },
  {
    accessorKey: 'channels',
    header: 'Canales',
    cell: ({ row }) => {
      const graphJson = row.original.graph_json
      const channels = graphJson?.channels ?? []
      if (channels.length === 0) {
        return <div className="text-sm text-muted-foreground">-</div>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {channels.slice(0, 3).map((ch) => (
            <Badge key={ch} variant="outline" className="text-xs">
              {ch}
            </Badge>
          ))}
          {channels.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{channels.length - 3}
            </Badge>
          )}
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
    accessorKey: 'created_at',
    header: 'Creado',
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
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
