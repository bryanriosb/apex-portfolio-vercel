'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Clock, RefreshCw } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  getTrialInfoAction,
  getTrialConfigAction,
  startTrialForAccountAction,
  setCustomTrialDaysAction,
} from '@/lib/actions/system-settings'

const trialAssignmentSchema = z.object({
  useCustomDays: z.boolean(),
  customDays: z.number().min(1).max(365).optional(),
})

type TrialAssignmentFormValues = z.infer<typeof trialAssignmentSchema>

interface TrialAssignmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  accountName: string
  onSuccess?: () => void
}

export function TrialAssignmentModal({
  open,
  onOpenChange,
  accountId,
  accountName,
  onSuccess,
}: TrialAssignmentModalProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [trialInfo, setTrialInfo] = useState<{
    isOnTrial: boolean
    trialEndsAt: string | null
    daysRemaining: number | null
    customTrialDays: number | null
  } | null>(null)
  const [defaultTrialDays, setDefaultTrialDays] = useState(14)

  const form = useForm<TrialAssignmentFormValues>({
    resolver: zodResolver(trialAssignmentSchema),
    defaultValues: {
      useCustomDays: false,
      customDays: 14,
    },
  })

  useEffect(() => {
    if (open && accountId) {
      loadTrialInfo()
    }
  }, [open, accountId])

  async function loadTrialInfo() {
    setIsLoading(true)
    try {
      const [info, config] = await Promise.all([
        getTrialInfoAction(accountId),
        getTrialConfigAction(),
      ])

      setTrialInfo(info)
      setDefaultTrialDays(config.default_trial_days)

      form.reset({
        useCustomDays: info.customTrialDays !== null,
        customDays: info.customTrialDays ?? config.default_trial_days,
      })
    } catch (error) {
      console.error('Error loading trial info:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmit(values: TrialAssignmentFormValues) {
    setIsSaving(true)
    try {
      const customDays = values.useCustomDays ? values.customDays : null

      await setCustomTrialDaysAction(accountId, customDays ?? null)

      toast.success(
        values.useCustomDays
          ? `Trial personalizado de ${customDays} días configurado`
          : 'Se usará la configuración global de trial'
      )

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      toast.error('No se pudo guardar la configuración')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleStartTrial() {
    setIsSaving(true)
    try {
      const values = form.getValues()
      const customDays = values.useCustomDays ? values.customDays : undefined

      const result = await startTrialForAccountAction(accountId, customDays)

      if (result.success) {
        toast.success(
          `Período de prueba activado hasta ${new Date(result.trialEndsAt!).toLocaleDateString()}`
        )
        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudo iniciar el trial')
    } finally {
      setIsSaving(false)
    }
  }

  const useCustomDays = form.watch('useCustomDays')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Período de Prueba
          </DialogTitle>
          <DialogDescription>
            Configura el período de prueba para <strong>{accountName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {trialInfo?.isOnTrial && (
              <div className="rounded-lg border p-4 bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estado actual:</span>
                  <Badge variant="secondary">En trial</Badge>
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {trialInfo.daysRemaining !== null && (
                    <p>
                      {trialInfo.daysRemaining === 0
                        ? 'Expira hoy'
                        : `${trialInfo.daysRemaining} día(s) restante(s)`}
                    </p>
                  )}
                  {trialInfo.trialEndsAt && (
                    <p>
                      Vence: {new Date(trialInfo.trialEndsAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="useCustomDays"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Días personalizados</FormLabel>
                        <FormDescription>
                          Por defecto: {defaultTrialDays} días
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

                {useCustomDays && (
                  <FormField
                    control={form.control}
                    name="customDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Días de trial</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  {!trialInfo?.isOnTrial && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleStartTrial}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Iniciar Trial
                    </Button>
                  )}
                  <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
