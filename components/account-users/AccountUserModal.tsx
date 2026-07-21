'use client'

import { useState, useEffect, useRef } from 'react'
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
import type {
  AccountUser,
  AccountUserInsert,
  AccountUserUpdate,
} from '@/lib/models/account-user/account-user'
import { USER_ROLES, type UserRole } from '@/const/roles'
import { USER_ROLE_LABELS } from '@/lib/models/account-user/const/data-table/account-users-columns'
import { useCurrentUser } from '@/hooks/use-current-user'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'
import BusinessService from '@/lib/services/business/business-service'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'
import type { Business } from '@/lib/models/business/business'
import Loading from '../ui/loading'

/** Valor especial del selector de acceso: todas las sucursales de la cuenta */
const ALL_BUSINESSES = '__all__'

const formSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email({ message: 'Ingresa un correo electrónico válido' }),
  password: z.string().optional().or(z.literal('')),
  role: z.enum([
    USER_ROLES.COMPANY_ADMIN,
    USER_ROLES.BUSINESS_ADMIN,
    USER_ROLES.PROFESSIONAL,
    USER_ROLES.EMPLOYEE,
  ]),
  business_account_id: z.string().min(1, 'La cuenta de negocio es requerida'),
  branch_scope: z.string().min(1, 'El acceso a sucursales es requerido'),
})

type AccountUserFormValues = z.infer<typeof formSchema>

interface AccountUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: AccountUser | null
  onSave: (data: AccountUserInsert | AccountUserUpdate) => Promise<void>
}

