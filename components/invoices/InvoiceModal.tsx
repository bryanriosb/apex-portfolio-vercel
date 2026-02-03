'use client'

import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Loading from '@/components/ui/loading'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import InvoiceItemsEditor from './InvoiceItemsEditor'
import { formatCurrency } from '@/lib/utils/currency'
import type {
  Invoice,
  InvoiceInsert,
  InvoiceUpdate,
  InvoiceItem,
} from '@/lib/models/invoice/invoice'
import type { InvoiceStatus, PaymentMethod } from '@/lib/types/enums'

interface InvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice | null
  businessId: string
  businessData: {
    name: string
    address?: string
    phone?: string
    nit?: string
  }
  nextInvoiceNumber: string
  onSave: (
    data: InvoiceInsert | InvoiceUpdate,
    invoiceId?: string
  ) => Promise<void>
}

interface InvoiceFormData {
  invoice_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_identification_type: string
  customer_identification_number: string
  customer_address: string
  status: InvoiceStatus
  payment_method: PaymentMethod | ''
  notes: string
  items: InvoiceItem[]
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ISSUED', label: 'Emitida' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'CANCELLED', label: 'Anulada' },
]

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'AT_VENUE', label: 'En el local' },
  { value: 'CREDIT_CARD', label: 'Tarjeta de crédito' },
  { value: 'PAYPAL', label: 'PayPal' },
  { value: 'NEQUI', label: 'Nequi' },
]

const IDENTIFICATION_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PASSPORT', label: 'Pasaporte' },
]

const getDefaultFormData = (
  invoice?: Invoice | null,
  nextInvoiceNumber?: string
): InvoiceFormData => ({
  invoice_number: invoice?.invoice_number || nextInvoiceNumber || '',
  customer_name: invoice?.customer_name || '',
  customer_email: invoice?.customer_email || '',
  customer_phone: invoice?.customer_phone || '',
  customer_identification_type: invoice?.customer_identification_type || '',
  customer_identification_number: invoice?.customer_identification_number || '',
  customer_address: invoice?.customer_address || '',
  status: invoice?.status || 'DRAFT',
  payment_method: invoice?.payment_method || '',
  notes: invoice?.notes || '',
  items: invoice?.items || [],
})

