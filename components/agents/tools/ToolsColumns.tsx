import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { ToolDefinition } from '@/lib/models/agents/tool'
import { toolTypes } from '@/lib/i18n/es-automation'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'

export const getToolsColumns = (
  timezone: string = 'America/Bogota'
): ColumnDef<ToolDefinition>[] => [
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
            <div className="text-xs text-muted-foreground max-w-[240px] truncate">
              {description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'tool_type',
    header: 'Tipo',
    cell: ({ row }) => {
      const toolType = row.getValue('tool_type') as string
      return (
        <Badge variant="outline">{toolTypes[toolType] || toolType}</Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    id: 'language',
    header: 'Lenguaje',
    accessorFn: (tool) =>
      tool.tool_type === 'Function'
        ? tool.execution_config?.language || 'Rust'
        : null,
    cell: ({ getValue }) => {
      const language = getValue() as string | null
      if (!language) {
        return <div className="text-sm text-muted-foreground">-</div>
      }
      return (
        <div className="text-sm text-muted-foreground font-mono">{language}</div>
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
          {isActive ? 'Activa' : 'Inactiva'}
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
