'use client'

import { useState, useEffect, useCallback } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import {
  DeliveryStrategy,
  StrategyType,
} from '@/lib/models/collection/delivery-strategy'
import {
  getBusinessStrategiesAction,
  createDeliveryStrategyAction,
  updateDeliveryStrategyAction,
  deleteDeliveryStrategyAction,
  setDefaultStrategyAction,
} from '@/lib/actions/collection/email-strategies'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  MoreVertical,
  Star,
  Edit2,
  Trash2,
  Rocket,
  Zap,
  Shield,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const strategyIcons: Record<StrategyType, typeof Rocket> = {
  ramp_up: Rocket,
  batch: Clock,
  conservative: Shield,
  aggressive: Zap,
}

const strategyLabels: Record<StrategyType, string> = {
  ramp_up: 'Ramp-Up',
  batch: 'Batch',
  conservative: 'Conservador',
  aggressive: 'Agresivo',
}

const defaultStrategyConfig: Record<
  StrategyType,
  Partial<DeliveryStrategy>
> = {
  ramp_up: {
    rampup_day_1_limit: 50,
    rampup_day_2_limit: 100,
    rampup_day_3_5_limit: 200,
    rampup_day_6_plus_limit: 500,
    batch_size: 50,
    batch_interval_minutes: 5,
    max_batches_per_day: 10,
    concurrent_batches: 2,
    max_retry_attempts: 3,
    retry_interval_minutes: 30,
  },
  batch: {
    batch_size: 100,
    batch_interval_minutes: 10,
    max_batches_per_day: 20,
    concurrent_batches: 3,
    max_retry_attempts: 3,
    retry_interval_minutes: 30,
  },
  conservative: {
    batch_size: 25,
    batch_interval_minutes: 15,
    max_batches_per_day: 5,
    concurrent_batches: 1,
    max_retry_attempts: 5,
    retry_interval_minutes: 60,
    pause_on_high_bounce: true,
    pause_on_complaint: true,
  },
  aggressive: {
    batch_size: 200,
    batch_interval_minutes: 2,
    max_batches_per_day: 50,
    concurrent_batches: 5,
    max_retry_attempts: 2,
    retry_interval_minutes: 15,
  },
}

interface StrategyFormData {
  name: string
  description: string
  strategy_type: StrategyType
  is_default: boolean
  batch_size: number
  batch_interval_minutes: number
  max_batches_per_day: number
  concurrent_batches: number
  max_retry_attempts: number
  retry_interval_minutes: number
  pause_on_high_bounce: boolean
  pause_on_complaint: boolean
  respect_timezone: boolean
  avoid_weekends: boolean
}

