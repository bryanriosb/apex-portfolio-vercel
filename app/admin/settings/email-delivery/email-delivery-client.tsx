'use client'

import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  Loader2,
  ShieldAlert,
  Mail,
  Plus,
  Edit,
  Trash2,
  Star,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { USER_ROLES } from '@/const/roles'
import { toast } from 'sonner'
import type { DeliveryStrategy } from '@/lib/models/collection/delivery-strategy'
import {
  createDeliveryStrategyAction,
  updateDeliveryStrategyAction,
  deleteDeliveryStrategyAction,
  setDefaultStrategyAction,
  getReputationSummaryAction,
} from '@/lib/actions/collection/email-strategies'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { EmailReputationProfile } from '@/lib/models/collection/email-reputation'

interface EmailDeliveryClientProps {
  initialStrategies: DeliveryStrategy[]
  businessId: string
}

type StrategyFormData = {
  name: string
  description: string
  strategy_type: 'ramp_up' | 'batch' | 'conservative' | 'aggressive'
  is_default: boolean
  rampup_day_1_limit: number
  rampup_day_2_limit: number
  rampup_day_3_5_limit: number
  rampup_day_6_plus_limit: number
  batch_size: number
  batch_interval_minutes: number
  max_batches_per_day: number
  concurrent_batches: number
  min_open_rate_threshold: number
  min_delivery_rate_threshold: number
  max_bounce_rate_threshold: number
  max_complaint_rate_threshold: number
}

const defaultFormData: StrategyFormData = {
  name: '',
  description: '',
  strategy_type: 'batch',
  is_default: false,
  rampup_day_1_limit: 50,
  rampup_day_2_limit: 100,
  rampup_day_3_5_limit: 150,
  rampup_day_6_plus_limit: 200,
  batch_size: 100,
  batch_interval_minutes: 60,
  max_batches_per_day: 50,
  concurrent_batches: 1,
  min_open_rate_threshold: 20,
  min_delivery_rate_threshold: 95,
  max_bounce_rate_threshold: 5,
  max_complaint_rate_threshold: 0.1,
}

