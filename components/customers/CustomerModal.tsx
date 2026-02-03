'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
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
import { TagsSelector } from '@/components/TagsSelector'
import { CategorySelector } from '@/components/CategorySelector'
import type {
  BusinessCustomer,
  BusinessCustomerUpdate,
  CreateCustomerInput,
  CustomerStatus,
  CustomerCategory,
} from '@/lib/models/customer/business-customer'
import PhoneInput from 'react-phone-number-input'

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'vip', label: 'VIP' },
  { value: 'blocked', label: 'Bloqueado' },
]

const formSchema = z.object({
  company_name: z.string().optional(),
  nit: z.string().min(1, 'El NIT es requerido'),
  full_name: z.string().min(1, 'El nombre completo es requerido'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'vip', 'blocked']).optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof formSchema>

interface CustomerModalProps {
  businessId: string
  businessAccountId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: BusinessCustomer | null
  onSave: (
    data: CreateCustomerInput | BusinessCustomerUpdate,
    customerId?: string
  ) => Promise<void>
}

function CustomerModal({
  businessId,
  businessAccountId,
  open,
  onOpenChange,
  customer,
  onSave,
}: CustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tags, setTags] = useState<string[]>([])

  const isEditing = !!customer

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: '',
      nit: '',
      full_name: '',
      email: '',
      phone: '',
      status: 'active',
      category: 'none',
      notes: '',
      preferences: '',
    },
  })

  useEffect(() => {
    if (open) {
      if (customer) {
        let normalizedPhone = customer.phone || ''
        if (normalizedPhone && !normalizedPhone.startsWith('+')) {
          normalizedPhone = '+' + normalizedPhone
        }

        setTags(customer.tags || [])
        form.reset({
          company_name: customer.company_name || '',
          nit: customer.nit,
          full_name: customer.full_name,
          email: customer.email,
          phone: normalizedPhone,
          status: customer.status,
          category: customer.category || 'none',
          notes: customer.notes || '',
          preferences: customer.preferences || '',
        })
      } else {
        setTags([])
        form.reset({
          company_name: '',
          nit: '',
          full_name: '',
          email: '',
          phone: '',
          status: 'active',
          category: 'none',
          notes: '',
          preferences: '',
        })
      }
    }
  }, [open, customer, form])

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true)
    try {
      if (isEditing && customer) {
        const updateData: BusinessCustomerUpdate = {
          company_name: data.company_name?.trim() || null,
          nit: data.nit.trim(),
          full_name: data.full_name.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || null,
          status: data.status,
          category:
            data.category === 'none' ? null : data.category?.trim() || null,
          notes: data.notes?.trim() || null,
          preferences: data.preferences?.trim() || null,
          tags: tags,
        }
        await onSave(updateData, customer.id)
      } else {
        const createData: CreateCustomerInput = {
          business_id: businessId,
          company_name: data.company_name?.trim() || null,
          nit: data.nit.trim(),
          full_name: data.full_name.trim(),
          email: data.email.trim(),
          phone: data.phone?.trim() || null,
          status: data.status,
          category:
            data.category === 'none' ? null : data.category?.trim() || null,
          notes: data.notes?.trim() || null,
          preferences: data.preferences?.trim() || null,
          tags: tags,
        }
        await onSave(createData)
      }
      onOpenChange(false)
    } catch (error: any) {
      const errorMessage = error?.message || 'Error al guardar el cliente'
      console.error('Error saving customer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-screen sm:max-h-[90vh] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la información del cliente'
              : 'Ingresa los datos del nuevo cliente'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col min-h-full">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col h-full"
            >
              <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la empresa</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Empresa ABC S.A."
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
                  name="nit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        NIT <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="900123456"
                          disabled={isSubmitting || isEditing}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre completo del contacto{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="María González López"
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Correo electrónico{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="maria@empresaabc.com"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
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
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <PhoneInput
                            defaultCountry="CO"
                            countries={['CO']}
                            international
                            countryCallingCodeEditable={false}
                            countrySelectProps={{ disabled: true }}
                            placeholder="300 123 4567"
                            limitMaxLength={true}
                            value={field.value}
                            onChange={field.onChange}
                            className="phone-input"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <FormControl>
                          <CategorySelector
                            value={field.value}
                            onChange={(value) =>
                              field.onChange(value || 'none')
                            }
                            businessAccountId={businessAccountId}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <FormLabel>Etiquetas</FormLabel>
                  <TagsSelector
                    value={tags}
                    onChange={setTags}
                    placeholder="Seleccionar o crear etiquetas..."
                    existingTags={[]}
                    createNew={true}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="preferences"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferencias</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Preferencias de comunicación o atención..."
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Notas adicionales sobre el cliente..."
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="shrink-0 pt-4 border-t">
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
                  {isSubmitting
                    ? 'Guardando'
                    : isEditing
                      ? 'Actualizar'
                      : 'Crear Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { CustomerModal }
