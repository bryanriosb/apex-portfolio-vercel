'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Calendar as CalendarIcon,
  Clock,
  TrendingUp,
  Mail,
  Shield,
  Info,
  Database,
  AlertTriangle,
  Timer,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileData, EmailConfig, StrategyType, DatabaseStrategy } from './types'
import { ThresholdPreview } from './ThresholdPreview'
import { useWizardThresholdPreview } from '@/hooks/collection/use-wizard-threshold-preview'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { CollectionTemplate } from '@/lib/models/collection'

interface Step3ContentProps {
  fileData: FileData | null
  emailConfig: EmailConfig
  onTemplateChange: (templateId: string | undefined) => void
  executionMode: 'immediate' | 'scheduled'
  onExecutionModeChange: (mode: 'immediate' | 'scheduled') => void
  scheduledDate: Date | undefined
  onScheduledDateChange: (date: Date | undefined) => void
  scheduledTime: string
  onScheduledTimeChange: (time: string) => void
  selectedStrategyId: string | null
  onStrategyChange: (strategyId: string | null) => void
  strategies: DatabaseStrategy[]
  templates: CollectionTemplate[]
  senderDomain: string
  onDomainChange: (domain: string) => void
  availableDomains: string[]
}

export function Step3Content({
  fileData,
  emailConfig,
  onTemplateChange,
  executionMode,
  onExecutionModeChange,
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
  selectedStrategyId,
  onStrategyChange,
  strategies,
  templates,
  senderDomain,
  onDomainChange,
  availableDomains,
}: Step3ContentProps) {
  const { activeBusiness } = useActiveBusinessStore()
  if (!fileData) return null

  // Usar hook con Zustand store para compartir datos con Step2 (evita recálculos)
  const { previewData, unassignedCount, totalClients, isLoading } =
    useWizardThresholdPreview(fileData.groupedClients, activeBusiness?.id || '')

  // Calcular totales basados en los datos del hook
  // totalClients incluye todos los válidos (status === 'found')
  // clientsToProcess excluye los que no tienen umbral asignado
  const clientsToProcess = totalClients - unassignedCount
  const totalInvoices = previewData.reduce(
    (acc: number, curr: any) =>
      acc +
      curr.clients.reduce(
        (sum: number, client: any) => sum + client.invoices.length,
        0
      ),
    0
  )

  // Total de clientes en el CSV (incluyendo no válidos)
  const totalClientsInCsv = fileData.groupedClients.size

  const selectedStrategy = strategies.find((s) => s.id === selectedStrategyId)

  const getStrategyIcon = (type: StrategyType) => {
    switch (type) {
      case 'ramp_up':
        return <TrendingUp className="h-6 w-6 text-muted-foreground" />
      case 'batch':
        return <Mail className="h-6 w-6 text-muted-foreground" />
      case 'conservative':
        return <Shield className="h-6 w-6 text-muted-foreground" />
      case 'aggressive':
        return <Database className="h-6 w-6 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Válidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientsToProcess}</div>
            <p className="text-xs text-muted-foreground">
              De {totalClientsInCsv} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Facturas a Procesar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Configuración</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">Por umbrales</div>
            <p className="text-xs text-muted-foreground">
              {emailConfig.attachmentIds.length} adjuntos globales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Threshold Preview */}
      {fileData?.groupedClients && fileData.groupedClients.size > 0 && (
        <ThresholdPreview clients={fileData.groupedClients} />
      )}

      {/* Execution Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Modo de Ejecución
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={executionMode}
            onValueChange={(v) =>
              onExecutionModeChange(v as 'immediate' | 'scheduled')
            }
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <ExecutionModeOption
              value="immediate"
              icon={<Clock className="h-6 w-6 text-muted-foreground" />}
              title="Iniciar Inmediatamente"
              description="Se enviarán los correos ahora mismo"
            />
            <ExecutionModeOption
              value="scheduled"
              icon={<CalendarIcon className="h-6 w-6 text-muted-foreground" />}
              title="Programar Ejecución"
              description="Elegir fecha y hora de envío"
            />
          </RadioGroup>

          {executionMode === 'scheduled' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>Fecha de Envío</Label>
                <DatePicker
                  value={scheduledDate}
                  onChange={onScheduledDateChange}
                  placeholder="Seleccionar fecha"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Hora de Envío</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => onScheduledTimeChange(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Nota sobre horarios de envío */}
          {executionMode === 'immediate' && selectedStrategy && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-2">
                <Timer className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-blue-900">
                    Horario de Envío
                  </p>
                  <p className="text-xs text-blue-800">
                    La estrategia seleccionada permite envíos entre las{' '}
                    <strong>
                      {selectedStrategy.preferred_send_hour_start ?? 9}:00 -{' '}
                      {selectedStrategy.preferred_send_hour_end ?? 17}:00
                    </strong>
                    . Si inicias fuera de este rango, el envío se programará
                    automáticamente para el inicio del horario permitido.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Domain Configuration */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1 max-w-sm">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Dominio Remitente
              </Label>
              <p className="text-xs text-muted-foreground">
                El dominio que se mostrará como remitente de los correos. Los
                dominios nuevos comenzarán a generar reputación desde cero.
              </p>
            </div>

            <div className="flex-1 w-full md:max-w-xs space-y-2">
              <Select
                value={senderDomain}
                onValueChange={(value: string) => {
                  if (value === 'custom') {
                    onDomainChange('')
                  } else {
                    onDomainChange(value)
                  }
                }}
              >
                <SelectTrigger className="w-full h-9 text-sm">
                  <SelectValue placeholder="Seleccionar un dominio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    ✍️ Usar otro dominio...
                  </SelectItem>
                  {availableDomains.length > 0 && (
                    <div className="h-px bg-muted my-1" />
                  )}
                  {availableDomains.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {(senderDomain === '' ||
                !availableDomains.includes(senderDomain)) && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <Input
                    id="customDomain"
                    type="text"
                    placeholder="ejemplo.com"
                    value={senderDomain}
                    onChange={(e) => onDomainChange(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Selection from Database */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Estrategia de Envío
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {strategies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay estrategias configuradas</p>
              <p className="text-sm">
                Configure estrategias en Configuración → Entrega de Email
              </p>
            </div>
          ) : (
            <RadioGroup
              value={selectedStrategyId || ''}
              onValueChange={(v) => onStrategyChange(v || null)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {strategies.map((strategy) => (
                <StrategyCard
                  key={strategy.id}
                  strategy={strategy}
                  icon={getStrategyIcon(strategy.strategy_type)}
                  isDefault={strategy.is_default}
                  isSelected={selectedStrategyId === strategy.id}
                />
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper Components
function ExecutionModeOption({
  value,
  icon,
  title,
  description,
}: {
  value: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div>
      <RadioGroupItem value={value} id={value} className="peer sr-only" />
      <Label
        htmlFor={value}
        className="flex items-center gap-3 border-2 border-border bg-card p-3 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-colors"
      >
        <div className="flex shrink-0 items-center justify-center bg-muted/50 p-2 text-foreground">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-none mb-1 text-foreground">
            {title}
          </span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </Label>
    </div>
  )
}

function StrategyCard({
  strategy,
  icon,
  isDefault,
  isSelected,
}: {
  strategy: DatabaseStrategy
  icon: React.ReactNode
  isDefault: boolean
  isSelected: boolean
}) {
  return (
    <div>
      <RadioGroupItem
        value={strategy.id}
        id={strategy.id}
        className="peer sr-only"
      />
      <Label
        htmlFor={strategy.id}
        className={`flex items-start gap-3 border-2 border-border bg-card p-3 hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : ''}`}
      >
        <div className="flex shrink-0 items-center justify-center bg-muted/50 p-2 text-foreground">
          {icon}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold truncate text-foreground">
              {strategy.name}
            </span>
            {isDefault && (
              <span className="text-[10px] uppercase font-bold tracking-wider bg-primary/10 text-primary px-1.5 py-0.5">
                Por Defecto
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground leading-snug">
            {strategy.description ||
              getStrategyTypeLabel(strategy.strategy_type)}
          </span>
          <span
            className="text-[11px] text-muted-foreground/70 italic mt-2 overflow-hidden text-ellipsis whitespace-nowrap"
            title={getStrategyDetails(strategy)}
          >
            {getStrategyDetails(strategy)}
          </span>
        </div>
      </Label>
    </div>
  )
}

function getStrategyTypeLabel(type: StrategyType): string {
  const labels: Record<StrategyType, string> = {
    ramp_up: 'Ramp Up (Gradual)',
    batch: 'Batch (Lotes)',
    conservative: 'Conservador (Lento)',
    aggressive: 'Agresivo (Máximo Rendimiento)',
  }
  return labels[type]
}

function getStrategyDetails(strategy: DatabaseStrategy): string {
  if (strategy.strategy_type === 'ramp_up') {
    return `Día 1: ${strategy.rampup_day_1_limit} | Día 2: ${strategy.rampup_day_2_limit} | Días 3-5: ${strategy.rampup_day_3_5_limit} | Día 6+: ${strategy.rampup_day_6_plus_limit}`
  }
  return `Batch: ${strategy.batch_size} | Intervalo: ${strategy.batch_interval_minutes}min | Concurrentes: ${strategy.concurrent_batches}`
}
