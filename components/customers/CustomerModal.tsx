'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  Plus,
  X,
  ChevronDown,
  Mail,
  Eye,
  EyeOff,
  RefreshCw,
  KeyRound,
  DoorClosedLocked,
} from 'lucide-react'
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import BuildTooltip from '../ui/tooltip/build'

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'vip', label: 'VIP' },
  { value: 'blocked', label: 'Bloqueado' },
]

const formSchema = z.object({
  company_name: z.string().optional(),
  nit: z.string().min(1, 'El NIT es requerido'),
  full_name: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'vip', 'blocked']).optional(),
  category: z.string().optional(),
  notes: z.string().optional(),
  preferences: z.string().optional(),
  create_user_account: z.boolean().optional(),
  password: z.string().optional(),
  send_welcome_email: z.boolean().optional(),
  change_password: z.boolean().optional(),
  new_password: z.string().optional(),
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
  onRemoveAccess?: (customer: BusinessCustomer) => void
}

function generateRandomPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'

  const allChars = lowercase + uppercase + numbers + symbols

  let password = ''
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]

  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

function CustomerModal({
  businessId,
  businessAccountId,
  open,
  onOpenChange,
  customer,
  onSave,
  onRemoveAccess,
}: CustomerModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [emails, setEmails] = useState<string[]>([''])
  const [emailErrors, setEmailErrors] = useState<(string | null)[]>([null])
  const [emailsOpen, setEmailsOpen] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  const isEditing = !!customer

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: '',
      nit: '',
      full_name: '',
      phone: '',
      status: 'active',
      category: 'none',
      notes: '',
      preferences: '',
      create_user_account: false,
      password: '',
      send_welcome_email: false,
      change_password: false,
      new_password: '',
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
        const customerEmails =
          customer.emails?.length > 0 ? customer.emails : ['']
        setEmails(customerEmails)
        setEmailErrors(customerEmails.map(() => null))
        form.reset({
          company_name: customer.company_name || '',
          nit: customer.nit,
          full_name: customer.full_name,
          phone: normalizedPhone,
          status: customer.status,
          category: customer.category || 'none',
          notes: customer.notes || '',
          preferences: customer.preferences || '',
          create_user_account: false,
          password: '',
          send_welcome_email: false,
          change_password: false,
          new_password: '',
        })
      } else {
        setTags([])
        setEmails([''])
        setEmailErrors([null])
        form.reset({
          company_name: '',
          nit: '',
          full_name: '',
          phone: '',
          status: 'active',
          category: 'none',
          notes: '',
          preferences: '',
          create_user_account: false,
          password: '',
          send_welcome_email: false,
          change_password: false,
          new_password: '',
        })
      }
    }
  }, [open, customer, form])

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return 'El email es requerido'
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return 'Email inválido'
    }
    return null
  }

  const validateAllEmails = (): boolean => {
    const errors = emails.map((email) => validateEmail(email))
    setEmailErrors(errors)
    return (
      errors.every((error) => error === null) &&
      emails.length > 0 &&
      emails.some((email) => email.trim() !== '')
    )
  }

  const addEmailField = () => {
    setEmails([...emails, ''])
    setEmailErrors([...emailErrors, null])
    setEmailsOpen(true) // Expandir automáticamente al agregar
  }

  const removeEmailField = (index: number) => {
    if (emails.length > 1) {
      const newEmails = emails.filter((_, i) => i !== index)
      const newErrors = emailErrors.filter((_, i) => i !== index)
      setEmails(newEmails)
      setEmailErrors(newErrors)
    }
  }

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...emails]
    newEmails[index] = value
    setEmails(newEmails)

    // Validar en tiempo real
    const newErrors = [...emailErrors]
    newErrors[index] = value.trim() ? validateEmail(value) : null
    setEmailErrors(newErrors)
  }

  const onSubmit = async (data: CustomerFormValues) => {
    // Validar emails antes de enviar
    if (!validateAllEmails()) {
      return
    }

    const validEmails = emails.filter((email) => email.trim() !== '')

    if (validEmails.length === 0) {
      setEmailErrors(emails.map(() => 'Debe agregar al menos un email'))
      return
    }

    // Validar contraseña si se solicita crear cuenta
    if (data.create_user_account && !data.password) {
      form.setError('password', {
        message: 'La contraseña es requerida para crear la cuenta',
      })
      return
    }

    if (data.password && data.password.length < 8) {
      form.setError('password', {
        message: 'La contraseña debe tener al menos 8 caracteres',
      })
      return
    }

    // Validar nueva contraseña si se solicita cambiar
    if (data.change_password && !data.new_password) {
      form.setError('new_password', {
        message: 'La nueva contraseña es requerida',
      })
      return
    }

    if (data.new_password && data.new_password.length < 8) {
      form.setError('new_password', {
        message: 'La contraseña debe tener al menos 8 caracteres',
      })
      return
    }

    // Normalizar phone: quitar el símbolo + del inicio
    const normalizePhone = (
      phone: string | null | undefined
    ): string | null => {
      if (!phone) return null
      const trimmed = phone.trim()
      if (!trimmed) return null
      return trimmed.startsWith('+') ? trimmed.substring(1) : trimmed
    }

    setIsSubmitting(true)
    try {
      if (isEditing && customer) {
        const updateData: BusinessCustomerUpdate & { 
          new_password?: string
          create_user_account?: boolean
          password?: string
          send_welcome_email?: boolean
        } = {
          company_name: data.company_name?.trim() || null,
          nit: data.nit.trim(),
          full_name: data.full_name?.trim() || null,
          emails: validEmails.map((email) => email.trim()),
          phone: normalizePhone(data.phone),
          status: data.status,
          category:
            data.category === 'none' ? null : data.category?.trim() || null,
          notes: data.notes?.trim() || null,
          preferences: data.preferences?.trim() || null,
          tags: tags,
        }

        // Incluir nueva contraseña si se solicita cambiar
        if (data.change_password && data.new_password) {
          updateData.new_password = data.new_password
        }

        // Incluir creación de cuenta si se solicita (customer sin user_id)
        if (!customer.user_id && data.create_user_account) {
          updateData.create_user_account = true
          updateData.password = data.password
          updateData.send_welcome_email = data.send_welcome_email
        }

        await onSave(updateData, customer.id)
      } else {
        const createData: CreateCustomerInput = {
          business_id: businessId,
          company_name: data.company_name?.trim() || null,
          nit: data.nit.trim(),
          full_name: data.full_name?.trim() || null,
          emails: validEmails.map((email) => email.trim()),
          phone: normalizePhone(data.phone),
          status: data.status,
          category:
            data.category === 'none' ? null : data.category?.trim() || null,
          notes: data.notes?.trim() || null,
          preferences: data.preferences?.trim() || null,
          tags: tags,
          create_user_account: data.create_user_account,
          password: data.password,
          send_welcome_email: data.send_welcome_email,
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
        className="max-w-lg max-h-[95vh] p-0 overflow-hidden flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 shrink-0">
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la información del cliente'
              : 'Ingresa los datos del nuevo cliente'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto space-y-6 px-6 py-4">
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
                    <FormLabel>Nombre completo del contacto</FormLabel>
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

              <Collapsible open={emailsOpen} onOpenChange={setEmailsOpen}>
                <div className="border rounded-md">
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <FormLabel className="text-sm font-medium leading-none cursor-pointer">
                        Correos <span className="text-destructive">*</span>
                      </FormLabel>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {emails.length}{' '}
                        {emails.length === 1 ? 'correo' : 'correos'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1 text-xs">
                        <ChevronDown
                          className={`h-5 w-5  transition-transform ${
                            emailsOpen ? 'rotate-180' : ''
                          }`}
                        />
                        <span className="font-medium">
                          {emailsOpen ? 'Cerrar' : 'Ver'}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          addEmailField()
                        }}
                        disabled={isSubmitting}
                        className="h-7 px-2 text-xs hover:bg-background"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar otro
                      </Button>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4  space-y-2 border-t">
                      {emails.map((email, index) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="flex-1">
                            <Input
                              type="email"
                              placeholder="Escribir correo aquí..."
                              disabled={isSubmitting}
                              value={email}
                              onChange={(e) =>
                                updateEmail(index, e.target.value)
                              }
                              className={
                                emailErrors[index] ? 'border-destructive' : ''
                              }
                            />
                            {emailErrors[index] && (
                              <p className="text-sm text-destructive mt-1">
                                {emailErrors[index]}
                              </p>
                            )}
                          </div>
                          {emails.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEmailField(index)}
                              disabled={isSubmitting}
                              className="h-10 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>

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
                          onChange={(value) => field.onChange(value || 'none')}
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

              {!isEditing && (
                <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                  <FormField
                    control={form.control}
                    name="create_user_account"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            Crear cuenta de usuario para este cliente
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            El cliente podrá iniciar sesión con el primer correo
                            electrónico registrado
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('create_user_account') && (
                    <>
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Dejar vacío para generar automáticamente"
                                  disabled={isSubmitting}
                                  className="pr-20"
                                  {...field}
                                />
                                <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() =>
                                      form.setValue(
                                        'password',
                                        generateRandomPassword()
                                      )
                                    }
                                    disabled={isSubmitting}
                                    title="Generar contraseña aleatoria"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() =>
                                      setShowPassword(!showPassword)
                                    }
                                    disabled={isSubmitting}
                                  >
                                    {showPassword ? 'Ocultar' : 'Ver'}
                                  </Button>
                                </div>
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Si no especificas una contraseña, se generará
                              automáticamente
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="send_welcome_email"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                disabled={isSubmitting}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer">
                                Enviar correo de bienvenida con credenciales
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Se enviará un email al cliente con sus
                                credenciales de acceso
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              )}

              {/* Sección de cambio de contraseña para clientes con cuenta existente */}
              {isEditing && customer?.user_id && (
                <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>Este cliente tiene cuenta de usuario</span>
                    </div>
                    {onRemoveAccess && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-amber-600 border-amber-600 hover:bg-amber-50 hover:text-amber-700"
                        onClick={() => onRemoveAccess(customer)}
                        disabled={isSubmitting}
                      >
                        <KeyRound className="h-3.5 w-3.5 mr-1.5" />
                        Remover Acceso
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name="change_password"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            Cambiar contraseña
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Establecer una nueva contraseña para este usuario
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('change_password') && (
                    <FormField
                      control={form.control}
                      name="new_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nueva contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mínimo 8 caracteres"
                                disabled={isSubmitting}
                                className="pr-20"
                                {...field}
                              />
                              <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={() =>
                                    form.setValue(
                                      'new_password',
                                      generateRandomPassword()
                                    )
                                  }
                                  disabled={isSubmitting}
                                  title="Generar contraseña aleatoria"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                                <BuildTooltip
                                  content="Ver/Ocultar"
                                  trigger={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 px-2 text-xs"
                                      onClick={() =>
                                        setShowPassword(!showPassword)
                                      }
                                      disabled={isSubmitting}
                                    >
                                      {showPassword ? <EyeOff /> : <Eye />}
                                    </Button>
                                  }
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {/* Sección para crear cuenta en edición cuando NO tiene user_id */}
              {isEditing && !customer?.user_id && customer?.emails && customer.emails.length > 0 && (
                <div className="space-y-4 border rounded-md p-4 bg-muted/30">
                  <FormField
                    control={form.control}
                    name="create_user_account"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            disabled={isSubmitting}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            Crear cuenta de usuario para este cliente
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            El cliente podrá iniciar sesión con el correo electrónico registrado
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('create_user_account') && (
                    <>
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contraseña</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Dejar vacío para generar automáticamente"
                                  disabled={isSubmitting}
                                  className="pr-20"
                                  {...field}
                                />
                                <div className="absolute right-0 top-0 h-full flex items-center gap-1 pr-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => form.setValue('password', generateRandomPassword())}
                                    disabled={isSubmitting}
                                    title="Generar contraseña aleatoria"
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                  <BuildTooltip
                                    content="Ver/Ocultar"
                                    trigger={
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isSubmitting}
                                      >
                                        {showPassword ? <EyeOff /> : <Eye />}
                                      </Button>
                                    }
                                  />
                                </div>
                              </div>
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Si no especificas una contraseña, se generará automáticamente
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="send_welcome_email"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                disabled={isSubmitting}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="cursor-pointer">
                                Enviar correo de bienvenida con credenciales
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Se enviará un email al cliente con sus credenciales de acceso
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="shrink-0 px-6 py-4 border-t">
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
      </DialogContent>
    </Dialog>
  )
}

export { CustomerModal }
