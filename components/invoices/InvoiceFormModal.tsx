'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import type {
  Invoice,
  InvoiceCreatePayload,
  InvoiceUpdatePayload,
  InvoiceStatus,
} from '@/lib/models/invoice/types'
import { searchBusinessCustomersAction } from '@/lib/actions/business-customer'
import { Loader2 } from 'lucide-react'

const formSchema = z.object({
  erp_id: z.string().min(1, 'El ID del ERP es requerido'),
  invoice_number: z.string().min(1, 'El número de factura es requerido'),
  invoice_date: z.string().min(1, 'La fecha de emisión es requerida'),
  due_date: z.string().min(1, 'La fecha de vencimiento es requerida'),
  amount_total: z.number().min(0, 'El monto total debe ser mayor o igual a 0'),
  amount_due: z.number().min(0, 'El monto pendiente debe ser mayor o igual a 0'),
  status: z.enum(['draft', 'pending', 'paid', 'partial', 'cancelled']),
  client_id: z.string().optional(),
})

type InvoiceFormValues = z.infer<typeof formSchema>

interface InvoiceFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice | null
  onSave: (
    data: InvoiceCreatePayload | InvoiceUpdatePayload,
    invoiceId?: string
  ) => Promise<void>
  businessId: string
}

const statusLabels: Record<InvoiceStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  paid: 'Pagada',
  partial: 'Parcial',
  cancelled: 'Cancelada',
}

export function InvoiceFormModal({
  open,
  onOpenChange,
  invoice,
  onSave,
  businessId,
}: InvoiceFormModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [clientOptions, setClientOptions] = useState<ComboboxOption[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [clientSearch, setClientSearch] = useState('')
  const isEdit = !!invoice

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      erp_id: '',
      invoice_number: '',
      invoice_date: '',
      due_date: '',
      amount_total: 0,
      amount_due: 0,
      status: 'draft',
      client_id: undefined,
    },
  })

  useEffect(() => {
    if (invoice) {
      form.reset({
        erp_id: invoice.erp_id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date.split('T')[0],
        due_date: invoice.due_date.split('T')[0],
        amount_total: invoice.amount_total,
        amount_due: invoice.amount_due,
        status: invoice.status,
        client_id: undefined,
      })
    } else {
      form.reset({
        erp_id: '',
        invoice_number: '',
        invoice_date: '',
        due_date: '',
        amount_total: 0,
        amount_due: 0,
        status: 'draft',
        client_id: undefined,
      })
    }
  }, [invoice, form])

  const searchClients = useCallback(
    async (query: string) => {
      if (!businessId) return
      setIsLoadingClients(true)
      try {
        const results = await searchBusinessCustomersAction(
          businessId,
          query,
          50
        )
        setClientOptions(
          results.map((c) => ({
            value: c.id,
            label: c.full_name,
            description: c.nit,
          }))
        )
      } catch (error) {
        console.error('Error searching clients:', error)
      } finally {
        setIsLoadingClients(false)
      }
    },
    [businessId]
  )

  useEffect(() => {
    if (open) {
      searchClients('')
    }
  }, [open, searchClients])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (open) {
        searchClients(clientSearch)
      }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [clientSearch, open, searchClients])

  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEdit && invoice) {
        const payload: InvoiceUpdatePayload = {
          invoice_number: data.invoice_number,
          due_date: new Date(data.due_date).toISOString(),
          amount_total: data.amount_total,
          amount_due: data.amount_due,
          status: data.status,
        }
        await onSave(payload, invoice.id)
      } else {
        const payload: InvoiceCreatePayload = {
          erp_id: data.erp_id,
          invoice_number: data.invoice_number,
          invoice_date: new Date(data.invoice_date).toISOString(),
          due_date: new Date(data.due_date).toISOString(),
          amount_total: data.amount_total,
          amount_due: data.amount_due,
          status: data.status,
          client_id: data.client_id,
        }
        await onSave(payload)
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error saving invoice:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Factura' : 'Crear Factura'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información de la factura'
              : 'Registra una nueva factura'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEdit && (
              <FormField
                control={form.control}
                name="erp_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      ID ERP <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="odoo-INV-001"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="invoice_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    N° Factura <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="INV-2024-001"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Fecha Emisión <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Vencimiento <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Monto Total <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        disabled={isSubmitting}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount_due"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Saldo Pendiente{' '}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        disabled={isSubmitting}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Estado <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (opcional)</FormLabel>
                  <FormControl>
                    <Combobox
                      options={clientOptions}
                      value={field.value || null}
                      onChange={field.onChange}
                      placeholder="Seleccionar cliente..."
                      searchPlaceholder="Buscar cliente..."
                      emptyText="No se encontraron clientes"
                      disabled={isSubmitting}
                      isLoading={isLoadingClients}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
