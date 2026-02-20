'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AttachmentManager } from '@/components/collection/attachments/AttachmentManager'
import { FileData, EmailConfig, GroupedClient } from './types'
import { ThresholdCard } from './ThresholdCard'
import {
  Users,
  AlertCircle,
  CheckCircle2,
  Mail,
  Clock,
  FileText,
} from 'lucide-react'
import Loading from '@/components/ui/loading'
import { useThresholdPreview } from '@/hooks/collection/use-threshold-preview'

interface Step2ContentProps {
  fileData: FileData | null
  config: EmailConfig
  onChange: React.Dispatch<React.SetStateAction<EmailConfig>>
}

export function Step2Content({
  fileData,
  config,
  onChange,
}: Step2ContentProps) {
  const [selectedThreshold, setSelectedThreshold] = useState<string | null>(null)
  
  // Usar el hook compartido para evitar duplicación de código
  const { 
    previewData, 
    unassignedClients, 
    unassignedCount, 
    totalClients, 
    isLoading,
    hasAllThresholds 
  } = useThresholdPreview(fileData?.groupedClients || new Map())

  const totalValidClients = totalClients
  const totalClientsInCsv = fileData?.groupedClients?.size || 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading className="w-6 h-6 text-primary" />
        <span className="ml-3 text-muted-foreground">
          Analizando configuración de umbrales...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Distribución por Umbrales</h3>
          <p className="text-sm text-muted-foreground">
            Los clientes se agruparán automáticamente según sus días de mora
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Users className="h-3.5 w-3.5 mr-1" />
          {totalClients} clientes
        </Badge>
      </div>

      {/* Alertas de configuración */}
      {unassignedClients.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Faltan umbrales configurados</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              {unassignedClients.length} cliente
              {unassignedClients.length !== 1 ? 's' : ''} no tiene
              {unassignedClients.length === 1 ? '' : 'n'} un umbral asignado.
            </p>
            <p className="text-sm">
              Días de mora sin cobertura: {getMissingRanges(unassignedClients)}
            </p>
            <p className="text-sm mt-2">
              <a
                href="/admin/settings/collection"
                className="underline font-medium"
              >
                Configurar umbrales →
              </a>
            </p>
          </AlertDescription>
        </Alert>
      )}

      {unassignedClients.length === 0 && previewData.length > 0 && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            Configuración completa
          </AlertTitle>
          <AlertDescription className="text-green-700">
            Todos los clientes tienen un umbral y plantilla asignados.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de Umbrales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {previewData.map((data) => {
          // Skip if threshold is null
          const threshold = data.threshold
          if (!threshold) return null
          
          const percentage =
            totalClients > 0
              ? Math.round((data.count / totalClients) * 100)
              : 0
          const isSelected = selectedThreshold === threshold.id

          return (
            <ThresholdCard
              key={threshold.id}
              threshold={threshold}
              clients={data.clients}
              count={data.count}
              totalClients={totalClients}
              isSelected={isSelected}
              onClick={() => setSelectedThreshold(isSelected ? null : threshold.id)}
              onStopPropagation={(e) => e.stopPropagation()}
            >
              {isSelected && (
                <div className="mt-4 pt-4 border-t">
                  <ClientListDialog
                    clients={data.clients}
                    thresholdName={threshold.name}
                  />
                </div>
              )}
            </ThresholdCard>
          )
        })}

        {/* Clientes sin asignar */}
        {unassignedClients.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5 lg:col-span-3">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-sm">
                    Sin umbral asignado
                  </span>
                </div>
                <Badge variant="destructive">{unassignedClients.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Usarán plantilla por defecto. Se recomienda configurar umbrales
                para todos los rangos.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Adjuntos Globales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Archivos Adjuntos Globales
          </CardTitle>
          <CardDescription>
            Estos adjuntos se incluirán en todos los correos según las reglas
            configuradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentManager
            mode="select"
            selectedIds={config.attachmentIds}
            onSelectionChange={(ids) =>
              onChange((prev) => ({ ...prev, attachmentIds: ids }))
            }
          />
        </CardContent>
      </Card>

      {/* Resumen */}
      {previewData.length > 0 && (
        <div className="bg-muted/50 p-4 rounded-lg border">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Resumen de Configuración
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• {previewData.length} umbrales configurados</li>
            <li>• {totalValidClients} clientes serán procesados</li>
            <li>• {config.attachmentIds.length} adjuntos seleccionados</li>
            {unassignedClients.length > 0 && (
              <li className="text-destructive">
                • {unassignedClients.length} cliente
                {unassignedClients.length !== 1 ? 's' : ''} sin umbral
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// Helper para calcular rangos faltantes
function getMissingRanges(clients: GroupedClient[]): string {
  const daysSet = new Set(clients.map((c) => c.total.total_days_overdue))
  const sortedDays = Array.from(daysSet).sort((a, b) => a - b)

  if (sortedDays.length === 0) return ''
  if (sortedDays.length === 1) return `${sortedDays[0]} días`

  const ranges: string[] = []
  let start = sortedDays[0]
  let end = sortedDays[0]

  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] === end + 1) {
      end = sortedDays[i]
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`)
      start = sortedDays[i]
      end = sortedDays[i]
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`)

  return ranges.join(', ') + ' días'
}

// Componente para mostrar lista de clientes
interface ClientListDialogProps {
  clients: GroupedClient[]
  thresholdName: string
}

function ClientListDialog({ clients, thresholdName }: ClientListDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Users className="h-4 w-4 mr-2" />
          Ver {clients.length} clientes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Clientes en: {thresholdName}</DialogTitle>
          <DialogDescription>
            Lista de clientes que recibirán esta plantilla
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 mt-4 space-y-2">
          {clients.map((client) => (
            <div
              key={client.nit}
              className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {client.customer?.company_name || `NIT: ${client.nit}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {client.invoices.length} factura
                  {client.invoices.length !== 1 ? 's' : ''} • NIT: {client.nit}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium">
                  ${client.total.total_amount_due.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  {client.total.total_days_overdue} días
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Total: {clients.length} cliente{clients.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
