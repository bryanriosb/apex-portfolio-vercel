import { ColumnDef } from '@tanstack/react-table'
import { FileCode2, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SkillListItem } from '@/lib/models/agents/skill'

const MAX_VISIBLE_BADGES = 3

function BadgeOverflow({ values }: { values: string[] }) {
  if (values.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  const visible = values.slice(0, MAX_VISIBLE_BADGES)
  const hidden = values.length - visible.length
  return (
    <div className="flex flex-wrap items-center gap-1">
      {visible.map((value) => (
        <Badge key={value} variant="secondary" className="text-xs">
          {value}
        </Badge>
      ))}
      {hidden > 0 && (
        <Badge variant="outline" className="text-xs">
          +{hidden}
        </Badge>
      )}
    </div>
  )
}

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
    id: 'description',
    header: 'Descripción',
    accessorFn: (item) => item.metadata?.description ?? '',
    cell: ({ row }) => {
      const description = row.original.metadata?.description
      return description ? (
        <span
          className="block max-w-[280px] truncate text-sm text-muted-foreground"
          title={description}
        >
          {description}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )
    },
  },
  {
    id: 'tags',
    header: 'Tags',
    cell: ({ row }) => (
      <BadgeOverflow values={row.original.metadata?.tags ?? []} />
    ),
  },
  {
    id: 'allowed_tools',
    header: 'Herramientas',
    cell: ({ row }) => {
      const tools = row.original.metadata?.allowed_tools ?? []
      if (tools.length === 0) {
        return (
          <span className="text-xs text-muted-foreground">Sin restricción</span>
        )
      }
      return (
        <span
          className="inline-flex items-center gap-1 text-sm"
          title={tools.join(', ')}
        >
          <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
          {tools.length}
        </span>
      )
    },
  },
  {
    id: 'references',
    header: 'References',
    cell: ({ row }) => {
      const references = row.original.metadata?.references ?? []
      if (references.length === 0) {
        return <span className="text-xs text-muted-foreground">—</span>
      }
      return (
        <span
          className="inline-flex items-center gap-1 text-sm"
          title={references.join(', ')}
        >
          <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
          {references.length}
        </span>
      )
    },
  },
  {
    accessorKey: 'sha256',
    header: 'Versión',
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
