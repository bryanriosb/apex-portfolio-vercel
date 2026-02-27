'use client'

import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable, FilterConfig } from '@/components/DataTable'
import { CollectionClient, ClientStatus } from '@/lib/models/collection'
import { fetchClientsByExecutionAction } from '@/lib/actions/collection/client'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  Clock,
  Mail,
  MailOpen,
  AlertTriangle,
  XCircle,
  Loader2,
  RotateCcw,
  MessageSquare,
  Smartphone,
  MousePointerClick,
} from 'lucide-react'
import { formatDateInTimezone } from '@/lib/utils/date-format'

interface ClientsDataTableProps {
  executionId: string
  timezone: string
}

const statusConfig: Record<
  ClientStatus,
  { label: string; icon: any; color: string }
> = {
  pending: { label: 'Pendiente', icon: Clock, color: 'bg-gray-500' },
  queued: { label: 'En cola', icon: Loader2, color: 'bg-blue-500' },
  sent: { label: 'Enviado', icon: Mail, color: 'bg-yellow-500' },
  delivered: { label: 'Entregado', icon: CheckCircle2, color: 'bg-green-500' },
  opened: { label: 'Abierto', icon: MailOpen, color: 'bg-purple-500' },
  bounced: { label: 'Rebotado', icon: XCircle, color: 'bg-red-500' },
  failed: { label: 'Fallido', icon: AlertTriangle, color: 'bg-orange-500' },
  clicked: { label: 'Clicado', icon: MousePointerClick, color: 'bg-blue-400' },
}

export function ClientsDataTable({
  executionId,
  timezone,
}: ClientsDataTableProps) {
  const columns = useMemo<ColumnDef<CollectionClient>[]>(
    () => [
      {
        accessorKey: 'custom_data.nit',
        header: 'Empresa',
        cell: ({ row }) => {
          const customData = row.original.custom_data || {}
          return (
            <div className="flex flex-col">
              <span className="font-medium truncate max-w-[400px]">
                {customData.company_name || '-'}
              </span>
              {customData.nit && (
                <span className="text-xs text-muted-foreground">
                  NIT: {customData.nit}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const status = row.original.status
          const config = statusConfig[status]
          const Icon = config.icon
          return (
            <Badge className="flex items-center gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'email_sent_at',
        header: 'Enviado',
        cell: ({ row }) => {
          const date = row.original.email_sent_at
          if (!date) return <span className="text-muted-foreground">-</span>
          return (
            <div className="flex flex-col">
              <span className="text-xs">
                {formatDateInTimezone(date, timezone)}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'email_delivered_at',
        header: 'Entregado',
        cell: ({ row }) => {
          const date = row.original.email_delivered_at
          if (!date) return <span className="text-muted-foreground">-</span>
          return (
            <span className="text-xs">
              {formatDateInTimezone(date, timezone)}
            </span>
          )
        },
      },
      {
        accessorKey: 'email_opened_at',
        header: 'Abierto',
        cell: ({ row }) => {
          const date = row.original.email_opened_at
          if (!date) return <span className="text-muted-foreground">-</span>
          return (
            <span className="text-xs">
              {formatDateInTimezone(date, timezone)}
            </span>
          )
        },
      },
      {
        accessorKey: 'invoices',
        header: 'Facturas',
        cell: ({ row }) => {
          const invoices = row.original.invoices || []
          const customData = row.original.custom_data || {}
          // Usar total_amount_due de custom_data si existe
          const totalAmount = customData.total_amount_due
            ? parseFloat(customData.total_amount_due)
            : invoices.reduce((sum: number, inv: any) => {
                return sum + (parseFloat(inv.amount) || 0)
              }, 0)
          return (
            <div className="flex flex-col">
              <span className="font-medium">{invoices.length} factura(s)</span>
              <span className="text-xs text-muted-foreground">
                ${totalAmount.toFixed(2)}
              </span>
            </div>
          )
        },
      },
      {
        accessorKey: 'fallback_required',
        header: 'Fallback',
        cell: ({ row }) => {
          const fallbackRequired = row.original.fallback_required
          const fallbackSent = row.original.fallback_sent_at
          const fallbackType = row.original.fallback_type

          if (!fallbackRequired) {
            return <span className="text-muted-foreground">-</span>
          }

          const FallbackIcon =
            fallbackType === 'sms' ? Smartphone : MessageSquare

          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant={fallbackSent ? 'default' : 'outline'}
                className="flex items-center gap-1 w-fit"
              >
                <FallbackIcon className="h-3 w-3" />
                {fallbackType?.toUpperCase() || 'FALLBACK'}
              </Badge>
              {fallbackSent && (
                <span className="text-xs text-muted-foreground">
                  {formatDateInTimezone(fallbackSent, timezone)}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'email_bounce_type',
        header: 'Rebote',
        cell: ({ row }) => {
          const bounceType = row.original.email_bounce_type
          const bounceReason = row.original.email_bounce_reason

          if (!bounceType) {
            return <span className="text-muted-foreground">-</span>
          }

          return (
            <div className="flex flex-col">
              <Badge variant="destructive" className="w-fit">
                {bounceType === 'hard'
                  ? 'Duro'
                  : bounceType === 'soft'
                    ? 'Suave'
                    : 'Queja'}
              </Badge>
              {bounceReason && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                  {bounceReason}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'error_message',
        header: 'Error',
        cell: ({ row }) => {
          const error = row.original.error_message
          if (!error) return <span className="text-muted-foreground">-</span>
          return (
            <span className="text-xs text-destructive truncate max-w-[200px] block">
              {error}
            </span>
          )
        },
      },
      {
        accessorKey: 'retry_count',
        header: 'Reintentos',
        cell: ({ row }) => {
          const count = row.original.retry_count
          return (
            <div className="flex items-center gap-2">
              {count > 0 ? (
                <>
                  <RotateCcw className="h-3 w-3 text-muted-foreground" />
                  <span>{count}</span>
                </>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </div>
          )
        },
      },
    ],
    []
  )

  const filters = useMemo<FilterConfig[]>(
    () => [
      {
        column: 'status',
        title: 'Estado',
        options: Object.entries(statusConfig).map(([value, config]) => ({
          label: config.label,
          value,
          icon: config.icon,
        })),
      },
      {
        column: 'fallback_required',
        title: 'Requiere Fallback',
        options: [
          { label: 'Sí', value: 'true' },
          { label: 'No', value: 'false' },
        ],
      },
      {
        column: 'email_bounce_type',
        title: 'Tipo de Rebote',
        options: [
          { label: 'Duro', value: 'hard' },
          { label: 'Suave', value: 'soft' },
          { label: 'Queja', value: 'complaint' },
        ],
      },
      {
        column: 'fallback_type',
        title: 'Tipo Fallback',
        options: [
          { label: 'SMS', value: 'sms' },
          { label: 'WhatsApp', value: 'whatsapp' },
        ],
      },
    ],
    []
  )

  const service = useMemo(
    () => ({
      fetchItems: async (params: any) => {
        const response = await fetchClientsByExecutionAction({
          ...params,
          execution_id: executionId,
        })
        return {
          data: response.data,
          total: response.total,
          total_pages: response.total_pages,
        }
      },
    }),
    [executionId]
  )

  return (
    <DataTable
      columns={columns}
      service={service}
      filters={filters}
      searchConfig={{
        column: 'custom_data.email',
        placeholder: 'Buscar por email, nombre o empresa...',
      }}
      defaultQueryParams={{ execution_id: executionId }}
      exportConfig={{
        enabled: true,
        tableName: 'clientes-cobro',
      }}
    />
  )
}
