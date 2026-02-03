'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  getOrCreateInvoiceSettingsAction,
  updateInvoiceSettingsAction,
} from '@/lib/actions/invoice-settings'
import type { InvoiceSettings } from '@/lib/models/invoice/invoice-settings'
import { toast } from 'sonner'
import Loading from '@/components/ui/loading'

export default function InvoiceSettingsPage() {
  const { role, isLoading: isLoadingUser } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const activeBusinessId = activeBusiness?.id

  const [settings, setSettings] = useState<InvoiceSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [prefix, setPrefix] = useState('')
  const [nextNumber, setNextNumber] = useState(1)

  const isCompanyAdmin = role === 'company_admin'
  const isBusinessAdmin = role === 'business_admin'
  const canEdit = isCompanyAdmin || isBusinessAdmin

  useEffect(() => {
    async function loadSettings() {
      if (!activeBusinessId) return

      setIsLoading(true)
      try {
        const data = await getOrCreateInvoiceSettingsAction(activeBusinessId)
        setSettings(data)
        setPrefix(data.prefix)
        setNextNumber(data.next_number)
      } catch (error) {
        console.error('Error loading invoice settings:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [activeBusinessId])

  const handleSave = async () => {
    if (!activeBusinessId || !canEdit) return

    const trimmedPrefix = prefix.toUpperCase().trim()
    if (trimmedPrefix.length < 4) {
      toast.error('El prefijo debe tener mínimo 4 caracteres (requisito DIAN)')
      return
    }

    setIsSaving(true)
    try {
      const result = await updateInvoiceSettingsAction(activeBusinessId, {
        prefix: trimmedPrefix,
        next_number: Math.max(1, nextNumber),
      })

      if (result.success) {
        setSettings(result.data || null)
        toast.success('Configuración guardada correctamente')
      } else {
        toast.error(result.error || 'Error al guardar')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const previewPrefix = prefix.toUpperCase() || 'FACT'
  const previewNumber = `${previewPrefix}-${nextNumber.toString()}`

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Configuración de Facturas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para configurar
          </p>
        </div>
      </div>
    )
  }

  if (isLoading || isLoadingUser) {
    return (
      <div className="flex flex-col gap-6 w-full">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Configuración de Facturas
          </h1>
        </div>
        <div className="flex items-center justify-center h-48">
          <Loading className="w-8 h-8" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Configuración de Facturas
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configura el formato de numeración de las facturas
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Numeración</CardTitle>
          <CardDescription>
            Define el prefijo y el número inicial para las facturas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prefix">Prefijo</Label>
              <Input
                id="prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                placeholder="FACT"
                minLength={4}
                maxLength={10}
                disabled={!canEdit}
                className={prefix.length > 0 && prefix.length < 4 ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 4 caracteres (requisito DIAN)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextNumber">Próximo número</Label>
              <Input
                id="nextNumber"
                type="number"
                min={1}
                value={nextNumber}
                onChange={(e) => setNextNumber(parseInt(e.target.value) || 1)}
                disabled={!canEdit}
              />
              <p className="text-xs text-muted-foreground">
                Número de la próxima factura
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              Vista previa de la próxima factura:
            </p>
            <p className="text-xl font-mono font-semibold">{previewNumber}</p>
          </div>

          {canEdit && (
            <Button onClick={handleSave} disabled={isSaving} className="w-full">
              {isSaving && <Loading className="mr-2 h-4 w-4" />}
              {isSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
