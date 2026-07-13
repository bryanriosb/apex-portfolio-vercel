import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import type { SkillListItem } from '@/lib/models/agents/skill'

export const getSkillsColumns = (): ColumnDef<SkillListItem>[] => [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      return <div className="font-medium">{name}</div>
    },
  },
  {
    accessorKey: 'sha256',
    header: 'Versión de contenido',
    cell: ({ row }) => {
      const sha = row.getValue('sha256') as string
      return (
        <Badge variant="outline" className="font-mono text-xs">
          {sha.slice(0, 12)}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: () => null,
  },
]
