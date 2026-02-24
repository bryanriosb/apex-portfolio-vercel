'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, X } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import BusinessCustomerService from '@/lib/services/customer/business-customer-service'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import type { CreateCustomerInput } from '@/lib/models/customer/business-customer'
import PhoneInput from 'react-phone-number-input'

const STATUS_OPTIONS = [
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
  notes: z.string().optional(),
  preferences: z.string().optional(),
  tags: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof formSchema>

interface CreateCustomerDialogProps {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCustomerCreated?: (customer: BusinessCustomer) => void
}

export function CreateCustomerDialog({
  businessId,
  open,
  onOpenChange,
  onCustomerCreated,
}: CreateCustomerDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])

  const customerService = new BusinessCustomerService()

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: '',
      nit: '',
      full_name: '',
      email: '',
      phone: '',
      status: 'active',
      notes: '',
      preferences: '',
      tags: '',
    },
  })

  const resetForm = () => {
    form.reset({
      company_name: '',
      nit: '',
      full_name: '',
      email: '',
      phone: '',
      status: 'active',
      notes: '',
      preferences: '',
      tags: '',
    })
    setTags([])
    setTagInput('')
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (tagInput) {
        addTag(tagInput)
      }
    }
  }

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true)
    try {
      const createData: CreateCustomerInput = {
        business_id: businessId,
        company_name: data.company_name?.trim() || null,
        nit: data.nit.trim(),
        full_name: data.full_name.trim(),
        emails: [data.email.trim()],
        phone: data.phone?.trim() || null,
        status: data.status,
        notes: data.notes?.trim() || null,
        preferences: data.preferences?.trim() || null,
        tags: tags,
      }

      const result = await customerService.createFullCustomer(createData)

      if (result.success && result.data) {
        toast.success('Cliente creado correctamente')
        onCustomerCreated?.(result.data)
        onOpenChange(false)
        resetForm()
      } else {
        toast.error(result.error || 'No se pudo crear el cliente')
      }
    } catch (error: any) {
      console.error('Error creating customer:', error)
      toast.error(error.message || 'Error al crear el cliente')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-lg max-h-screen sm:max-h-[90vh] overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Ingresa los datos del nuevo cliente para tu negocio
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
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Etiquetas</FormLabel>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Agregar etiqueta (presiona Enter)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    onBlur={() => {
                      if (tagInput) {
                        addTag(tagInput)
                      }
                    }}
                    disabled={isSubmitting}
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
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSubmitting ? 'Creando...' : 'Crear Cliente'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