export default function InvoiceModal({
  open,
  onOpenChange,
  invoice,
  businessId,
  businessData,
  nextInvoiceNumber,
  onSave,
}: InvoiceModalProps) {
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<InvoiceFormData>(
    getDefaultFormData(invoice, nextInvoiceNumber)
  )

  const isEditing = !!invoice
  const isLocked = invoice?.status === 'PAID' || invoice?.status === 'CANCELLED'

  useEffect(() => {
    if (open) {
      setFormData(getDefaultFormData(invoice, nextInvoiceNumber))
      setShowCustomerDetails(!!invoice?.customer_identification_number)
    }
  }, [open, invoice, nextInvoiceNumber])

  const updateField = <K extends keyof InvoiceFormData>(
    field: K,
    value: InvoiceFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const calculations = useMemo(() => {
    const totalCents = formData.items.reduce(
      (sum, item) => sum + item.total_cents,
      0
    )
    const taxCents = formData.items.reduce(
      (sum, item) => sum + (item.tax_cents || 0),
      0
    )
    const subtotalCents = totalCents - taxCents
    const avgTaxRate =
      subtotalCents > 0 ? Math.round((taxCents / subtotalCents) * 100) : 0
    return { subtotalCents, taxCents, totalCents, avgTaxRate }
  }, [formData.items])

  const handleSubmit = async () => {
    if (!formData.customer_name.trim() || formData.items.length === 0) return

    setIsSaving(true)
    try {
      if (isEditing) {
        const updateData: InvoiceUpdate = {
          customer_name: formData.customer_name.trim(),
          customer_email: formData.customer_email.trim() || null,
          customer_phone: formData.customer_phone.trim() || null,
          customer_identification_type:
            formData.customer_identification_type || null,
          customer_identification_number:
            formData.customer_identification_number.trim() || null,
          customer_address: formData.customer_address.trim() || null,
          status: formData.status,
          payment_method: formData.payment_method || null,
          notes: formData.notes.trim() || null,
          items: formData.items,
          subtotal_cents: calculations.subtotalCents,
          tax_cents: calculations.taxCents,
          total_cents: calculations.totalCents,
          issued_at:
            formData.status === 'ISSUED' && !invoice?.issued_at
              ? new Date().toISOString()
              : undefined,
          paid_at:
            formData.status === 'PAID' && !invoice?.paid_at
              ? new Date().toISOString()
              : undefined,
        }
        await onSave(updateData, invoice.id)
      } else {
        const insertData: InvoiceInsert = {
          business_id: businessId,
          invoice_number: formData.invoice_number,
          customer_name: formData.customer_name.trim(),
          customer_email: formData.customer_email.trim() || null,
          customer_phone: formData.customer_phone.trim() || null,
          customer_identification_type:
            formData.customer_identification_type || null,
          customer_identification_number:
            formData.customer_identification_number.trim() || null,
          customer_address: formData.customer_address.trim() || null,
          business_name: businessData.name,
          business_address: businessData.address || null,
          business_phone: businessData.phone || null,
          business_nit: businessData.nit || null,
          status: formData.status,
          payment_method: formData.payment_method || null,
          notes: formData.notes.trim() || null,
          items: formData.items,
          subtotal_cents: calculations.subtotalCents,
          tax_rate: calculations.avgTaxRate,
          tax_cents: calculations.taxCents,
          total_cents: calculations.totalCents,
          issued_at:
            formData.status !== 'DRAFT' ? new Date().toISOString() : null,
        }
        await onSave(insertData)
      }
      onOpenChange(false)
    } finally {
      setIsSaving(false)
    }
  }

  const isValid = formData.customer_name.trim() && formData.items.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-screen sm:max-h-[90vh] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Factura ${invoice.invoice_number}` : 'Nueva Factura'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 min-h-full overflow-y-auto">
          <div className="flex-1  space-y-6 pr-2 pb-4">
            <div className="space-y-2">
              <Label>N° Factura</Label>
              <Input
                value={formData.invoice_number}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  updateField('status', value as InvoiceStatus)
                }
                disabled={isLocked}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Nombre del cliente *</Label>
            <Input
              value={formData.customer_name}
              onChange={(e) => updateField('customer_name', e.target.value)}
              placeholder="Nombre completo"
              disabled={isLocked}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.customer_email}
                onChange={(e) => updateField('customer_email', e.target.value)}
                placeholder="correo@ejemplo.com"
                disabled={isLocked}
              />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                value={formData.customer_phone}
                onChange={(e) => updateField('customer_phone', e.target.value)}
                placeholder="+57 300 123 4567"
                disabled={isLocked}
              />
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-between text-muted-foreground"
            onClick={() => setShowCustomerDetails(!showCustomerDetails)}
          >
            <span>Datos de facturación adicionales</span>
            {showCustomerDetails ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showCustomerDetails && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de documento</Label>
                  <Select
                    value={formData.customer_identification_type}
                    onValueChange={(value) =>
                      updateField('customer_identification_type', value)
                    }
                    disabled={isLocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {IDENTIFICATION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Número de documento</Label>
                  <Input
                    value={formData.customer_identification_number}
                    onChange={(e) =>
                      updateField(
                        'customer_identification_number',
                        e.target.value
                      )
                    }
                    placeholder="123456789"
                    disabled={isLocked}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input
                  value={formData.customer_address}
                  onChange={(e) =>
                    updateField('customer_address', e.target.value)
                  }
                  placeholder="Dirección del cliente"
                  disabled={isLocked}
                />
              </div>
            </div>
          )}

          <Separator />

          <InvoiceItemsEditor
            items={formData.items}
            onChange={(items) => updateField('items', items)}
            disabled={isLocked}
          />

          <Separator />

          <div className="space-y-2 bg-muted/50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (sin IVA)</span>
              <span>{formatCurrency(calculations.subtotalCents / 100)}</span>
            </div>
            {calculations.taxCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA</span>
                <span>{formatCurrency(calculations.taxCents / 100)}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-lg">
                {formatCurrency(calculations.totalCents / 100)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) =>
                updateField('payment_method', value as PaymentMethod)
              }
              disabled={isLocked}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Notas adicionales para la factura..."
              rows={2}
              disabled={isLocked}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving || !isValid || isLocked}
          >
            {isSaving && <Loading className="mr-2 h-4 w-4" />}
            {isSaving
              ? 'Guardando'
              : isEditing
              ? 'Actualizar'
              : 'Crear Factura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
