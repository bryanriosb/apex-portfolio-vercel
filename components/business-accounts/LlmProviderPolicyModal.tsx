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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BrainCircuit, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'
import { updateLlmProviderPolicyAction } from '@/lib/actions/agents/llm-provider-policy-actions'
import { isApexProvidersBlocked } from '@/lib/models/agents/llm-provider-policy'

interface LlmProviderPolicyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: BusinessAccount | null
  onSuccess?: () => void
}

/**
 * Gestiona el flag `block_apex_llm_providers` de una cuenta. Cuando está
 * activo, los selectores de la cuenta solo ofrecen los proveedores LLM
 * globales que ella misma haya configurado (se ocultan los de plataforma).
 */
export function LlmProviderPolicyModal({
  open,
  onOpenChange,
  account,
  onSuccess,
}: LlmProviderPolicyModalProps) {
  const [blockApex, setBlockApex] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && account) {
      setBlockApex(isApexProvidersBlocked(account.settings))
    }
  }, [open, account])

  const handleSave = async () => {
    if (!account) return

    setIsSaving(true)
    try {
      const result = await updateLlmProviderPolicyAction(account.id, blockApex)
      if (result.success) {
        toast.success('Política de proveedores actualizada')
        onSuccess?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Error al actualizar la política')
      }
    } catch (error) {
      console.error('Error saving LLM provider policy:', error)
      toast.error('Error al guardar la política')
    } finally {
      setIsSaving(false)
    }
  }

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5" />
            Proveedores LLM
          </DialogTitle>
          <DialogDescription>
            Controla el acceso a proveedores para{' '}
            <strong>{account.company_name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="block-apex" className="font-medium">
                Bloquear proveedores de plataforma
              </Label>
              <p className="text-xs text-muted-foreground">
                Solo se ofrecerán los proveedores LLM que la cuenta haya
                configurado en Proveedores IA.
              </p>
            </div>
            <Switch
              id="block-apex"
              checked={blockApex}
              onCheckedChange={setBlockApex}
            />
          </div>

          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertDescription>
              {blockApex
                ? 'Activo: los modelos default de la plataforma quedan ocultos. Si la cuenta no tiene proveedores configurados, los selectores mostrarán un acceso directo para definirlos.'
                : 'Inactivo: la cuenta puede usar tanto los proveedores default de la plataforma como los suyos.'}
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
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
