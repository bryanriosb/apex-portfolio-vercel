'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { StateComboBox } from '@/components/ui/state-combobox'
import { CityComboBox } from '@/components/ui/city-combobox'
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
import { Textarea } from '@/components/ui/textarea'
import type {
  BusinessAccount,
  BusinessAccountInsert,
  BusinessAccountUpdate,
  SubscriptionPlan,
  AccountStatus,
} from '@/lib/models/business-account/business-account'
import { Loader2, Plus, X } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'

const formSchema = z.object({
  company_name: z.string().min(1, 'El nombre de la empresa es requerido'),
  tax_id: z.string().optional().or(z.literal('')),
  legal_name: z.string().optional().or(z.literal('')),
  billing_address: z.string().optional().or(z.literal('')),
  billing_city: z.string().optional().or(z.literal('')),
  billing_state: z.string().optional().or(z.literal('')),
  billing_postal_code: z.string().optional().or(z.literal('')),
  billing_country: z.string().min(1),
  contact_name: z.string().min(1, 'El nombre del contacto es requerido'),
  contact_email: z
    .string()
    .min(1, 'El email es requerido')
    .email({ message: 'Ingresa un correo electrónico válido' }),
  contact_phone: z.string().optional().or(z.literal('')),
  subscription_plan: z.enum(['trial', 'free', 'basic', 'pro', 'enterprise']),
  status: z.enum(['active', 'trial', 'suspended', 'cancelled']),
  created_by: z.string(),
})

type BusinessAccountFormValues = z.infer<typeof formSchema>

interface SettingEntry {
  key: string
  value: string
}

interface BusinessAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: BusinessAccount | null
  onSave: (data: BusinessAccountInsert | BusinessAccountUpdate) => Promise<void>
}

