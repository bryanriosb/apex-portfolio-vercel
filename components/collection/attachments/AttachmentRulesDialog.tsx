'use client'

import { useState, useEffect } from 'react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Settings } from 'lucide-react'
import { AttachmentRulesService, NotificationThresholdService } from '@/lib/services/collection'
import type { AttachmentRule, AttachmentRuleType } from '@/lib/models/collection/attachment-rule'
import type { CollectionAttachment } from '@/lib/models/collection'
import type { NotificationThreshold } from '@/lib/models/collection/notification-threshold'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'

interface AttachmentRulesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attachment: CollectionAttachment
  onSuccess: () => void
}

const RULE_TYPE_OPTIONS: { value: AttachmentRuleType; label: string }[] = [
  { value: 'global', label: 'Global (Todos los clientes)' },
  { value: 'threshold', label: 'Por Umbral de Días' },
  { value: 'customer_category', label: 'Por Categoría de Cliente' },
  { value: 'customer', label: 'Cliente Específico' },
  { value: 'execution', label: 'Ejecución Específica' },
]

interface RuleFormData {
  id?: string
  rule_type: AttachmentRuleType
  rule_entity_id?: string
  is_required: boolean
  display_order: number
  conditions: {
    min_amount?: number
    max_amount?: number
  }
}

