'use client'

import { useState, useEffect } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  Plan,
  PlanInsert,
  PlanUpdate,
  PlanFeatures,
  DEFAULT_PLAN_FEATURES,
} from '@/lib/models/plan/plan'
import { Loader2 } from 'lucide-react'
import { NumericInput } from '@/components/ui/numeric-input'
import { PlanFeaturesForm } from './PlanFeaturesForm'

const formSchema = z.object({
  code: z
    .string()
    .min(1, 'El código es requerido')
    .regex(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guión bajo'),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().or(z.literal('')),
  price_cents: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  billing_period: z.enum(['monthly', 'yearly', 'lifetime']),
  status: z.enum(['active', 'inactive', 'deprecated']),
  max_businesses: z.number().min(1, 'Mínimo 1 negocio'),
  max_users_per_business: z.number().min(1, 'Mínimo 1 usuario'),
  max_specialists_per_business: z.number().min(1, 'Mínimo 1 especialista'),
  sort_order: z.number().min(0),
  features: z.object({
    // Límites de uso
    max_appointments_per_month: z.number().nullable(),
    max_products: z.number().nullable(),
    max_services: z.number().nullable(),
    max_customers: z.number().nullable(),
    max_storage_mb: z.number().nullable(),
    // Configuraciones adicionales
    has_custom_branding: z.boolean(),
    has_priority_support: z.boolean(),
    has_api_access: z.boolean(),
  }),
})

type PlanFormValues = z.infer<typeof formSchema>

interface PlanModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan?: Plan | null
  onSave: (data: PlanInsert | PlanUpdate) => Promise<void>
}

const defaultFeatures: PlanFeatures = {
  // Límites de uso (null = sin límite)
  max_appointments_per_month: null,
  max_products: null,
  max_services: null,
  max_customers: null,
  max_storage_mb: null,
  // Configuraciones adicionales
  has_custom_branding: false,
  has_priority_support: false,
  has_api_access: false,
}

export function PlanModal({ open, onOpenChange, plan, onSave }: PlanModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEdit = !!plan

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      price_cents: 0,
      billing_period: 'monthly',
      status: 'active',
      max_businesses: 1,
      max_users_per_business: 5,
      max_specialists_per_business: 3,
      sort_order: 0,
      features: defaultFeatures,
    },
  })

  useEffect(() => {
    if (plan) {
      form.reset({
        code: plan.code,
        name: plan.name,
        description: plan.description || '',
        price_cents: plan.price_cents / 100,
        billing_period: plan.billing_period,
        status: plan.status,
        max_businesses: plan.max_businesses,
        max_users_per_business: plan.max_users_per_business,
        max_specialists_per_business: plan.max_specialists_per_business,
        sort_order: plan.sort_order,
        features: {
          ...defaultFeatures,
          ...plan.features,
        },
      })
    } else {
      form.reset({
        code: '',
        name: '',
        description: '',
        price_cents: 0,
        billing_period: 'monthly',
        status: 'active',
        max_businesses: 1,
        max_users_per_business: 5,
        max_specialists_per_business: 3,
        sort_order: 0,
        features: defaultFeatures,
      })
    }
  }, [plan, form])

  const onSubmit = async (data: PlanFormValues) => {
    setIsSubmitting(true)
    try {
      const payload: PlanInsert | PlanUpdate = {
        code: data.code,
        name: data.name,
        description: data.description || null,
        price_cents: Math.round(data.price_cents * 100),
        billing_period: data.billing_period,
        status: data.status,
        max_businesses: data.max_businesses,
        max_users_per_business: data.max_users_per_business,
        max_specialists_per_business: data.max_specialists_per_business,
        sort_order: data.sort_order,
        features: data.features,
      }
      await onSave(payload)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error saving plan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Plan' : 'Crear Plan'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Actualiza la información del plan'
              : 'Configura un nuevo plan de suscripción'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="limits">Límites</TabsTrigger>
                <TabsTrigger value="features">Características</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Código único <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Identificador único (no editable)"
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
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Nombre <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Plan Pro"
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
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descripción del plan..."
                          rows={2}
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
                    name="price_cents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Precio (COP) <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <NumericInput
                            className="w-full"
                            placeholder="99000"
                            disabled={isSubmitting}
                            value={field.value}
                            onChange={(value) => field.onChange(value || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billing_period"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Periodo de facturación{' '}
                          <span className="text-destructive">*</span>
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
                            <SelectItem value="monthly">Mensual</SelectItem>
                            <SelectItem value="yearly">Anual</SelectItem>
                            <SelectItem value="lifetime">Vitalicio</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                            <SelectItem value="deprecated">Descontinuado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sort_order"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Orden</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
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
              </TabsContent>

              <TabsContent value="limits" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="max_businesses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Máximo de negocios <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={isSubmitting}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 1)
                          }
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Número máximo de negocios/sucursales por cuenta
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_users_per_business"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Máximo de usuarios por negocio{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={isSubmitting}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 1)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_specialists_per_business"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Máximo de especialistas por negocio{' '}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          disabled={isSubmitting}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value) || 1)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="features" className="mt-4">
                <PlanFeaturesForm
                  control={form.control}
                  disabled={isSubmitting}
                />
              </TabsContent>
            </Tabs>

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