export function AccountUserModal({
  open,
  onOpenChange,
  user,
  onSave,
}: AccountUserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [businessAccounts, setBusinessAccounts] = useState<BusinessAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)

  const businessAccountService = useRef(new BusinessAccountService())
  const businessService = useRef(new BusinessService())

  const isEdit = !!user
  const { role, businessAccountId } = useCurrentUser()
  const isCompanyAdmin = role === USER_ROLES.COMPANY_ADMIN
  const isBusinessAdmin = role === USER_ROLES.BUSINESS_ADMIN

  // Un business_admin no puede acuñar company_admins
  const assignableRoles: UserRole[] = isCompanyAdmin
    ? [
        USER_ROLES.COMPANY_ADMIN,
        USER_ROLES.BUSINESS_ADMIN,
        USER_ROLES.PROFESSIONAL,
        USER_ROLES.EMPLOYEE,
      ]
    : [USER_ROLES.BUSINESS_ADMIN, USER_ROLES.PROFESSIONAL, USER_ROLES.EMPLOYEE]

  const form = useForm<AccountUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: USER_ROLES.BUSINESS_ADMIN,
      business_account_id: '',
      branch_scope: ALL_BUSINESSES,
    },
  })

  const selectedAccountId = form.watch('business_account_id')

  useEffect(() => {
    if (!open) return

    const loadData = async () => {
      if (isCompanyAdmin) {
        setLoadingAccounts(true)
        const result = await businessAccountService.current.fetchItems({
          page_size: 100,
        })
        setBusinessAccounts(result.data)
        setLoadingAccounts(false)
      }

      if (user) {
        form.reset({
          name: user.name || '',
          email: user.email,
          password: '',
          // El listado excluye customers; solo llegan roles gestionables
          role: user.role as AccountUserFormValues['role'],
          business_account_id: user.business_account_id || '',
          branch_scope: user.all_businesses
            ? ALL_BUSINESSES
            : user.businesses[0]?.id || ALL_BUSINESSES,
        })
      } else {
        form.reset({
          name: '',
          email: '',
          password: '',
          role: USER_ROLES.BUSINESS_ADMIN,
          business_account_id:
            isBusinessAdmin && businessAccountId ? businessAccountId : '',
          branch_scope: ALL_BUSINESSES,
        })
      }
    }

    loadData()
  }, [open, user, form, isCompanyAdmin, isBusinessAdmin, businessAccountId])

  // Cargar sucursales de la cuenta seleccionada
  useEffect(() => {
    if (!open || !selectedAccountId) {
      setBusinesses([])
      return
    }

    const loadBusinesses = async () => {
      setLoadingBusinesses(true)
      try {
        const result = await businessService.current.fetchItems({
          business_account_id: selectedAccountId,
          page_size: 100,
        })
        setBusinesses(result.data)
      } finally {
        setLoadingBusinesses(false)
      }
    }

    loadBusinesses()
  }, [open, selectedAccountId])

  const onSubmit = async (data: AccountUserFormValues) => {
    // Password requerido solo en creación
    if (!isEdit && (!data.password || data.password.length < 8)) {
      form.setError('password', {
        message: 'La contraseña es requerida (mínimo 8 caracteres)',
      })
      return
    }
    if (isEdit && data.password && data.password.length < 8) {
      form.setError('password', {
        message: 'La contraseña debe tener mínimo 8 caracteres',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const allBusinesses = data.branch_scope === ALL_BUSINESSES
      const businessId = allBusinesses ? null : data.branch_scope

      if (isEdit) {
        const payload: AccountUserUpdate = {
          name: data.name,
          role: data.role,
          business_id: businessId,
          all_businesses: allBusinesses,
        }
        if (data.password) payload.password = data.password
        await onSave(payload)
      } else {
        const payload: AccountUserInsert = {
          name: data.name,
          email: data.email,
          password: data.password!,
          role: data.role,
          business_account_id: data.business_account_id,
          business_id: businessId,
          all_businesses: allBusinesses,
        }
        await onSave(payload)
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error saving user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuario' : 'Crear Usuario'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información y el acceso del usuario'
              : 'Ingresa los datos del nuevo usuario'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información del Usuario */}
            <div className="space-y-4">
              <h3 className="font-bold">Información del Usuario</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Nombre <span className="text-destructive">*</span>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="usuario@ejemplo.com"
                          disabled={isSubmitting || isEdit}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>
                        Contraseña{' '}
                        {!isEdit && <span className="text-destructive">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={
                            isEdit ? 'Dejar vacía para no cambiar' : '••••••••'
                          }
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
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Rol <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecciona un rol" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignableRoles.map((r) => (
                          <SelectItem key={r} value={r}>
                            {USER_ROLE_LABELS[r] || r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cuenta y Acceso */}
            <div className="space-y-4">
              <h3 className="font-bold">Cuenta y Acceso</h3>

              {isCompanyAdmin && (
                <FormField
                  control={form.control}
                  name="business_account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Cuenta de Negocio{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          // Al cambiar de cuenta, resetear el alcance
                          form.setValue('branch_scope', ALL_BUSINESSES)
                        }}
                        value={field.value}
                        disabled={isSubmitting || loadingAccounts || isEdit}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={
                                loadingAccounts ? (
                                  <Loading />
                                ) : (
                                  'Selecciona una cuenta'
                                )
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businessAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isBusinessAdmin && (
                <FormField
                  control={form.control}
                  name="business_account_id"
                  render={({ field }) => <input type="hidden" {...field} />}
                />
              )}

              <FormField
                control={form.control}
                name="branch_scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Acceso a Sucursales{' '}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={
                        isSubmitting || loadingBusinesses || !selectedAccountId
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              loadingBusinesses ? (
                                <Loading />
                              ) : (
                                'Selecciona el acceso'
                              )
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ALL_BUSINESSES}>
                          Todas las sucursales
                        </SelectItem>
                        {businesses.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            Solo {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Limita el usuario a una sucursal específica o dale acceso
                      a todas las sucursales de la cuenta.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {isSubmitting && <Loading className="mr-2 h-4 w-4 text-white" />}
                {isEdit ? 'Actualizar' : 'Crear'} Usuario
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