export function AttachmentRulesDialog({
  open,
  onOpenChange,
  attachment,
  onSuccess,
}: AttachmentRulesDialogProps) {
  const { activeBusiness } = useActiveBusinessStore()
  const [rules, setRules] = useState<RuleFormData[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [thresholds, setThresholds] = useState<NotificationThreshold[]>([])

  // Load existing rules when dialog opens
  useEffect(() => {
    if (open && attachment.id) {
      loadRules()
      loadThresholds()
    }
  }, [open, attachment.id])

  const loadRules = async () => {
    setLoading(true)
    try {
      const existingRules = await AttachmentRulesService.fetchRulesByAttachment(
        attachment.id
      )
      setRules(
        existingRules.map((rule) => ({
          id: rule.id,
          rule_type: rule.rule_type,
          rule_entity_id: rule.rule_entity_id || undefined,
          is_required: rule.is_required,
          display_order: rule.display_order,
          conditions: rule.conditions || {},
        }))
      )
    } catch (error) {
      console.error('Error loading rules:', error)
      toast.error('Error al cargar las reglas')
    } finally {
      setLoading(false)
    }
  }

  const loadThresholds = async () => {
    if (!activeBusiness?.business_account_id) return
    try {
      const result = await NotificationThresholdService.fetchThresholds(
        activeBusiness.business_account_id
      )
      setThresholds(result.data)
    } catch (error) {
      console.error('Error loading thresholds:', error)
    }
  }

  const addRule = () => {
    setRules([
      ...rules,
      {
        rule_type: 'global',
        is_required: false,
        display_order: rules.length,
        conditions: {},
      },
    ])
  }

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index))
  }

  const updateRule = (index: number, updates: Partial<RuleFormData>) => {
    const newRules = [...rules]
    newRules[index] = { ...newRules[index], ...updates }
    setRules(newRules)
  }

  const handleSave = async () => {
    if (!activeBusiness?.business_account_id) {
      toast.error('No hay una sucursal activa')
      return
    }

    setSaving(true)
    try {
      // Validate rules
      for (const rule of rules) {
        if (rule.rule_type !== 'global' && !rule.rule_entity_id) {
          toast.error(
            `La regla de tipo "${RULE_TYPE_OPTIONS.find((o) => o.value === rule.rule_type)?.label}" requiere seleccionar una entidad`
          )
          setSaving(false)
          return
        }
      }

      // Convert to insert format and save
      const rulesToSave = rules.map((rule) => ({
        rule_type: rule.rule_type,
        rule_entity_id: rule.rule_entity_id || null,
        is_required: rule.is_required,
        display_order: rule.display_order,
        conditions: rule.conditions,
      }))

      await AttachmentRulesService.saveRulesForAttachment(
        attachment.id,
        activeBusiness.business_account_id,
        rulesToSave
      )

      toast.success('Reglas guardadas correctamente')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving rules:', error)
      toast.error(error.message || 'Error al guardar las reglas')
    } finally {
      setSaving(false)
    }
  }

  const renderRuleEntitySelector = (rule: RuleFormData, index: number) => {
    switch (rule.rule_type) {
      case 'threshold':
        return (
          <Select
            value={rule.rule_entity_id || ''}
            onValueChange={(value) =>
              updateRule(index, { rule_entity_id: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar umbral..." />
            </SelectTrigger>
            <SelectContent>
              {thresholds.map((threshold) => (
                <SelectItem key={threshold.id} value={threshold.id}>
                  {threshold.name} ({threshold.days_from}-
                  {threshold.days_to ?? '∞'} días)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'customer_category':
        return (
          <Input
            placeholder="ID de categoría"
            value={rule.rule_entity_id || ''}
            onChange={(e) =>
              updateRule(index, { rule_entity_id: e.target.value })
            }
          />
        )

      case 'customer':
        return (
          <Input
            placeholder="ID de cliente"
            value={rule.rule_entity_id || ''}
            onChange={(e) =>
              updateRule(index, { rule_entity_id: e.target.value })
            }
          />
        )

      case 'execution':
        return (
          <Input
            placeholder="ID de ejecución"
            value={rule.rule_entity_id || ''}
            onChange={(e) =>
              updateRule(index, { rule_entity_id: e.target.value })
            }
          />
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Reglas de Inclusión
          </DialogTitle>
          <DialogDescription>
            Define cuándo se incluirá el adjunto <strong>{attachment.name}</strong> en los
            emails de cobro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando reglas...
            </div>
          ) : (
            <>
              {rules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No hay reglas configuradas. El adjunto no se incluirá
                  automáticamente.
                </div>
              )}

              {rules.map((rule, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-4 bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      {/* Rule Type */}
                      <div className="space-y-2">
                        <Label>Tipo de Regla</Label>
                        <Select
                          value={rule.rule_type}
                          onValueChange={(value: AttachmentRuleType) =>
                            updateRule(index, {
                              rule_type: value,
                              rule_entity_id: undefined,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RULE_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Entity Selector (if not global) */}
                      {rule.rule_type !== 'global' && (
                        <div className="space-y-2">
                          <Label>Entidad</Label>
                          {renderRuleEntitySelector(rule, index)}
                        </div>
                      )}

                      {/* Conditions */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Monto Mínimo (opcional)</Label>
                          <Input
                            type="number"
                            placeholder="Sin mínimo"
                            value={rule.conditions.min_amount || ''}
                            onChange={(e) =>
                              updateRule(index, {
                                conditions: {
                                  ...rule.conditions,
                                  min_amount: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Monto Máximo (opcional)</Label>
                          <Input
                            type="number"
                            placeholder="Sin máximo"
                            value={rule.conditions.max_amount || ''}
                            onChange={(e) =>
                              updateRule(index, {
                                conditions: {
                                  ...rule.conditions,
                                  max_amount: e.target.value
                                    ? parseFloat(e.target.value)
                                    : undefined,
                                },
                              })
                            }
                          />
                        </div>
                      </div>

                      {/* Options */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`required-${index}`}
                            checked={rule.is_required}
                            onCheckedChange={(checked) =>
                              updateRule(index, { is_required: checked as boolean })
                            }
                          />
                          <Label htmlFor={`required-${index}`} className="text-sm">
                            Requerido
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Orden:</Label>
                          <Input
                            type="number"
                            className="w-20 h-8"
                            value={rule.display_order}
                            onChange={(e) =>
                              updateRule(index, {
                                display_order: parseInt(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                      onClick={() => removeRule(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full"
                onClick={addRule}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Regla
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar Reglas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
