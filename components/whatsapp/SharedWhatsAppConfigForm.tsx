'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Globe,
  Save,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  fetchSharedWhatsAppConfigAction,
  saveSharedWhatsAppConfigAction,
  updateWhatsAppConfigAction,
} from '@/lib/actions/whatsapp'
import type { WhatsAppConfig } from '@/lib/models/whatsapp/whatsapp-config'

const configSchema = z.object({
  phone_number_id: z
    .string()
    .min(1, 'El ID del numero de telefono es requerido'),
  whatsapp_business_account_id: z
    .string()
    .min(1, 'El ID de cuenta de negocio es requerido'),
  access_token: z.string().min(1, 'El token de acceso es requerido'),
  webhook_verify_token: z
    .string()
    .min(1, 'El token de verificacion del webhook es requerido'),
  display_phone_number: z.string().optional(),
  is_enabled: z.boolean(),
})

type ConfigFormValues = z.infer<typeof configSchema>

interface SharedWhatsAppConfigFormProps {
  onConfigChange?: (config: WhatsAppConfig | null) => void
}

export function SharedWhatsAppConfigForm({ onConfigChange }: SharedWhatsAppConfigFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState<WhatsAppConfig | null>(null)
  const [showToken, setShowToken] = useState(false)

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      phone_number_id: '',
      whatsapp_business_account_id: '',
      access_token: '',
      webhook_verify_token: '',
      display_phone_number: '',
      is_enabled: true,
    },
  })

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await fetchSharedWhatsAppConfigAction()
        if (data) {
          setConfig(data)
          form.reset({
            phone_number_id: data.phone_number_id,
            whatsapp_business_account_id: data.whatsapp_business_account_id,
            access_token: data.access_token,
            webhook_verify_token: data.webhook_verify_token,
            display_phone_number: data.display_phone_number || '',
            is_enabled: data.is_enabled,
          })
          onConfigChange?.(data)
        }
      } catch (error) {
        console.error('Error loading shared WhatsApp config:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [])

  const onSubmit = async (values: ConfigFormValues) => {
    setIsSaving(true)
    try {
      if (config) {
        const result = await updateWhatsAppConfigAction(config.id, values)
        if (result.success) {
          setConfig(result.data!)
          onConfigChange?.(result.data!)
          toast.success('Configuracion global actualizada')
        } else {
          toast.error(result.error || 'Error al actualizar')
        }
      } else {
        const result = await saveSharedWhatsAppConfigAction(values)
        if (result.success) {
          setConfig(result.data!)
          onConfigChange?.(result.data!)
          toast.success('Configuracion global creada')
        } else {
          toast.error(result.error || 'Error al crear')
        }
      }
    } catch (error) {
      toast.error('Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const webhookUrl =
    process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook`
      : typeof window !== 'undefined'
        ? `${window.location.origin}/api/whatsapp/webhook`
        : ''

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Numero Compartido (Global)</CardTitle>
              <CardDescription>
                Este numero sera usado por todas las cuentas que no tengan configuracion propia
              </CardDescription>
            </div>
          </div>
          {config && (
            <Badge variant={config.is_enabled ? 'default' : 'secondary'}>
              {config.is_enabled ? (
                <>
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Activo
                </>
              ) : (
                <>
                  <XCircle className="mr-1 h-3 w-3" /> Inactivo
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="phone_number_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number ID</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789012345" {...field} />
                    </FormControl>
                    <FormDescription>ID del numero de WhatsApp</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="whatsapp_business_account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Account ID</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789012345" {...field} />
                    </FormControl>
                    <FormDescription>
                      ID de la cuenta de WhatsApp Business
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="display_phone_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero de telefono</FormLabel>
                  <FormControl>
                    <Input placeholder="+573001234567" {...field} />
                  </FormControl>
                  <FormDescription>
                    Numero de telefono mostrado a los clientes
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="access_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Token</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showToken ? 'text' : 'password'}
                        placeholder="Token de acceso de Meta..."
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Token de acceso permanente de Meta for Developers
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="webhook_verify_token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Webhook Verify Token</FormLabel>
                  <FormControl>
                    <Input placeholder="Token de verificacion..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Token para verificar el webhook en Meta
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {webhookUrl && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm font-medium mb-2">URL del Webhook</p>
                <code className="text-xs bg-background px-2 py-1 rounded break-all">
                  {webhookUrl}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Configura esta URL en Meta for Developers
                </p>
              </div>
            )}

            <FormField
              control={form.control}
              name="is_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Habilitar WhatsApp
                    </FormLabel>
                    <FormDescription>
                      Activa o desactiva el envio de mensajes por WhatsApp
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

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{' '}
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Guardar
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
