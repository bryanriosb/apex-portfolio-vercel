import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { KeyRound } from 'lucide-react'
import { ProviderLogo } from '@/components/agents/ProviderLogo'
import type { LlmProvider } from '@/lib/models/agents/llm-provider'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'

export const getLlmProvidersColumns = (
  timezone: string = 'America/Bogota',
  getProviderLabel: (provider: string) => string = (provider) => provider
): ColumnDef<LlmProvider>[] => [
  {
    accessorKey: 'provider',
    header: 'Proveedor',
    cell: ({ row }) => {
      const provider = row.getValue('provider') as string
      return (
        <div className="flex items-center gap-2">
          <ProviderLogo provider={provider} className="size-5" />
          <div className="space-y-0.5">
            <div className="font-medium">{getProviderLabel(provider)}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {provider}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'base_url',
    header: 'Base URL',
    cell: ({ row }) => {
      const baseUrl = row.getValue('base_url') as string | null
      if (!baseUrl) {
        return <div className="text-sm text-muted-foreground">Por defecto</div>
      }
      return (
        <div className="text-sm text-muted-foreground font-mono max-w-[280px] truncate">
          {baseUrl}
        </div>
      )
    },
  },
  {
    accessorKey: 'has_api_key',
    header: 'API Key',
    cell: ({ row }) => {
      const hasApiKey = row.getValue('has_api_key') as boolean
      return (
        <Badge variant={hasApiKey ? 'outline' : 'secondary'} className="gap-1">
          <KeyRound className="h-3 w-3" />
          {hasApiKey ? 'Configurada' : 'Sin clave'}
        </Badge>
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
