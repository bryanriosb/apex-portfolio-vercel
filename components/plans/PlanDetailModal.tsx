'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Plan, PlanModule, PlanModuleAccess } from '@/lib/models/plan/plan'
import {
  Building2,
  Users,
  UserCircle,
  Calendar,
  CheckCircle,
  XCircle,
  Package,
  FileStack,
  Palette,
  Boxes,
  Scissors,
  Loader2,
  Shield,
  HeadphonesIcon,
  Code,
  HardDrive,
} from 'lucide-react'
import PlanService from '@/lib/services/plan/plan-service'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PlanDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: Plan | null
}

const statusConfig = {
  active: { label: 'Activo', variant: 'default' as const, icon: CheckCircle },
  inactive: { label: 'Inactivo', variant: 'secondary' as const, icon: XCircle },
  deprecated: { label: 'Descontinuado', variant: 'destructive' as const, icon: XCircle },
}

const billingPeriodLabels = {
  monthly: 'Mensual',
  yearly: 'Anual',
  lifetime: 'Vitalicio',
}

// Configuraciones adicionales (no son módulos)
const featureIcons: Record<string, any> = {
  has_custom_branding: Palette,
  has_priority_support: HeadphonesIcon,
  has_api_access: Code,
}

const featureLabels: Record<string, string> = {
  has_custom_branding: 'Marca personalizada',
  has_priority_support: 'Soporte prioritario',
  has_api_access: 'Acceso API',
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-sm">{value}</span>
    </div>
  )
}

function FeatureItem({ featureKey, enabled }: { featureKey: string; enabled: boolean }) {
  const Icon = featureIcons[featureKey] || CheckCircle
  const label = featureLabels[featureKey] || featureKey

  return (
    <div className="flex items-center gap-2 py-1">
      {enabled ? (
        <CheckCircle className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-muted-foreground" />
      )}
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className={enabled ? '' : 'text-muted-foreground'}>{label}</span>
    </div>
  )
}

export function PlanDetailModal({ open, onOpenChange, plan }: PlanDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [moduleAccess, setModuleAccess] = useState<(PlanModuleAccess & { module: PlanModule })[]>([])
  const planService = new PlanService()

  const loadModuleAccess = useCallback(async () => {
    if (!plan) return

    setIsLoading(true)
    try {
      const access = await planService.fetchModuleAccess(plan.id)
      setModuleAccess(access)
    } catch (error) {
      console.error('Error loading module access:', error)
    } finally {
      setIsLoading(false)
    }
  }, [plan])

  useEffect(() => {
    if (open && plan) {
      loadModuleAccess()
    }
  }, [open, plan, loadModuleAccess])

  if (!plan) return null

  const statusInfo = statusConfig[plan.status]
  const StatusIcon = statusInfo.icon

  const booleanFeatures = Object.entries(plan.features).filter(
    ([key, value]) => typeof value === 'boolean' && key.startsWith('has_')
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">{plan.name}</DialogTitle>
            <Badge variant={statusInfo.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
          {plan.description && (
            <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Información General */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <FileStack className="h-4 w-4" />
                Información General
              </h4>
              <div className="rounded-lg border p-4 space-y-1">
                <InfoRow label="Código" value={<code className="bg-muted px-2 py-0.5 rounded text-xs">{plan.code}</code>} />
                <InfoRow
                  label="Precio"
                  value={
                    <span>
                      {formatPrice(plan.price_cents)}{' '}
                      <span className="text-muted-foreground">/ {billingPeriodLabels[plan.billing_period]}</span>
                    </span>
                  }
                />
                <InfoRow label="Orden de visualización" value={plan.sort_order} />
                <InfoRow
                  label="Creado"
                  value={format(new Date(plan.created_at), "dd 'de' MMMM, yyyy", { locale: es })}
                />
                <InfoRow
                  label="Actualizado"
                  value={format(new Date(plan.updated_at), "dd 'de' MMMM, yyyy", { locale: es })}
                />
              </div>
            </div>

            <Separator />

            {/* Límites */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Límites del Plan
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <Building2 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">{plan.max_businesses}</div>
                  <div className="text-xs text-muted-foreground">Negocios</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <Users className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">{plan.max_users_per_business}</div>
                  <div className="text-xs text-muted-foreground">Usuarios/Negocio</div>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <UserCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <div className="text-2xl font-bold">{plan.max_specialists_per_business}</div>
                  <div className="text-xs text-muted-foreground">Especialistas/Negocio</div>
                </div>
              </div>

              {/* Límites de uso */}
              <div className="grid grid-cols-5 gap-3 mt-4">
                <div className="rounded-lg border p-3 text-center">
                  <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">
                    {plan.features.max_appointments_per_month ?? '∞'}
                  </div>
                  <div className="text-xs text-muted-foreground">Citas/mes</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Boxes className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">
                    {plan.features.max_products ?? '∞'}
                  </div>
                  <div className="text-xs text-muted-foreground">Productos</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Scissors className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">
                    {plan.features.max_services ?? '∞'}
                  </div>
                  <div className="text-xs text-muted-foreground">Servicios</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">
                    {plan.features.max_customers ?? '∞'}
                  </div>
                  <div className="text-xs text-muted-foreground">Clientes</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <HardDrive className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-medium">
                    {plan.features.max_storage_mb ? `${plan.features.max_storage_mb} MB` : '∞'}
                  </div>
                  <div className="text-xs text-muted-foreground">Almacenamiento</div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Configuraciones adicionales */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Configuraciones Adicionales
              </h4>
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-x-4">
                  {booleanFeatures.map(([key, value]) => (
                    <FeatureItem key={key} featureKey={key} enabled={value as boolean} />
                  ))}
                </div>
                {booleanFeatures.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-2">
                    No hay configuraciones adicionales
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Módulos */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Módulos Asignados
              </h4>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : moduleAccess.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground rounded-lg border">
                  No hay módulos configurados para este plan
                </div>
              ) : (
                <div className="space-y-2">
                  {moduleAccess.map((access) => (
                    <div
                      key={access.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <div className="font-medium text-sm">{access.module.name}</div>
                        <code className="text-xs text-muted-foreground">{access.module.code}</code>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={access.can_read ? 'default' : 'secondary'} className="text-xs">
                          Lectura
                        </Badge>
                        <Badge variant={access.can_write ? 'default' : 'secondary'} className="text-xs">
                          Escritura
                        </Badge>
                        <Badge variant={access.can_delete ? 'default' : 'secondary'} className="text-xs">
                          Eliminar
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
