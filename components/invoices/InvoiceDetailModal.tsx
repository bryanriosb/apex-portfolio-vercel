'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils/currency'
import type { Invoice } from '@/lib/models/invoice/invoice'
import type { InvoiceStatus } from '@/lib/types/enums'

interface InvoiceDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: Invoice | null
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    label: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  DRAFT: { label: 'Borrador', variant: 'secondary' },
  ISSUED: { label: 'Emitida', variant: 'outline' },
  PAID: { label: 'Pagada', variant: 'default' },
  CANCELLED: { label: 'Anulada', variant: 'destructive' },
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  AT_VENUE: 'En el local',
  CREDIT_CARD: 'Tarjeta de crédito',
  PAYPAL: 'PayPal',
  NEQUI: 'Nequi',
}

export default function InvoiceDetailModal({
  open,
  onOpenChange,
  invoice,
}: InvoiceDetailModalProps) {
  if (!invoice) return null

  const statusConfig = STATUS_CONFIG[invoice.status]

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Factura {invoice.invoice_number}</DialogTitle>
            <Badge className="relative top-4" variant={statusConfig.variant}>
              {statusConfig.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Negocio
              </h4>
              <div className="text-sm space-y-1">
                <p className="font-medium">{invoice.business_name}</p>
                {invoice.business_address && <p>{invoice.business_address}</p>}
                {invoice.business_phone && <p>{invoice.business_phone}</p>}
                {invoice.business_nit && <p>NIT: {invoice.business_nit}</p>}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Cliente
              </h4>
              <div className="text-sm space-y-1">
                <p className="font-medium">{invoice.customer_name}</p>
                {invoice.customer_email && <p>{invoice.customer_email}</p>}
                {invoice.customer_phone && <p>{invoice.customer_phone}</p>}
                {invoice.customer_identification_type &&
                  invoice.customer_identification_number && (
                    <p>
                      {invoice.customer_identification_type}:{' '}
                      {invoice.customer_identification_number}
                    </p>
                  )}
                {invoice.customer_address && <p>{invoice.customer_address}</p>}
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Servicios
            </h4>
            <div className="border rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Descripción</th>
                    <th className="text-center p-3 font-medium w-20">Cant.</th>
                    <th className="text-right p-3 font-medium w-28">Precio</th>
                    <th className="text-right p-3 font-medium w-28">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoice.items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-3">
                        <div>{item.name}</div>
                        {item.tax_rate !== null &&
                        item.tax_rate !== undefined &&
                        item.tax_rate > 0 ? (
                          <span className="text-xs text-primary">
                            IVA {item.tax_rate}% (
                            {formatCurrency((item.tax_cents || 0) / 100)})
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Sin IVA
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">{item.quantity}</td>
                      <td className="p-3 text-right">
                        {formatCurrency(item.unit_price_cents / 100)}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(item.total_cents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal (sin IVA)
                </span>
                <span>{formatCurrency(invoice.subtotal_cents / 100)}</span>
              </div>
              {invoice.tax_cents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{formatCurrency(invoice.tax_cents / 100)}</span>
                </div>
              )}
              {invoice.discount_cents > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Descuento</span>
                  <span>-{formatCurrency(invoice.discount_cents / 100)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-lg">
                  {formatCurrency(invoice.total_cents / 100)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Método de pago: </span>
              <span className="font-medium">
                {invoice.payment_method
                  ? PAYMENT_METHOD_LABELS[invoice.payment_method] ||
                    invoice.payment_method
                  : '-'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Fecha de emisión: </span>
              <span className="font-medium">
                {formatDate(invoice.issued_at)}
              </span>
            </div>
            {invoice.paid_at && (
              <div>
                <span className="text-muted-foreground">Fecha de pago: </span>
                <span className="font-medium">
                  {formatDate(invoice.paid_at)}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Creada: </span>
              <span className="font-medium">
                {formatDate(invoice.created_at)}
              </span>
            </div>
          </div>

          {invoice.notes && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Notas
                </h4>
                <p className="text-sm">{invoice.notes}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
