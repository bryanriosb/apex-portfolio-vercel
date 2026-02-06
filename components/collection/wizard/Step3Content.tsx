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
  Settings,
  Info,
  Database,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileData, EmailConfig, StrategyType, DatabaseStrategy } from './types'

interface Step3ContentProps {
  fileData: FileData | null
  emailConfig: EmailConfig
  executionMode: 'immediate' | 'scheduled'
  onExecutionModeChange: (mode: 'immediate' | 'scheduled') => void
  scheduledDate: Date | undefined
  onScheduledDateChange: (date: Date | undefined) => void
  scheduledTime: string
  onScheduledTimeChange: (time: string) => void
  selectedStrategyId: string | null
  onStrategyChange: (strategyId: string | null) => void
  strategies: DatabaseStrategy[]
  senderDomain: string
  onDomainChange: (domain: string) => void
  showAdvancedOptions: boolean
  onAdvancedOptionsChange: (show: boolean) => void
  customBatchSize: number | undefined
  onCustomBatchSizeChange: (size: number | undefined) => void
  availableDomains: string[]
}

export function Step3Content({
  fileData,
  emailConfig,
  executionMode,
  onExecutionModeChange,
  scheduledDate,
  onScheduledDateChange,
  scheduledTime,
  onScheduledTimeChange,
  selectedStrategyId,
  onStrategyChange,
  strategies,
  senderDomain,
  onDomainChange,
  showAdvancedOptions,
  onAdvancedOptionsChange,
  customBatchSize,
  onCustomBatchSizeChange,
  availableDomains,
}: Step3ContentProps) {
  if (!fileData) return null

  const totalInvoices = Array.from(fileData.groupedClients.values()).reduce(
    (acc, curr) => acc + curr.invoices.length,
    0
  )
  const validClients = Array.from(fileData.groupedClients.values()).filter(
    (c) => c.status === 'found'
  ).length

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
            <div className="text-2xl font-bold">{validClients}</div>
            <p className="text-xs text-muted-foreground">
              De {fileData.groupedClients.size} totales
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
            <CardTitle className="text-sm font-medium">Plantilla</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {emailConfig.selectedTemplate?.name || 'Seleccionada'}
            </div>
            <p className="text-xs text-muted-foreground">
              {emailConfig.attachmentIds.length} adjuntos
            </p>
          </CardContent>
        </Card>
      </div>

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
        </CardContent>
      </Card>

      {/* Domain Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Dominio Remitente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Seleccionar Dominio</Label>
            <div className="flex gap-2">
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar un dominio verificado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">✍️ Usar otro dominio...</SelectItem>
                  {availableDomains.length > 0 && <div className="h-px bg-muted my-1" />}
                  {availableDomains.map((domain) => (
                    <SelectItem key={domain} value={domain}>
                      {domain}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(senderDomain === '' || !availableDomains.includes(senderDomain)) && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="customDomain">Escribir Dominio</Label>
              <Input
                id="customDomain"
                type="text"
                placeholder="ejemplo.com"
                value={senderDomain}
                onChange={(e) => onDomainChange(e.target.value)}
              />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Dominio que aparecerá como remitente. Los dominios nuevos comenzarán a generar reputación desde cero.
          </p>
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

      {/* Advanced Options */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="showAdvancedOptions"
              checked={showAdvancedOptions}
              onChange={(e) => onAdvancedOptionsChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label
              htmlFor="showAdvancedOptions"
              className="text-sm font-medium cursor-pointer flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Opciones Avanzadas
            </Label>
          </div>
        </CardHeader>
        {showAdvancedOptions && (
          <CardContent className="animate-in fade-in slide-in-from-top-2">
            <div className="space-y-2">
              <Label htmlFor="customBatchSize">
                Tamaño de Lote Personalizado
              </Label>
              <Input
                id="customBatchSize"
                type="number"
                min={1}
                max={1000}
                placeholder="Ej: 50"
                value={customBatchSize || ''}
                onChange={(e) => {
                  const value = e.target.value
                  onCustomBatchSizeChange(
                    value ? parseInt(value, 10) : undefined
                  )
                }}
              />
              <p className="text-xs text-muted-foreground">
                Número de correos por lote. Dejar vacío para usar el valor por
                defecto de la estrategia.
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Summary */}
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h4 className="font-medium text-yellow-900 mb-2">
          Resumen de Ejecución
        </h4>
        <p className="text-sm text-yellow-800">
          {executionMode === 'immediate'
            ? `Se crearán ${validClients} registros de cobro y el envío comenzará inmediatamente usando la estrategia "${selectedStrategy?.name || 'Por Defecto'}".`
            : `Se crearán ${validClients} registros y el envío se programará para el ${scheduledDate ? scheduledDate.toLocaleDateString() : '...'} a las ${scheduledTime} usando la estrategia "${selectedStrategy?.name || 'Por Defecto'}".`}{' '}
          Los clientes no encontrados se omitirán.
        </p>
      </div>
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
        className="flex flex-col items-center justify-between border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full"
      >
        <div className="mb-2">{icon}</div>
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground text-center mt-1">
          {description}
        </span>
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
        className={`flex flex-col items-start justify-between border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer h-full ${isSelected ? 'ring-0.5 ring-primary' : ''}`}
      >
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-sm font-semibold">{strategy.name}</span>
          {isDefault && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
              Por Defecto
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground text-center mt-1">
          {strategy.description || getStrategyTypeLabel(strategy.strategy_type)}
        </span>
        <span className="text-xs text-muted-foreground/70 italic mt-2">
          {getStrategyDetails(strategy)}
        </span>
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