export function DeliveryStrategiesTab() {
  const { activeBusiness } = useActiveBusinessStore()
  const [strategies, setStrategies] = useState<DeliveryStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<DeliveryStrategy | null>(null)
  const [formData, setFormData] = useState<StrategyFormData>({
    name: '',
    description: '',
    strategy_type: 'batch',
    is_default: false,
    batch_size: 100,
    batch_interval_minutes: 10,
    max_batches_per_day: 20,
    concurrent_batches: 3,
    max_retry_attempts: 3,
    retry_interval_minutes: 30,
    pause_on_high_bounce: false,
    pause_on_complaint: false,
    respect_timezone: true,
    avoid_weekends: false,
  })

  const loadStrategies = useCallback(async () => {
    if (!activeBusiness?.id) return

    setLoading(true)
    try {
      const data = await getBusinessStrategiesAction(activeBusiness.id)
      setStrategies(data)
    } catch (error) {
      console.error('Error loading strategies:', error)
      toast.error('Error al cargar las estrategias')
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.id])

  useEffect(() => {
    loadStrategies()
  }, [loadStrategies])

  const handleCreate = () => {
    setEditingStrategy(null)
    setFormData({
      name: '',
      description: '',
      strategy_type: 'batch',
      is_default: false,
      batch_size: 100,
      batch_interval_minutes: 10,
      max_batches_per_day: 20,
      concurrent_batches: 3,
      max_retry_attempts: 3,
      retry_interval_minutes: 30,
      pause_on_high_bounce: false,
      pause_on_complaint: false,
      respect_timezone: true,
      avoid_weekends: false,
    })
    setDialogOpen(true)
  }

  const handleEdit = (strategy: DeliveryStrategy) => {
    setEditingStrategy(strategy)
    setFormData({
      name: strategy.name,
      description: strategy.description || '',
      strategy_type: strategy.strategy_type,
      is_default: strategy.is_default,
      batch_size: strategy.batch_size,
      batch_interval_minutes: strategy.batch_interval_minutes,
      max_batches_per_day: strategy.max_batches_per_day,
      concurrent_batches: strategy.concurrent_batches,
      max_retry_attempts: strategy.max_retry_attempts,
      retry_interval_minutes: strategy.retry_interval_minutes,
      pause_on_high_bounce: strategy.pause_on_high_bounce,
      pause_on_complaint: strategy.pause_on_complaint,
      respect_timezone: strategy.respect_timezone,
      avoid_weekends: strategy.avoid_weekends,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!activeBusiness?.id) return

    try {
      const payload = {
        business_id: activeBusiness.id,
        name: formData.name,
        description: formData.description || null,
        strategy_type: formData.strategy_type,
        is_default: formData.is_default,
        is_active: true,
        batch_size: formData.batch_size,
        batch_interval_minutes: formData.batch_interval_minutes,
        max_batches_per_day: formData.max_batches_per_day,
        concurrent_batches: formData.concurrent_batches,
        max_retry_attempts: formData.max_retry_attempts,
        retry_interval_minutes: formData.retry_interval_minutes,
        pause_on_high_bounce: formData.pause_on_high_bounce,
        pause_on_complaint: formData.pause_on_complaint,
        respect_timezone: formData.respect_timezone,
        avoid_weekends: formData.avoid_weekends,
        rampup_day_1_limit: defaultStrategyConfig[formData.strategy_type].rampup_day_1_limit || 50,
        rampup_day_2_limit: defaultStrategyConfig[formData.strategy_type].rampup_day_2_limit || 100,
        rampup_day_3_5_limit: defaultStrategyConfig[formData.strategy_type].rampup_day_3_5_limit || 200,
        rampup_day_6_plus_limit: defaultStrategyConfig[formData.strategy_type].rampup_day_6_plus_limit || 500,
      }

      if (editingStrategy) {
        await updateDeliveryStrategyAction(editingStrategy.id, payload)
        toast.success('Estrategia actualizada correctamente')
      } else {
        await createDeliveryStrategyAction(payload)
        toast.success('Estrategia creada correctamente')
      }

      setDialogOpen(false)
      loadStrategies()
    } catch (error: any) {
      console.error('Error saving strategy:', error)
      toast.error(error.message || 'Error al guardar la estrategia')
    }
  }

  const handleDelete = async (strategy: DeliveryStrategy) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta estrategia?')) return

    try {
      await deleteDeliveryStrategyAction(strategy.id)
      toast.success('Estrategia eliminada correctamente')
      loadStrategies()
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar la estrategia')
    }
  }

  const handleSetDefault = async (strategy: DeliveryStrategy) => {
    try {
      await setDefaultStrategyAction(strategy.id)
      toast.success('Estrategia predeterminada actualizada')
      loadStrategies()
    } catch (error: any) {
      toast.error(error.message || 'Error al establecer como predeterminada')
    }
  }

  if (!activeBusiness?.id) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">
          Selecciona una sucursal para gestionar las estrategias
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Estrategias de Envío</h3>
          <p className="text-sm text-muted-foreground">
            Configura cómo se envían los emails: ramp-up, batch, conservador o agresivo
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Estrategia
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-muted" />
              <CardContent className="h-32 bg-muted mt-2" />
            </Card>
          ))}
        </div>
      ) : strategies.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">
            No hay estrategias configuradas
          </p>
          <Button onClick={handleCreate} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Crear primera estrategia
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {strategies.map((strategy) => {
            const Icon = strategyIcons[strategy.strategy_type]
            return (
              <Card
                key={strategy.id}
                className={cn(
                  'relative transition-all',
                  strategy.is_default && 'border-primary ring-1 ring-primary'
                )}
              >
                {strategy.is_default && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-primary">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Predeterminada
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          strategy.strategy_type === 'ramp_up' && 'bg-blue-100 text-blue-700',
                          strategy.strategy_type === 'batch' && 'bg-green-100 text-green-700',
                          strategy.strategy_type === 'conservative' && 'bg-amber-100 text-amber-700',
                          strategy.strategy_type === 'aggressive' && 'bg-red-100 text-red-700'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{strategy.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {strategyLabels[strategy.strategy_type]}
                        </CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(strategy)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {!strategy.is_default && (
                          <DropdownMenuItem onClick={() => handleSetDefault(strategy)}>
                            <Star className="w-4 h-4 mr-2" />
                            Establecer como predeterminada
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(strategy)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {strategy.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {strategy.description}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted rounded p-2">
                      <span className="text-muted-foreground text-xs">Batch</span>
                      <p className="font-medium">{strategy.batch_size} emails</p>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <span className="text-muted-foreground text-xs">Intervalo</span>
                      <p className="font-medium">{strategy.batch_interval_minutes} min</p>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <span className="text-muted-foreground text-xs">Máx/día</span>
                      <p className="font-medium">{strategy.max_batches_per_day} batches</p>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <span className="text-muted-foreground text-xs">Concurrentes</span>
                      <p className="font-medium">{strategy.concurrent_batches}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStrategy ? 'Editar Estrategia' : 'Nueva Estrategia'}
            </DialogTitle>
            <DialogDescription>
              Configura los parámetros de envío de emails para esta estrategia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ej: Estrategia Conservadora"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descripción opcional..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Estrategia</Label>
                <Select
                  value={formData.strategy_type}
                  onValueChange={(value: StrategyType) => {
                    const config = defaultStrategyConfig[value]
                    setFormData({
                      ...formData,
                      strategy_type: value,
                      batch_size: config.batch_size || 100,
                      batch_interval_minutes: config.batch_interval_minutes || 10,
                      max_batches_per_day: config.max_batches_per_day || 20,
                      concurrent_batches: config.concurrent_batches || 3,
                      max_retry_attempts: config.max_retry_attempts || 3,
                      retry_interval_minutes: config.retry_interval_minutes || 30,
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ramp_up">
                      <div className="flex items-center gap-2">
                        <Rocket className="w-4 h-4" />
                        <span>Ramp-Up (Calentamiento gradual)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="batch">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Batch (Envío por lotes)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="conservative">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>Conservador (Seguro y lento)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="aggressive">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span>Agresivo (Rápido)</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_default">Estrategia Predeterminada</Label>
                  <p className="text-xs text-muted-foreground">
                    Se usará automáticamente en nuevas ejecuciones
                  </p>
                </div>
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_default: checked })
                  }
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-4">Configuración de Batches</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch_size">Tamaño del Batch</Label>
                  <Input
                    id="batch_size"
                    type="number"
                    min={1}
                    max={1000}
                    value={formData.batch_size}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        batch_size: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Emails por batch</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batch_interval">Intervalo (minutos)</Label>
                  <Input
                    id="batch_interval"
                    type="number"
                    min={1}
                    value={formData.batch_interval_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        batch_interval_minutes: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Tiempo entre batches</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_batches">Máx Batches/Día</Label>
                  <Input
                    id="max_batches"
                    type="number"
                    min={1}
                    value={formData.max_batches_per_day}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_batches_per_day: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concurrent">Batches Concurrentes</Label>
                  <Input
                    id="concurrent"
                    type="number"
                    min={1}
                    max={10}
                    value={formData.concurrent_batches}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        concurrent_batches: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-4">Reintentos</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_retries">Máx Reintentos</Label>
                  <Input
                    id="max_retries"
                    type="number"
                    min={0}
                    max={10}
                    value={formData.max_retry_attempts}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_retry_attempts: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retry_interval">Intervalo Reintentos (min)</Label>
                  <Input
                    id="retry_interval"
                    type="number"
                    min={1}
                    value={formData.retry_interval_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        retry_interval_minutes: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-4">Opciones Adicionales</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pause_bounce">Pausar en Bounce Alto</Label>
                    <p className="text-xs text-muted-foreground">
                      Pausa automáticamente si el bounce rate supera el umbral
                    </p>
                  </div>
                  <Switch
                    id="pause_bounce"
                    checked={formData.pause_on_high_bounce}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, pause_on_high_bounce: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pause_complaint">Pausar en Quejas</Label>
                    <p className="text-xs text-muted-foreground">
                      Pausa si se detectan quejas de spam
                    </p>
                  </div>
                  <Switch
                    id="pause_complaint"
                    checked={formData.pause_on_complaint}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, pause_on_complaint: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="respect_tz">Respetar Zona Horaria</Label>
                    <p className="text-xs text-muted-foreground">
                      Envía en horario local del destinatario
                    </p>
                  </div>
                  <Switch
                    id="respect_tz"
                    checked={formData.respect_timezone}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, respect_timezone: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="avoid_weekends">Evitar Fines de Semana</Label>
                    <p className="text-xs text-muted-foreground">
                      No envía emails sábados y domingos
                    </p>
                  </div>
                  <Switch
                    id="avoid_weekends"
                    checked={formData.avoid_weekends}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, avoid_weekends: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.name.trim()}>
              {editingStrategy ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
