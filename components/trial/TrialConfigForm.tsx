'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Form,
  FormControl,
  FormDescription,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { toast } from 'sonner'
import { getTrialConfigAction, updateTrialConfigAction } from '@/lib/actions/system-settings'
import { fetchActivePlansAction } from '@/lib/actions/plan'
import type { TrialConfig } from '@/lib/models/system-settings'
import type { Plan } from '@/lib/models/plan/plan'

const trialConfigSchema = z.object({
  default_trial_days: z.number().min(1).max(365),
  post_trial_plan_code: z.string().min(1),
  trial_plan_code: z.string().min(1),
  allow_trial_extension: z.boolean(),
  max_trial_extensions: z.number().min(0).max(10),
  extension_days: z.number().min(1).max(30),
})

type TrialConfigFormValues = z.infer<typeof trialConfigSchema>

export function TrialConfigForm() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])

  const form = useForm<TrialConfigFormValues>({
    resolver: zodResolver(trialConfigSchema),
    defaultValues: {
      default_trial_days: 14,
      post_trial_plan_code: 'free',
      trial_plan_code: 'trial',
      allow_trial_extension: true,
      max_trial_extensions: 1,
      extension_days: 7,
    },
  })

  useEffect(() => {
    async function loadData() {
      try {
        const [config, activePlans] = await Promise.all([
          getTrialConfigAction(),
          fetchActivePlansAction(),
        ])

        setPlans(activePlans)
        form.reset(config)
      } catch (error) {
        console.error('Error loading trial config:', error)
        toast.error('No se pudo cargar la configuración')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [form])

  async function onSubmit(values: TrialConfigFormValues) {
    setIsSaving(true)
    try {
      const result = await updateTrialConfigAction(values)

      if (result.success) {
        toast.success('Los cambios se han aplicado correctamente')
      } else {
        toast.error(result.error || 'No se pudo guardar la configuración')
      }
    } catch (error) {
      toast.error('Ocurrió un error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración del período de prueba</CardTitle>
        <CardDescription>
          Define los parámetros globales para el período de prueba de nuevas cuentas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="default_trial_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Días de prueba por defecto</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Duración del período de prueba para nuevas cuentas
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trial_plan_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan durante el trial</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.code}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Plan que tendrán las cuentas durante el período de prueba
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="post_trial_plan_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan después del trial</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.code}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Plan al que cambiarán si no pagan después del trial
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-medium mb-4">Extensiones de trial</h3>
              <div className="grid gap-6 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="allow_trial_extension"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Permitir extensiones</FormLabel>
                        <FormDescription>
                          Habilitar extensión del período de prueba
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_trial_extensions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extensiones máximas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={10}
                          disabled={!form.watch('allow_trial_extension')}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="extension_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Días por extensión</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={30}
                          disabled={!form.watch('allow_trial_extension')}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Guardar cambios
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
