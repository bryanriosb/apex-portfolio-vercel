'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import Loading from '@/components/ui/loading'
import { CronBuilder } from './CronExpressionBuilder'
import {
  syncJobFormSchema,
  type SyncJobFormValues,
} from '@/lib/models/collection/sync-jobs'
import type { IntegrationConfig } from '@/lib/models/integrations/integration-config'

interface SyncJobFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SyncJobFormValues) => void
  isSubmitting?: boolean
  defaultValues?: Partial<SyncJobFormValues>
  mode?: 'create' | 'edit'
  timezone?: string
  connectors?: IntegrationConfig[]
  isLoadingConnectors?: boolean
}

export function SyncJobFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  defaultValues,
  mode = 'create',
  timezone = 'America/Bogota',
  connectors = [],
  isLoadingConnectors = false
}: SyncJobFormDialogProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const form = useForm<SyncJobFormValues>({
    resolver: zodResolver(syncJobFormSchema as any),
    defaultValues: {
      name: defaultValues?.name || '',
      category: defaultValues?.category || 'manual',
      operation: defaultValues?.operation || 'full_sync',
      executionType: defaultValues?.executionType || 'immediate',
      datetime: defaultValues?.datetime || '',
      cron: defaultValues?.cron || '',
      batch_size: defaultValues?.batch_size || 100,
      connector_id: defaultValues?.connector_id || '',
    },
  })

  const executionType = form.watch('executionType')

  // Cuando cambie el tipo de ejecución, actualiza la categoría por defecto para que coincida si el usuario no la ha cambiado
  const handleExecutionTypeChange = (val: 'immediate' | 'scheduled' | 'cron') => {
    form.setValue('executionType', val)
    if (val === 'immediate') form.setValue('category', 'manual')
    if (val === 'scheduled') form.setValue('category', 'scheduled')
    if (val === 'cron') form.setValue('category', 'cron')
  }

  const handleSubmit = (values: SyncJobFormValues) => {
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rounded-none" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Nueva Sincronización' : 'Editar Sincronización'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Sincronización Manual..." className="rounded-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="connector_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Integración</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isLoadingConnectors || connectors.length === 0}>
                    <FormControl>
                      <SelectTrigger className="w-full rounded-none">
                        <SelectValue placeholder={isLoadingConnectors ? "Cargando conectores..." : "Selecciona un conector"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none">
                      {connectors.map(connector => (
                        <SelectItem key={connector.id} value={connector.business_account_id} className="rounded-none">
                          {connector.name} ({connector.connector_id})
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
              name="executionType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Ejecución</FormLabel>
                  <Select onValueChange={handleExecutionTypeChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full rounded-none">
                        <SelectValue placeholder="Tipo de ejecución" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-none">
                      <SelectItem value="immediate" className="rounded-none">Inmediata</SelectItem>
                      <SelectItem value="scheduled" className="rounded-none">Programada</SelectItem>
                      <SelectItem value="cron" className="rounded-none">Recurrente</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.value === 'immediate' && (
                    <FormDescription>
                      La sincronización se iniciará tan pronto como guardes este formulario.
                    </FormDescription>
                  )}
                  {field.value === 'scheduled' && (
                    <FormDescription>
                      La sincronización se ejecutará una única vez en la fecha y hora seleccionada.
                    </FormDescription>
                  )}
                  {field.value === 'cron' && (
                    <FormDescription>
                      La sincronización se repetirá continuamente según la frecuencia que configures.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {executionType === 'scheduled' && (
              <FormField
                control={form.control}
                name="datetime"
                render={({ field }) => {
                  const dateValue = field.value ? new Date(field.value) : undefined
                  const timeValue = field.value ? format(new Date(field.value), 'HH:mm') : ''

                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Fecha y Hora</FormLabel>
                      <div className="flex gap-2">
                        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen} modal={true}>
                          <FormControl>
                            <PopoverTrigger asChild>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-[240px] pl-3 text-left font-normal rounded-none",
                                  !dateValue && "text-muted-foreground"
                                )}
                              >
                                {dateValue ? (
                                  format(dateValue, "PPP", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                          </FormControl>
                          <PopoverContent className="w-auto p-0 rounded-none" align="start">
                            <Calendar
                              mode="single"
                              selected={dateValue}
                              defaultMonth={dateValue}
                              locale={es}
                              onSelect={(date) => {
                                if (date) {
                                  const t = timeValue || '00:00'
                                  field.onChange(`${format(date, 'yyyy-MM-dd')}T${t}:00`)
                                  setIsCalendarOpen(false)
                                }
                              }}
                              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <Input
                          type="time"
                          className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                          value={timeValue}
                          onChange={(e) => {
                            const t = e.target.value
                            if (dateValue && t) {
                              field.onChange(`${format(dateValue, 'yyyy-MM-dd')}T${t}:00`)
                            } else if (t) {
                              const today = new Date()
                              field.onChange(`${format(today, 'yyyy-MM-dd')}T${t}:00`)
                            }
                          }}
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
            )}

            {executionType === 'cron' && (
              <FormField
                control={form.control}
                name="cron"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frecuencia</FormLabel>
                    <FormControl>
                      <CronBuilder value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" size="sm" className="rounded-none" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} size="sm" className="rounded-none">
                {isSubmitting ? (
                  <>
                    <Loading className="mr-2 h-4 w-4" />
                    Guardando...
                  </>
                ) : mode === 'create' ? (
                  'Crear Sincronización'
                ) : (
                  'Guardar Cambios'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
