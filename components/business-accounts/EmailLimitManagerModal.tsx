'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'
import {
  updateAccountEmailLimitAction,
  getAccountEmailLimitInfoAction,
  type AccountEmailLimitInfo,
} from '@/lib/actions/business-account'

interface EmailLimitManagerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: BusinessAccount | null
  onSuccess?: () => void
}

export function EmailLimitManagerModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: EmailLimitManagerModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [limitInfo, setLimitInfo] = useState<AccountEmailLimitInfo | null>(null)
  const [useCustomLimit, setUseCustomLimit] = useState(false)
  const [customLimit, setCustomLimit] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState<string>('')

  // Cargar información del límite cuando se abre el modal
  useEffect(() => {
    if (open && account) {
      loadLimitInfo()
    } else if (!open) {
      // Limpiar estado cuando se cierra el modal
      setLimitInfo(null)
      setUseCustomLimit(false)
      setCustomLimit('')
      setSelectedPreset('')
    }
  }, [open, account])

  const loadLimitInfo = async () => {
    if (!account) return

    setIsLoading(true)
    setLimitInfo(null) // Limpiar estado anterior
    
    try {
      console.log('Loading limit info for account:', account.id)
      const { data, error } = await getAccountEmailLimitInfoAction(account.id)
      
      console.log('Response:', { data, error })
      
      if (error) {
        console.error('Error from action:', error)
        toast.error(`Error al cargar información: ${error}`)
        return
      }

      if (data) {
        console.log('Setting limit info:', data)
        setLimitInfo(data)
        
        // Determinar si hay un límite custom activo
        if (data.isOverridden) {
          setUseCustomLimit(true)
          setCustomLimit(data.maxEmails?.toString() || '0')
          setSelectedPreset('')
        } else {
          setUseCustomLimit(false)
          setCustomLimit('')
          setSelectedPreset(data.maxEmails?.toString() || 'plan')
        }
      } else {
        console.warn('No data received from getAccountEmailLimitInfoAction')
        toast.error('No se recibió información del límite')
      }
    } catch (error) {
      console.error('Error loading email limit info:', error)
      toast.error(`Error al cargar información: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!account) return

    setIsSaving(true)
    try {
      let limitValue: number | null

      if (!useCustomLimit) {
        // Usar el límite del plan (null)
        limitValue = null
      } else if (selectedPreset && selectedPreset !== 'custom') {
        // Usar preset seleccionado
        limitValue = parseInt(selectedPreset, 10)
      } else {
        // Usar valor custom ingresado
        const parsed = parseInt(customLimit, 10)
        if (isNaN(parsed) || parsed < 0) {
          toast.error('Por favor ingresa un número válido')
          return
        }
        limitValue = parsed
      }

      const result = await updateAccountEmailLimitAction(account.id, limitValue)

      if (result.success) {
        toast.success('Límite de emails actualizado correctamente')
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al actualizar el límite')
      }
    } catch (error) {
      console.error('Error saving email limit:', error)
      toast.error('Error al guardar el límite')
    } finally {
      setIsSaving(false)
    }
  }

  const getLimitDescription = () => {
    if (!limitInfo) return ''
    
    if (limitInfo.maxEmails === null) {
      return 'Ilimitado (según el plan)'
    } else if (limitInfo.maxEmails === 0) {
      return 'Bloqueado (0 emails)'
    } else {
      return `${limitInfo.maxEmails} emails`
    }
  }

  const getUsagePercentage = () => {
    if (!limitInfo || limitInfo.maxEmails === null || limitInfo.maxEmails === 0) {
      return 0
    }
    return Math.min(100, (limitInfo.emailsSent / limitInfo.maxEmails) * 100)
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gestión de Límite de Emails
          </DialogTitle>
          <DialogDescription>
            Configura el límite de emails para <strong>{account.company_name}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Información actual */}
            {limitInfo && (
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Límite actual:
                  </span>
                  <span className="font-medium">
                    {getLimitDescription()}
                    {limitInfo.isOverridden && (
                      <span className="ml-2 text-xs text-primary">(Custom)</span>
                    )}
                  </span>
                </div>
                
                {limitInfo.maxEmails !== null && limitInfo.maxEmails > 0 && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Usado:</span>
                      <span className="font-medium">
                        {limitInfo.emailsSent} / {limitInfo.maxEmails}
                      </span>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            getUsagePercentage() >= 90
                              ? 'bg-destructive'
                              : getUsagePercentage() >= 70
                              ? 'bg-yellow-500'
                              : 'bg-primary'
                          }`}
                          style={{ width: `${getUsagePercentage()}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{Math.round(getUsagePercentage())}% usado</span>
                        <span>{limitInfo.emailsRemaining} restantes</span>
                      </div>
                    </div>
                  </>
                )}

                {limitInfo.hasReachedLimit && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Esta cuenta ha alcanzado su límite de emails
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Configuración */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="custom-limit" className="font-medium">
                  Usar límite personalizado
                </Label>
                <Switch
                  id="custom-limit"
                  checked={useCustomLimit}
                  onCheckedChange={setUseCustomLimit}
                />
              </div>

              {useCustomLimit ? (
                <div className="space-y-3">
                  <Label>Seleccionar límite</Label>
                  <Select
                    value={selectedPreset}
                    onValueChange={(value) => {
                      setSelectedPreset(value)
                      if (value !== 'custom') {
                        setCustomLimit('')
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un límite..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Bloquear (0 emails)</SelectItem>
                      <SelectItem value="10">Trial - 10 emails</SelectItem>
                      <SelectItem value="50">Básico - 50 emails</SelectItem>
                      <SelectItem value="100">Estándar - 100 emails</SelectItem>
                      <SelectItem value="500">Pro - 500 emails</SelectItem>
                      <SelectItem value="1000">Business - 1000 emails</SelectItem>
                      <SelectItem value="custom">Personalizado...</SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedPreset === 'custom' && (
                    <div className="space-y-2">
                      <Label htmlFor="custom-value">Valor personalizado</Label>
                      <Input
                        id="custom-value"
                        type="number"
                        min="0"
                        placeholder="Ej: 250"
                        value={customLimit}
                        onChange={(e) => setCustomLimit(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Ingresa 0 para bloquear completamente, o un número positivo para el límite
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Se usará el límite definido en el plan asignado a esta cuenta
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}