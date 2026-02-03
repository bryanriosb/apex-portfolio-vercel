'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  BusinessGoal,
  BusinessGoalInsert,
  GoalType,
  GoalPeriod,
} from '@/lib/models/business/business-goal'
import {
  GOAL_TYPE_LABELS,
  GOAL_PERIOD_LABELS,
  getGoalPeriodDates,
} from '@/lib/models/business/business-goal'

interface BusinessGoalModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: BusinessGoal | null
  businessId: string
  onSave: (data: BusinessGoalInsert) => Promise<void>
}

export function BusinessGoalModal({
  open,
  onOpenChange,
  goal,
  businessId,
  onSave,
}: BusinessGoalModalProps) {
  const [goalType, setGoalType] = useState<GoalType>('services_completed')
  const [targetValue, setTargetValue] = useState('')
  const [periodType, setPeriodType] = useState<GoalPeriod>('monthly')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (goal) {
      setGoalType(goal.goal_type)
      setTargetValue(goal.target_value.toString())
      setPeriodType(goal.period_type)
    } else {
      setGoalType('services_completed')
      setTargetValue('')
      setPeriodType('monthly')
    }
  }, [goal, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetValue) return

    setIsLoading(true)
    try {
      const { start, end } = getGoalPeriodDates(periodType)

      await onSave({
        business_id: businessId,
        goal_type: goalType,
        target_value: parseInt(targetValue),
        current_value: goal?.current_value ?? 0,
        period_type: periodType,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        is_active: true,
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Error saving business goal:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPlaceholder = () => {
    switch (goalType) {
      case 'revenue':
        return '500000'
      case 'services_completed':
        return '100'
      case 'new_clients':
        return '20'
      case 'hours_worked':
        return '200'
      default:
        return '50'
    }
  }

  const getHelperText = () => {
    switch (goalType) {
      case 'revenue':
        return 'Ingresa el monto en pesos colombianos (sin centavos)'
      case 'services_completed':
        return 'Número total de servicios a completar'
      case 'new_clients':
        return 'Número de nuevos clientes a captar'
      case 'hours_worked':
        return 'Total de horas de trabajo del equipo'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {goal ? 'Editar meta del equipo' : 'Crear meta del equipo'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goalType">Tipo de meta</Label>
            <Select
              value={goalType}
              onValueChange={(v) => setGoalType(v as GoalType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetValue">
              Objetivo {goalType === 'revenue' ? '($)' : ''}
            </Label>
            <Input
              id="targetValue"
              type="number"
              min="1"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={getPlaceholder()}
              required
            />
            <p className="text-xs text-muted-foreground">{getHelperText()}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodType">Período</Label>
            <Select
              value={periodType}
              onValueChange={(v) => setPeriodType(v as GoalPeriod)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GOAL_PERIOD_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !targetValue}>
              {isLoading ? 'Guardando...' : goal ? 'Actualizar' : 'Crear meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