export function BusinessAccountModal({
  open,
  onOpenChange,
  account,
  onSave,
}: BusinessAccountModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [settings, setSettings] = useState<SettingEntry[]>([])
  const [initialValues, setInitialValues] =
    useState<BusinessAccountFormValues | null>(null)
  const isEdit = !!account
  const { role } = useCurrentUser()

  // business_admin solo puede editar datos de contacto
  const isBusinessAdmin = role === USER_ROLES.BUSINESS_ADMIN
  const canEditFullAccount = role === USER_ROLES.COMPANY_ADMIN

  const form = useForm<BusinessAccountFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: '',
      tax_id: '',
      legal_name: '',
      billing_address: '',
      billing_city: '',
      billing_state: '',
      billing_postal_code: '',
      billing_country: 'CO',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      subscription_plan: 'trial' as SubscriptionPlan,
      status: 'active' as AccountStatus,
      created_by: '',
    },
  })

  useEffect(() => {
    if (account) {
      const values = {
        company_name: account.company_name,
        tax_id: account.tax_id || '',
        legal_name: account.legal_name || '',
        billing_address: account.billing_address || '',
        billing_city: account.billing_city || '',
        billing_state: account.billing_state || '',
        billing_postal_code: account.billing_postal_code || '',
        billing_country: account.billing_country,
        contact_name: account.contact_name,
        contact_email: account.contact_email,
        contact_phone: account.contact_phone || '',
        subscription_plan: account.subscription_plan,
        status: account.status,
        created_by: account.created_by,
      }
      form.reset(values)
      setInitialValues(values)

      // Convertir settings de objeto a array de key-value pairs
      if (account.settings) {
        const settingsArray = Object.entries(account.settings).map(
          ([key, value]) => ({
            key,
            value: String(value),
          })
        )
        setSettings(settingsArray)
      } else {
        setSettings([])
      }
    } else {
      const emptyValues = {
        company_name: '',
        tax_id: '',
        legal_name: '',
        billing_address: '',
        billing_city: '',
        billing_state: '',
        billing_postal_code: '',
        billing_country: 'CO',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        subscription_plan: 'trial' as SubscriptionPlan,
        status: 'active' as AccountStatus,
        created_by: '',
      }
      form.reset(emptyValues)
      setInitialValues(null)
      setSettings([])
    }
  }, [account, form])

  const addSetting = () => {
    setSettings([...settings, { key: '', value: '' }])
  }

  const removeSetting = (index: number) => {
    setSettings(settings.filter((_, i) => i !== index))
  }

  const updateSetting = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const newSettings = [...settings]
    newSettings[index][field] = value
    setSettings(newSettings)
  }

  // Observar cambios en el formulario
  const formValues = form.watch()

  // Detectar si hay cambios en los campos editables
  const hasChanges = useMemo(() => {
    if (!isEdit || !initialValues) return true // En modo creación, siempre permitir guardar si es válido

    // Si es business_admin, solo revisar campos de contacto
    if (isBusinessAdmin) {
      return (
        formValues.contact_name !== initialValues.contact_name ||
        formValues.contact_email !== initialValues.contact_email ||
        formValues.contact_phone !== initialValues.contact_phone
      )
    }

    // Si es company_admin, revisar todos los campos
    return (
      formValues.company_name !== initialValues.company_name ||
      formValues.tax_id !== initialValues.tax_id ||
      formValues.legal_name !== initialValues.legal_name ||
      formValues.billing_address !== initialValues.billing_address ||
      formValues.billing_city !== initialValues.billing_city ||
      formValues.billing_state !== initialValues.billing_state ||
      formValues.billing_postal_code !== initialValues.billing_postal_code ||
      formValues.billing_country !== initialValues.billing_country ||
      formValues.contact_name !== initialValues.contact_name ||
      formValues.contact_email !== initialValues.contact_email ||
      formValues.contact_phone !== initialValues.contact_phone ||
      formValues.subscription_plan !== initialValues.subscription_plan ||
      formValues.status !== initialValues.status
    )
  }, [formValues, initialValues, isBusinessAdmin, isEdit])

  // En modo creación: validar campos obligatorios
  // En modo edición: validar que haya cambios
  const canSubmit = useMemo(() => {
    if (isEdit) {
      return hasChanges
    }

    // En modo creación, validar campos obligatorios
    const requiredFields = [
      'company_name',
      'contact_name',
      'contact_email',
      'billing_country',
      'subscription_plan',
    ] as const

    return requiredFields.every((field) => {
      const value = formValues[field]
      return value && value.toString().trim() !== ''
    })
  }, [isEdit, hasChanges, formValues])

  const onSubmit = async (data: BusinessAccountFormValues) => {
    setIsSubmitting(true)
    try {
      // Convertir settings array a objeto
      const settingsObject = settings
        .filter((s) => s.key.trim() !== '')
        .reduce((acc, { key, value }) => {
          acc[key] = value
          return acc
        }, {} as Record<string, unknown>)

      await onSave({
        ...data,
        settings:
          Object.keys(settingsObject).length > 0 ? settingsObject : null,
      })
      onOpenChange(false)
      form.reset()
      setSettings([])
    } catch (error) {
      console.error('Error saving account:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar Cuenta de Negocio' : 'Crear Cuenta de Negocio'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información de la cuenta'
              : 'Ingresa los datos de la nueva cuenta de negocio'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información de la Empresa */}
            <div className="space-y-4">
              <h3 className="font-bold">Información de la Empresa</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre de la Empresa{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Salón de Belleza XYZ"
                          disabled={isSubmitting || isBusinessAdmin}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tax_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NIT</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="900123456-7"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="legal_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razón Social</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Salón de Belleza XYZ S.A.S"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información de Contacto */}
            <div className="space-y-4">
              <h3 className="font-bold">Información de Contacto</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contact_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Nombre del Contacto{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Juan Pérez"
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
                  name="contact_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Email de Contacto{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="contacto@ejemplo.com"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono de Contacto</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+57 300 123 4567"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Información de Facturación */}
            <div className="space-y-4">
              <h3 className="font-bold">Información de Facturación</h3>

              <FormField
                control={form.control}
                name="billing_address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dirección de Facturación</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Calle 123 #45-67"
                        rows={2}
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="billing_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Departamento</FormLabel>
                      <FormControl>
                        <StateComboBox
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value)
                            // Reset city when state changes
                            form.setValue('billing_city', '')
                          }}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl>
                        <CityComboBox
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billing_postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Postal</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="110111"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Plan de Suscripción */}
            <div className="space-y-4">
              <h3 className="font-bold">Plan de Suscripción</h3>

              <FormField
                control={form.control}
                name="subscription_plan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Plan <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting || isBusinessAdmin}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona un plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="trial">Trial</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estado de la Cuenta - Solo company_admin */}
            {canEditFullAccount && (
              <div className="space-y-4">
                <h3 className="font-bold">Estado de la Cuenta</h3>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isSubmitting}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Activa</SelectItem>
                          <SelectItem value="trial">Prueba</SelectItem>
                          <SelectItem value="suspended">Suspendida</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Configuración Personalizada (Settings) - Solo company_admin */}
            {canEditFullAccount && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Configuración Personalizada</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSetting}
                    disabled={isSubmitting}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                {settings.length > 0 ? (
                  <div className="space-y-2">
                    {settings.map((setting, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <Input
                          placeholder="Clave"
                          value={setting.key}
                          onChange={(e) =>
                            updateSetting(index, 'key', e.target.value)
                          }
                          disabled={isSubmitting}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Valor"
                          value={setting.value}
                          onChange={(e) =>
                            updateSetting(index, 'value', e.target.value)
                          }
                          disabled={isSubmitting}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSetting(index)}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No hay configuraciones personalizadas. Haz clic en "Agregar"
                    para añadir valores.
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !canSubmit}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? 'Actualizar' : 'Crear'} Cuenta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
