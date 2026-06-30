'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import Loading from '@/components/ui/loading'
import {
  integrationConfigFormSchema,
  type IntegrationConfigFormValues,
  type IntegrationConfig,
} from '@/lib/models/integrations/integration-config'
import {
  getConnectorSchemaDefinition,
} from '@/lib/models/integrations/connector-schemas'

interface IntegrationConfigFormProps {
  config?: IntegrationConfig | null
  connectors: string[]
  isLoadingConnectors: boolean
  onSubmit: (values: IntegrationConfigFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function IntegrationConfigForm({
  config,
  connectors,
  isLoadingConnectors,
  onSubmit,
  onCancel,
  isSubmitting,
}: IntegrationConfigFormProps) {
  let parsedConfigData = {}
  if (config?.config_json) {
    try {
      parsedConfigData = typeof config.config_json === 'string'
        ? JSON.parse(config.config_json)
        : config.config_json
    } catch {
      // ignore
    }
  }

  const form = useForm<IntegrationConfigFormValues>({
    resolver: zodResolver(integrationConfigFormSchema),
    defaultValues: {
      name: config?.name || '',
      description: config?.description || '',
      connector_id: config?.connector_id || '',
      scope: config?.scope || 'Business',
      is_active: config ? config.is_active : true,
      config_json: config
        ? typeof config.config_json === 'string'
          ? config.config_json
          : JSON.stringify(config.config_json, null, 2)
        : '{}',
      config_data: parsedConfigData,
    },
  })

  const [showRawJson, setShowRawJson] = useState(true)
  const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({})
  const connectorId = form.watch('connector_id')
  const definition = getConnectorSchemaDefinition(connectorId)

  const togglePasswordVisibility = (fieldName: string) => {
    setPasswordVisibility((prev) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }))
  }

  useEffect(() => {
    const def = getConnectorSchemaDefinition(connectorId)
    if (def) {
      setShowRawJson(false)
      const currentData = form.getValues('config_data')
      if (!currentData || Object.keys(currentData).length === 0) {
        const configJson = form.getValues('config_json')
        try {
          const parsed = JSON.parse(configJson || '{}')
          if (Object.keys(parsed).length > 0) {
            form.setValue('config_data', parsed)
          } else {
            form.setValue('config_data', def.defaultValues)
          }
        } catch {
          form.setValue('config_data', def.defaultValues)
        }
      }
    } else {
      setShowRawJson(true)
    }
  }, [connectorId, form])

  const toggleView = () => {
    const currentShow = !showRawJson
    if (currentShow) {
      const configData = form.getValues('config_data') || {}
      form.setValue('config_json', JSON.stringify(configData, null, 2))
    } else {
      const configJson = form.getValues('config_json') || '{}'
      try {
        const parsed = JSON.parse(configJson)
        form.setValue('config_data', parsed)
      } catch {
        form.setError('config_json', {
          message: 'El JSON actual no es válido. Corríjalo antes de volver al formulario.',
        })
        return
      }
    }
    setShowRawJson(currentShow)
  }

  const formatJson = () => {
    const current = form.getValues('config_json')
    try {
      const parsed = JSON.parse(current)
      form.setValue('config_json', JSON.stringify(parsed, null, 2))
    } catch {
      form.setError('config_json', { message: 'No se puede formatear JSON inválido' })
    }
  }

  const onSubmitHandler = (values: IntegrationConfigFormValues) => {
    if (!showRawJson && definition) {
      const result = definition.schema.safeParse(values.config_data)
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          const path = `config_data.${issue.path.join('.')}` as any
          form.setError(path, {
            type: 'validation',
            message: issue.message,
          })
        })
        return
      }
      values.config_json = JSON.stringify(values.config_data)
    }
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitHandler)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Odoo Producción" className="rounded-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Conexión principal con Odoo 17..."
                  className="min-h-[80px] resize-none rounded-none"
                  {...field}
                  value={field.value || ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="connector_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Integración</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                  disabled={isLoadingConnectors}
                >
                  <FormControl>
                    <SelectTrigger className="w-full rounded-none">
                      <SelectValue placeholder="Selecciona un conector" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-none">
                    {isLoadingConnectors && (
                      <div className="flex items-center justify-center p-2">
                        <Loading className="h-4 w-4" />
                      </div>
                    )}
                    {connectors.map((connector) => (
                      <SelectItem key={connector} value={connector} className="rounded-none">
                        {connector}
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
            name="scope"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alcance</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full rounded-none">
                      <SelectValue placeholder="Selecciona un alcance" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-none">
                    <SelectItem value="Account" className="rounded-none">Cuenta General</SelectItem>
                    <SelectItem value="Business" className="rounded-none">Negocio Actual</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Sección de Configuración del Conector */}
        <div className="space-y-4 border p-4 rounded-none border-muted">
          <div className="flex items-center justify-between border-b border-muted pb-2">
            <h3 className="font-medium">Configuración de Conexión</h3>
            {definition && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-none text-xs"
                onClick={toggleView}
                disabled={isSubmitting}
              >
                {showRawJson ? 'Ver Formulario' : 'Editar como JSON'}
              </Button>
            )}
          </div>

          {showRawJson ? (
            <FormField
              control={form.control}
              name="config_json"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder='{"url":"https://odoo.empresa.com","database":"produccion","username":"api_user","password":"secret"}'
                      className="min-h-[180px] font-mono text-sm resize-none rounded-none"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormDescription>
                      Credenciales y parámetros del conector en formato JSON.
                    </FormDescription>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-none"
                      onClick={formatJson}
                      disabled={isSubmitting}
                    >
                      Formatear JSON
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="space-y-4">
              {definition &&
                definition.fields.map((fieldDef) => (
                  <FormField
                    key={fieldDef.name}
                    control={form.control}
                    name={`config_data.${fieldDef.name}`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{fieldDef.label}</FormLabel>
                        <FormControl>
                          {fieldDef.type === 'textarea' ? (
                            <Textarea
                              placeholder={fieldDef.placeholder}
                              className="min-h-[80px] resize-none rounded-none"
                              {...field}
                              value={field.value || ''}
                            />
                          ) : fieldDef.type === 'password' ? (
                            <div className="relative">
                              <Input
                                type={passwordVisibility[fieldDef.name] ? 'text' : 'password'}
                                placeholder={fieldDef.placeholder}
                                className="rounded-none pr-10"
                                {...field}
                                value={field.value || ''}
                              />
                              <div className="absolute right-0 top-0 h-full flex items-center pr-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 rounded-none"
                                  onClick={() => togglePasswordVisibility(fieldDef.name)}
                                  disabled={isSubmitting}
                                >
                                  {passwordVisibility[fieldDef.name] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Input
                              type={fieldDef.type}
                              placeholder={fieldDef.placeholder}
                              className="rounded-none"
                              {...field}
                              value={field.value || ''}
                            />
                          )}
                        </FormControl>
                        {fieldDef.description && (
                          <FormDescription>{fieldDef.description}</FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between border p-4 rounded-none border-muted">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Activo</FormLabel>
                <FormDescription>
                  Habilita o deshabilita esta integración.
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

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" className="rounded-none" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm" className="rounded-none">
            {isSubmitting ? (
              <>
                <Loading className="mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : config ? (
              'Actualizar'
            ) : (
              'Crear'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
