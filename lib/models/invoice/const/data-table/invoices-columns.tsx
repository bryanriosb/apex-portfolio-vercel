import type { Invoice, InvoiceStatus } from '@/lib/models/invoice/types'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'

const statusLabels: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  paid: 'Pagada',
  partial: 'Parcial',
  cancelled: 'Cancelada',
}

const statusVariants: Record<
  InvoiceStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  draft: 'outline',
  pending: 'secondary',
  paid: 'default',
  partial: 'outline',
  cancelled: 'destructive',
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const getInvoicesColumns = (
  timezone: string = 'America/Bogota'
): ColumnDef<Invoice>[] => [
    {
      accessorKey: 'invoice_number',
      header: 'N° Factura',
      cell: ({ row }) => {
        const invoiceNumber = row.original.invoice_number
        return <div className="text-sm font-medium">{invoiceNumber}</div>
      },
    },
    {
      accessorKey: 'client_name',
      header: 'Cliente',
      cell: ({ row }) => {
        const clientName = row.original.client_name
        return (
          <div className="text-sm font-mono">
            {clientName || <span className="text-muted-foreground">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: 'client_tax_id',
      header: 'NIT',
      cell: ({ row }) => {
        const clientTaxId = row.original.client_tax_id
        return (
          <div className="text-sm font-mono">
            {clientTaxId || <span className="text-muted-foreground">-</span>}
          </div>
        )
      },
    },
    {
      accessorKey: 'invoice_date',
      header: 'Fecha Emisión',
      cell: ({ row }) => {
        const date = row.original.invoice_date
        return (
          <div className="text-sm">
            {formatInBusinessTimeZone(date, 'dd MMM yyyy', timezone)}
          </div>
        )
      },
    },
    {
      accessorKey: 'due_date',
      header: 'Vencimiento',
      cell: ({ row }) => {
        const date = row.original.due_date
        return (
          <div className="text-sm">
            {formatInBusinessTimeZone(date, 'dd MMM yyyy', timezone)}
          </div>
        )
      },
    },
    {
      accessorKey: 'amount_total',
      header: 'Monto Total',
      cell: ({ row }) => {
        const amount = row.original.amount_total
        return <div className="text-sm font-mono">{formatCurrency(amount)}</div>
      },
    },
    {
      accessorKey: 'amount_due',
      header: 'Saldo Pendiente',
      cell: ({ row }) => {
        const amount = row.original.amount_due
        return <div className="text-sm font-mono">{formatCurrency(amount)}</div>
      },
    },
    {
      accessorKey: 'days_overdue',
      header: 'Días Atraso',
      cell: ({ row }) => {
        const days = row.original.days_overdue
        return (
          <div
            className={`text-sm ${days > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'
              }`}
          >
            {days > 0 ? days : '-'}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: 'Estado',
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge variant={statusVariants[status]} className="text-center">
            {statusLabels[status]}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Creado',
      cell: ({ row }) => {
        const date = row.original.created_at
        return (
          <div className="text-sm text-muted-foreground font-mono">
            {formatInBusinessTimeZone(date, 'dd MMM yyyy, HH:mm', timezone)}
          </div>
        )
      },
    },
    {
      accessorKey: 'updated_at',
      header: 'Actualizado',
      cell: ({ row }) => {
        const date = row.original.updated_at
        return (
          <div className="text-sm text-muted-foreground font-mono">
            {formatInBusinessTimeZone(date, 'dd MMM yyyy, HH:mm', timezone)}
          </div>
        )
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
    },
  ]
