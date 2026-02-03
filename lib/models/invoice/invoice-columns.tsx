'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import type { Invoice } from './invoice'
import type { InvoiceStatus } from '@/lib/types/enums'

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  DRAFT: { label: 'Borrador', variant: 'secondary' },
  ISSUED: { label: 'Emitida', variant: 'default' },
  PAID: { label: 'Pagada', variant: 'outline' },
  CANCELLED: { label: 'Anulada', variant: 'destructive' },
}

export const INVOICE_COLUMNS: ColumnDef<Invoice>[] = [
  {
    accessorKey: 'invoice_number',
    header: 'N° Factura',
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue('invoice_number')}</span>
    ),
  },
  {
    accessorKey: 'customer_name',
    header: 'Cliente',
    cell: ({ row }) => {
      const invoice = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{invoice.customer_name}</span>
          {invoice.customer_email && (
            <span className="text-xs text-muted-foreground">
              {invoice.customer_email}
            </span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'subtotal_cents',
    header: 'Subtotal',
    cell: ({ row }) => formatCurrency(row.original.subtotal_cents / 100),
  },
  {
    accessorKey: 'tax_cents',
    header: 'IVA (19%)',
    cell: ({ row }) => formatCurrency(row.original.tax_cents / 100),
  },
  {
    accessorKey: 'total_cents',
    header: 'Total',
    cell: ({ row }) => (
      <span className="font-semibold">
        {formatCurrency(row.original.total_cents / 100)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.getValue('status') as InvoiceStatus
      const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT
      return (
        <Badge variant={config.variant} className="block w-full text-center">
          {config.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => {
      const date = new Date(row.getValue('created_at'))
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    },
  },
  {
    id: 'actions',
    cell: () => null,
  },
]
