'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Send, Loader2, TestTube, AlertCircle } from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import WhatsAppService from '@/lib/services/whatsapp/whatsapp-service'
import { fetchBusinessAccountsAction } from '@/lib/actions/business-account'
import { fetchBusinessesAction } from '@/lib/actions/business'
import type { WhatsAppConfig } from '@/lib/models/whatsapp/whatsapp-config'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'
import type { Business } from '@/lib/models/business/business'

interface WhatsAppTestMessageProps {
  businessAccountId: string | null
  businessId: string | null
  sharedConfig?: WhatsAppConfig | null
}

export function WhatsAppTestMessage({ businessAccountId: initialAccountId, businessId: initialBusinessId, sharedConfig }: WhatsAppTestMessageProps) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const [accounts, setAccounts] = useState<BusinessAccount[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(initialAccountId)
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(initialBusinessId)
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false)

  const whatsappService = new WhatsAppService()

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetchBusinessAccountsAction({ page_size: 100 })
        setAccounts(response.data)
        if (response.data.length === 1 && !initialAccountId) {
          setSelectedAccountId(response.data[0].id)
        }
      } catch (error) {
        console.error('Error loading accounts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAccounts()
  }, [])

  useEffect(() => {
    if (!selectedAccountId) {
      setBusinesses([])
      setSelectedBusinessId(null)
      return
    }

    const loadBusinesses = async () => {
      setIsLoadingBusinesses(true)
      try {
        const response = await fetchBusinessesAction({
          business_account_id: selectedAccountId,
          page_size: 100,
        })
        setBusinesses(response.data)
        if (response.data.length === 1) {
          setSelectedBusinessId(response.data[0].id)
        } else if (response.data.length > 0 && !selectedBusinessId) {
          setSelectedBusinessId(response.data[0].id)
        }
      } catch (error) {
        console.error('Error loading businesses:', error)
      } finally {
        setIsLoadingBusinesses(false)
      }
    }

    loadBusinesses()
  }, [selectedAccountId])

  const accountOptions = useMemo<ComboboxOption[]>(() => {
    return accounts.map((a) => ({
      value: a.id,
      label: a.company_name,
      description: a.contact_email || undefined,
    }))
  }, [accounts])

  const businessOptions = useMemo<ComboboxOption[]>(() => {
    return businesses.map((b) => ({
      value: b.id,
      label: b.name,
    }))
  }, [businesses])

  const handleSendTest = async () => {
    if (!selectedAccountId || !selectedBusinessId || !phone || !message) {
      toast.error('Completa todos los campos')
      return
    }

    setIsSending(true)
    try {
      const result = await whatsappService.sendTextMessage({
        business_account_id: selectedAccountId,
        business_id: selectedBusinessId,
        to: phone,
        message,
      })

      if (result.success) {
        toast.success('Mensaje enviado correctamente')
        setMessage('')
      } else {
        toast.error(result.error || 'Error al enviar mensaje')
      }
    } catch (error) {
      toast.error('Error al enviar mensaje')
    } finally {
      setIsSending(false)
    }
  }

  if (!sharedConfig?.is_enabled) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex flex-col items-center gap-4 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="font-medium">WhatsApp no configurado</h3>
              <p className="text-sm text-muted-foreground">
                Primero configura y habilita el numero compartido en la pestana Configuracion
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
            <TestTube className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <CardTitle>Mensaje de prueba</CardTitle>
            <CardDescription>
              Envia un mensaje de prueba para verificar la configuracion
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Cuenta de negocio</Label>
            <Combobox
              options={accountOptions}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="Seleccionar cuenta..."
              searchPlaceholder="Buscar cuenta..."
            />
          </div>
          <div className="space-y-2">
            <Label>Sucursal</Label>
            <Combobox
              options={businessOptions}
              value={selectedBusinessId}
              onChange={setSelectedBusinessId}
              placeholder={isLoadingBusinesses ? 'Cargando...' : 'Seleccionar sucursal...'}
              searchPlaceholder="Buscar sucursal..."
              disabled={!selectedAccountId || isLoadingBusinesses}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Numero de telefono</Label>
          <Input
            id="phone"
            placeholder="+573001234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Incluye el codigo de pais (ej: +57 para Colombia)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Mensaje</Label>
          <Textarea
            id="message"
            placeholder="Escribe tu mensaje de prueba..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          onClick={handleSendTest}
          disabled={isSending || !selectedAccountId || !selectedBusinessId || !phone || !message}
          className="w-full"
        >
          {isSending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
          ) : (
            <><Send className="mr-2 h-4 w-4" /> Enviar mensaje de prueba</>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