export default function EmailDeliveryClient({
  initialStrategies,
  businessId,
}: EmailDeliveryClientProps) {
  const { isLoading: userLoading, role } = useCurrentUser()
  const [strategies, setStrategies] = useState<DeliveryStrategy[]>(initialStrategies)
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<DeliveryStrategy | null>(null)
  const [formData, setFormData] = useState<StrategyFormData>(defaultFormData)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleOpenCreate = () => {
    setEditingStrategy(null)
    setFormData({ ...defaultFormData, name: 'Nueva Estrategia' })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (strategy: DeliveryStrategy) => {
    setEditingStrategy(strategy)
    setFormData({
      name: strategy.name,
      description: strategy.description || '',
      strategy_type: strategy.strategy_type,
      is_default: strategy.is_default,
      rampup_day_1_limit: strategy.rampup_day_1_limit,
      rampup_day_2_limit: strategy.rampup_day_2_limit,
      rampup_day_3_5_limit: strategy.rampup_day_3_5_limit,
      rampup_day_6_plus_limit: strategy.rampup_day_6_plus_limit,
      batch_size: strategy.batch_size,
      batch_interval_minutes: strategy.batch_interval_minutes,
      max_batches_per_day: strategy.max_batches_per_day,
      concurrent_batches: strategy.concurrent_batches,
      min_open_rate_threshold: strategy.min_open_rate_threshold,
      min_delivery_rate_threshold: strategy.min_delivery_rate_threshold,
      max_bounce_rate_threshold: strategy.max_bounce_rate_threshold,
      max_complaint_rate_threshold: strategy.max_complaint_rate_threshold,
    })
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingStrategy(null)
    setFormData(defaultFormData)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    setIsLoading(true)
    try {
      if (editingStrategy) {
        const updated = await updateDeliveryStrategyAction(editingStrategy.id, formData)
        setStrategies((prev) =>
          prev.map((s) => (s.id === editingStrategy.id ? updated : s))
        )
        toast.success('Estrategia actualizada exitosamente')
      } else {
        const created = await createDeliveryStrategyAction({
          ...formData,
          business_id: businessId,
        })
        setStrategies((prev) => [created, ...prev])
        toast.success('Estrategia creada exitosamente')
      }
      handleCloseModal()
    } catch (error) {
      console.error('Error saving strategy:', error)
      toast.error(editingStrategy ? 'Error al actualizar estrategia' : 'Error al crear estrategia')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetDefault = async (strategyId: string) => {
    setIsLoading(true)
    try {
      await setDefaultStrategyAction(strategyId)
      setStrategies((prev) =>
        prev.map((s) => ({
          ...s,
          is_default: s.id === strategyId,
        }))
      )
      toast.success('Estrategia establecida como predeterminada')
    } catch (error) {
      console.error('Error setting default strategy:', error)
      toast.error('Error al establecer estrategia predeterminada')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (strategyId: string) => {
    setIsLoading(true)
    try {
      await deleteDeliveryStrategyAction(strategyId)
      setStrategies((prev) => prev.filter((s) => s.id !== strategyId))
      toast.success('Estrategia eliminada')
      setDeleteConfirmId(null)
    } catch (error) {
      console.error('Error deleting strategy:', error)
      toast.error('Error al eliminar estrategia')
    } finally {
      setIsLoading(false)
    }
  }

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (role !== USER_ROLES.COMPANY_ADMIN && role !== USER_ROLES.BUSINESS_ADMIN) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Entrega de Email
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configuración de estrategias de email
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Acceso restringido</h2>
                <p className="text-muted-foreground">
                  Solo los administradores pueden configurar las estrategias de
                  entrega de email.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Entrega de Email
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configura cómo se distribuyen los emails en el tiempo para optimizar
          deliverability
        </p>
      </div>

      <Tabs defaultValue="strategies" className="w-full">
        <TabsList>
          <TabsTrigger value="strategies">Estrategias de Envío</TabsTrigger>
          <TabsTrigger value="domains">Reputación de Dominios</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-end">
                <Button onClick={handleOpenCreate} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Estrategia
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <StrategiesTab strategies={strategies} onEdit={handleOpenEdit} onDelete={(id) => setDeleteConfirmId(id)} onSetDefault={handleSetDefault} isLoading={isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains">
          <DomainsTab businessId={businessId} />
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStrategy ? 'Editar Estrategia' : 'Crear Nueva Estrategia'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Mi Estrategia"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="strategy_type">Tipo de Estrategia</Label>
                <Select
                  value={formData.strategy_type}
                  onValueChange={(value: StrategyFormData['strategy_type']) =>
                    setFormData({ ...formData, strategy_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ramp_up">Ramp-Up (Calentamiento progresivo)</SelectItem>
                    <SelectItem value="batch">Batch (Alto volumen)</SelectItem>
                    <SelectItem value="conservative">Conservadora (Recuperación)</SelectItem>
                    <SelectItem value="aggressive">Agresiva (Rendimiento máximo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la estrategia..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="is_default">Establecer como predeterminada</Label>
            </div>

            <div className="border-t pt-4 mt-2">
              <h3 className="font-medium mb-3">Parámetros de {formData.strategy_type === 'ramp_up' ? 'Ramp-Up' : 'Batch'}</h3>
              {formData.strategy_type === 'ramp_up' ? (
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Día 1</Label>
                    <Input
                      type="number"
                      value={formData.rampup_day_1_limit}
                      onChange={(e) => setFormData({ ...formData, rampup_day_1_limit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Día 2</Label>
                    <Input
                      type="number"
                      value={formData.rampup_day_2_limit}
                      onChange={(e) => setFormData({ ...formData, rampup_day_2_limit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Días 3-5</Label>
                    <Input
                      type="number"
                      value={formData.rampup_day_3_5_limit}
                      onChange={(e) => setFormData({ ...formData, rampup_day_3_5_limit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Día 6+</Label>
                    <Input
                      type="number"
                      value={formData.rampup_day_6_plus_limit}
                      onChange={(e) => setFormData({ ...formData, rampup_day_6_plus_limit: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Tamaño Batch</Label>
                    <Input
                      type="number"
                      value={formData.batch_size}
                      onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Intervalo (min)</Label>
                    <Input
                      type="number"
                      value={formData.batch_interval_minutes}
                      onChange={(e) => setFormData({ ...formData, batch_interval_minutes: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx Batches/Día</Label>
                    <Input
                      type="number"
                      value={formData.max_batches_per_day}
                      onChange={(e) => setFormData({ ...formData, max_batches_per_day: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Concurrentes</Label>
                    <Input
                      type="number"
                      value={formData.concurrent_batches}
                      onChange={(e) => setFormData({ ...formData, concurrent_batches: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Umbrales de Engagement</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Min. Open Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_open_rate_threshold}
                    onChange={(e) => setFormData({ ...formData, min_open_rate_threshold: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min. Delivery (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_delivery_rate_threshold}
                    onChange={(e) => setFormData({ ...formData, min_delivery_rate_threshold: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máx. Bounce (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.max_bounce_rate_threshold}
                    onChange={(e) => setFormData({ ...formData, max_bounce_rate_threshold: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máx. Complaints (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.max_complaint_rate_threshold}
                    onChange={(e) => setFormData({ ...formData, max_complaint_rate_threshold: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal} disabled={isLoading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingStrategy ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Estrategia</DialogTitle>
          </DialogHeader>
          <p>¿Estás seguro de que deseas eliminar esta estrategia? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StrategiesTab({
  strategies,
  onEdit,
  onDelete,
  onSetDefault,
  isLoading,
}: {
  strategies: DeliveryStrategy[]
  onEdit: (s: DeliveryStrategy) => void
  onDelete: (id: string) => void
  onSetDefault: (id: string) => void
  isLoading: boolean
}) {
  if (strategies.length === 0) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          No hay estrategias configuradas
        </h3>
        <p className="text-muted-foreground mb-4">
          Crea tu primera estrategia de entrega de email.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {strategies.map((strategy) => (
        <Card
          key={strategy.id}
          className={strategy.is_default ? 'border-primary' : ''}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  {strategy.name}
                  {strategy.is_default && (
                    <Badge variant="default" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Por Defecto
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {strategy.strategy_type === 'ramp_up' &&
                    'Estrategia conservadora para nuevos dominios'}
                  {strategy.strategy_type === 'batch' &&
                    'Estrategia agresiva para alto volumen'}
                  {strategy.strategy_type === 'conservative' &&
                    'Estrategia ultra-conservadora para recuperación'}
                  {strategy.strategy_type === 'aggressive' &&
                    'Estrategia de máximo rendimiento'}
                </CardDescription>
              </div>
              <StrategyTypeBadge type={strategy.strategy_type} />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {strategy.strategy_type === 'ramp_up' ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Progresión de Warm-up
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Día 1</p>
                    <p className="font-semibold">
                      {strategy.rampup_day_1_limit}
                    </p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Día 2</p>
                    <p className="font-semibold">
                      {strategy.rampup_day_2_limit}
                    </p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Días 3-5</p>
                    <p className="font-semibold">
                      {strategy.rampup_day_3_5_limit}
                    </p>
                  </div>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs text-muted-foreground">Día 6+</p>
                    <p className="font-semibold">
                      {strategy.rampup_day_6_plus_limit}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Configuración de Batch
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Tamaño del Batch
                    </p>
                    <p className="font-semibold">
                      {strategy.batch_size} emails
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Intervalo</p>
                    <p className="font-semibold">
                      {strategy.batch_interval_minutes} min
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Máx. Batches/Día
                    </p>
                    <p className="font-semibold">
                      {strategy.max_batches_per_day}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Concurrentes
                    </p>
                    <p className="font-semibold">
                      {strategy.concurrent_batches}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-3 border-t space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Umbrales de Engagement
              </h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  Open Rate ≥ {strategy.min_open_rate_threshold}%
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Bounce ≤ {strategy.max_bounce_rate_threshold}%
                </Badge>
              </div>
            </div>
          </CardContent>

          <CardFooter className="border-t bg-muted/50 px-6 py-3 flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(strategy)}
              disabled={isLoading}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            {!strategy.is_default && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSetDefault(strategy.id)}
                disabled={isLoading}
              >
                <Star className="h-4 w-4 mr-1" />
                Por Defecto
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(strategy.id)}
              disabled={isLoading || strategy.is_default}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}


function DomainsTab({ businessId }: { businessId: string }) {
  const [profiles, setProfiles] = useState<EmailReputationProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        const data = await getReputationSummaryAction(businessId)
        if (mounted) {
          setProfiles(data)
        }
      } catch (error) {
        console.error('Error loading domain reputation:', error)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }
    loadData()
    return () => { mounted = false }
  }, [businessId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No hay dominios registrados
          </h3>
          <p className="text-muted-foreground max-w-md">
            Los dominios se registrarán automáticamente cuando envíes tu primera campaña de cobro.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6">
      {profiles.map((profile) => (
        <Card key={profile.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                {profile.domain}
                <Badge variant={!profile.has_reputation_issues ? 'default' : 'destructive'}>
                  {profile.has_reputation_issues ? 'Problemas Detectados' : 'Saludable'}
                </Badge>
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                Estrategia: <span className="font-medium capitalize">{profile.current_strategy.replace('_', ' ')}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-sm text-muted-foreground mb-1">Enviados</div>
                <div className="text-2xl font-bold">{profile.total_emails_sent}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-sm text-muted-foreground mb-1">Entregados</div>
                <div className="text-2xl font-bold">{profile.total_emails_delivered}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-sm text-muted-foreground mb-1">Abiertos</div>
                <div className="text-2xl font-bold">{profile.total_emails_opened}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <div className="text-sm text-muted-foreground mb-1">Rebotes</div>
                <div className="text-2xl font-bold text-red-600">{profile.total_emails_bounced}</div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <h4 className="font-medium text-sm">Salud del Dominio</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Tasa de Rebote (Bounce Rate)</span>
                    <span className={profile.bounce_rate && profile.bounce_rate > 5 ? 'text-red-600 font-bold' : ''}>
                      {profile.bounce_rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${profile.bounce_rate && profile.bounce_rate > 5 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(profile.bounce_rate || 0, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Quejas (Complaints)</span>
                    <span className={profile.complaint_rate && profile.complaint_rate > 0.1 ? 'text-red-600 font-bold' : ''}>
                      {profile.complaint_rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${profile.complaint_rate && profile.complaint_rate > 0.1 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min((profile.complaint_rate || 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
{/* StrategyTypeBadge was here */ }
function StrategyTypeBadge({ type }: { type: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    ramp_up: {
      label: 'Ramp-Up',
      className: 'bg-blue-100 text-blue-800',
    },
    batch: {
      label: 'Batch',
      className: 'bg-green-100 text-green-800',
    },
    conservative: {
      label: 'Conservadora',
      className: 'bg-yellow-100 text-yellow-800',
    },
    aggressive: {
      label: 'Agresiva',
      className: 'bg-red-100 text-red-800',
    },
  }

  const config = variants[type] || { label: type, className: '' }

  return <Badge className={config.className}>{config.label}</Badge>
}
