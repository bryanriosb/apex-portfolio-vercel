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
import type { BusinessAccount } from '@/lib/models/business-account/business-account'
import type { Plan } from '@/lib/models/plan/plan'
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  FileText,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import PlanService from '@/lib/services/plan/plan-service'
import Loading from '../ui/loading'

interface BusinessAccountDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: BusinessAccount | null
  // Opcional: si ya tienes el plan cargado, pásalo para evitar una llamada extra
  plan?: Plan | null
}

const statusConfig = {
  active: { label: 'Activa', variant: 'default' as const, icon: CheckCircle },
  trial: { label: 'Prueba', variant: 'secondary' as const, icon: Clock },
  suspended: {
    label: 'Suspendida',
    variant: 'outline' as const,
    icon: AlertTriangle,
  },
  cancelled: {
    label: 'Cancelada',
    variant: 'destructive' as const,
    icon: XCircle,
  },
}

const subscriptionPlanLabels: Record<string, string> = {
  trial: 'Prueba',
  basic: 'Básico',
  pro: 'Profesional',
  enterprise: 'Empresarial',
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: any
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="flex-1">
        <span className="text-muted-foreground text-sm block">{label}</span>
        <span className="font-medium text-sm">{value || '-'}</span>
      </div>
    </div>
  )
}

export function BusinessAccountDetailModal({
  open,
  onOpenChange,
  account,
  plan: initialPlan,
}: BusinessAccountDetailModalProps) {
  const [isLoadingPlan, setIsLoadingPlan] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(initialPlan || null)

  const loadPlanDetails = useCallback(async () => {
    if (!account || initialPlan) return

    // Si la cuenta tiene plan_id, cargar los detalles del plan
    const accountWithPlan = account as any
    if (accountWithPlan.plan_id) {
      setIsLoadingPlan(true)
      try {
        const planService = new PlanService()
        const planData = await planService.getById(accountWithPlan.plan_id)
        setPlan(planData)
      } catch (error) {
        console.error('Error loading plan:', error)
      } finally {
        setIsLoadingPlan(false)
      }
    }
  }, [account, initialPlan])

  useEffect(() => {
    if (open && account) {
      loadPlanDetails()
    }
    if (!open) {
      setPlan(initialPlan || null)
    }
  }, [open, account, loadPlanDetails, initialPlan])

  if (!account) return null

  const statusInfo = statusConfig[account.status]
  const StatusIcon = statusInfo.icon

  // Construir dirección completa
  const fullAddress = [
    account.billing_address,
    account.billing_city,
    account.billing_state,
    account.billing_postal_code,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {account.company_name}
              </DialogTitle>
              {account.legal_name && (
                <p className="text-sm text-muted-foreground">
                  {account.legal_name}
                </p>
              )}
            </div>
            <Badge variant={statusInfo.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Información de la Empresa */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Información de la Empresa
              </h4>
              <div className="rounded-lg border p-4 space-y-1">
                <InfoRow
                  label="NIT / Identificación Fiscal"
                  value={
                    account.tax_id ? (
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {account.tax_id}
                      </code>
                    ) : (
                      '-'
                    )
                  }
                  icon={FileText}
                />
                <InfoRow
                  label="País"
                  value={
                    account.billing_country === 'CO'
                      ? 'Colombia'
                      : account.billing_country
                  }
                  icon={MapPin}
                />
              </div>
            </div>

            <Separator />

            {/* Información de Contacto */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Información de Contacto
              </h4>
              <div className="rounded-lg border p-4 space-y-1">
                <InfoRow
                  label="Nombre del Contacto"
                  value={account.contact_name}
                  icon={User}
                />
                <InfoRow
                  label="Email"
                  value={
                    <a
                      href={`mailto:${account.contact_email}`}
                      className="text-primary hover:underline"
                    >
                      {account.contact_email}
                    </a>
                  }
                  icon={Mail}
                />
                <InfoRow
                  label="Teléfono"
                  value={account.contact_phone}
                  icon={Phone}
                />
              </div>
            </div>

            <Separator />

            {/* Dirección de Facturación */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Dirección de Facturación
              </h4>
              <div className="rounded-lg border p-4">
                {fullAddress ? (
                  <p className="text-sm">{fullAddress}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin dirección registrada
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Plan de Suscripción */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Plan de Suscripción
              </h4>
              <div className="rounded-lg border p-4">
                {isLoadingPlan ? (
                  <div className="flex items-center justify-center py-4">
                    <Loading />
                  </div>
                ) : plan ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="default" className="text-sm">
                          {plan.name}
                        </Badge>
                        {plan.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {plan.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {new Intl.NumberFormat('es-CO', {
                            style: 'currency',
                            currency: 'COP',
                            minimumFractionDigits: 0,
                          }).format(plan.price_cents / 100)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          /{' '}
                          {plan.billing_period === 'monthly'
                            ? 'mes'
                            : plan.billing_period === 'yearly'
                            ? 'año'
                            : 'único'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                      <div className="text-center">
                        <div className="font-medium">{plan.max_businesses}</div>
                        <div className="text-xs text-muted-foreground">
                          Negocios
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">
                          {plan.max_users_per_business}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Usuarios
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium">
                          {plan.max_specialists_per_business}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Especialistas
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline">
                        {subscriptionPlanLabels[account.subscription_plan] ||
                          account.subscription_plan}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Plan legacy (sin detalles disponibles)
                      </p>
                    </div>
                  </div>
                )}
                {account.trial_ends_at && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Prueba termina:
                      </span>
                      <span className="font-medium">
                        {format(
                          new Date(account.trial_ends_at),
                          "dd 'de' MMMM, yyyy",
                          { locale: es }
                        )}
                      </span>
                    </div>
                  </div>
                )}
                {account.subscription_started_at && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Suscripción desde:
                      </span>
                      <span className="font-medium">
                        {format(
                          new Date(account.subscription_started_at),
                          "dd 'de' MMMM, yyyy",
                          { locale: es }
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Configuración Personalizada */}
            {account.settings && Object.keys(account.settings).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Configuración Personalizada
                  </h4>
                  <div className="rounded-lg border p-4">
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(account.settings).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Fechas */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Información del Sistema
              </h4>
              <div className="rounded-lg border p-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground text-sm block">
                    Creación
                  </span>
                  <span className="font-medium text-sm">
                    {format(
                      new Date(account.created_at),
                      "dd 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm block">
                    Última actualización
                  </span>
                  <span className="font-medium text-sm">
                    {format(
                      new Date(account.updated_at),
                      "dd 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
