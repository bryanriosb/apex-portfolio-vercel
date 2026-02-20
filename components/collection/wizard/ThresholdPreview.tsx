'use client'

import { useState, useEffect } from 'react'
import { GroupedClient } from './types'
import { useThresholdPreview } from '@/hooks/collection/use-threshold-preview'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import Loading from '@/components/ui/loading'
import { truncateText } from '@/lib/utils'
import {
  Users,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Mail,
  Clock,
  FileText,
} from 'lucide-react'

interface ThresholdPreviewProps {
  clients: Map<string, GroupedClient>
}

export function ThresholdPreview({ clients }: ThresholdPreviewProps) {
  const {
    previewData,
    isLoading,
    unassignedCount,
    totalClients,
    missingThresholdRanges,
    hasAllThresholds,
  } = useThresholdPreview(clients)

  const [selectedThreshold, setSelectedThreshold] = useState<string | null>(
    null
  )

  // Debug: log preview data
  useEffect(() => {
    console.log(
      '[ThresholdPreview] previewData:',
      previewData.map((d) => ({
        name: d.threshold?.name,
        daysFrom: d.threshold?.days_from,
        daysTo: d.threshold?.days_to,
        hasTemplate: !!d.threshold?.email_template,
      }))
    )
  }, [previewData])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8 gap-3">
            <Loading className="h-6 w-6 text-primary" />
            <span className="text-muted-foreground">
              Analizando umbrales...
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (totalClients === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      {/* Alerta de umbrales faltantes */}
      {!hasAllThresholds && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Umbrales incompletos</AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              {unassignedCount} cliente{unassignedCount !== 1 ? 's' : ''} no
              tiene{unassignedCount === 1 ? '' : 'n'} umbral asignado.
            </p>
            {missingThresholdRanges.length > 0 && (
              <p className="text-sm">
                Rango{missingThresholdRanges.length > 1 ? 's' : ''} faltante
                {missingThresholdRanges.length > 1 ? 's' : ''}:{' '}
                {missingThresholdRanges.map((range, idx) => (
                  <span key={idx} className="font-semibold">
                    {range.min === range.max
                      ? range.min
                      : `${range.min}-${range.max}`}{' '}
                    días
                    {idx < missingThresholdRanges.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Resumen general */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Distribución por Umbrales
          </CardTitle>
          <CardDescription>
            {totalClients} clientes serán agrupados según sus días de mora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {previewData.map((data) => {
              const percentage = Math.round((data.count / totalClients) * 100)
              const isSelected = selectedThreshold === data.threshold?.id

              return (
                <div
                  key={data.threshold?.id || 'unassigned'}
                  className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() =>
                    setSelectedThreshold(
                      isSelected ? null : data.threshold?.id || null
                    )
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h4 className="font-semibold text-sm truncate">
                          {data.threshold?.name || 'Sin umbral'}
                        </h4>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {data.threshold?.days_to
                            ? `${data.threshold.days_from ?? 0}-${data.threshold.days_to} días`
                            : `${data.threshold?.days_from ?? 0}+ días`}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span
                          className="truncate"
                          title={
                            data.threshold?.email_template?.name ||
                            'No asignado'
                          }
                        >
                          {truncateText(
                            data.threshold?.email_template?.name ||
                              'No asignado',
                            50
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{data.count}</span>
                          <span className="text-muted-foreground text-sm">
                            clientes
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {percentage}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <ChevronRight
                      className={`h-5 w-5 text-muted-foreground transition-transform shrink-0 ml-2 ${
                        isSelected ? 'rotate-90' : ''
                      }`}
                    />
                  </div>

                  <Progress value={percentage} className="h-2 mt-3" />

                  {/* Detalle de clientes expandido */}
                  {isSelected && (
                    <div
                      className="mt-4 pt-4 border-t border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ClientListDialog
                        clients={data.clients}
                        thresholdName={data.threshold?.name}
                      />
                    </div>
                  )}
                </div>
              )
            })}

            {/* Clientes sin asignar */}
            {unassignedCount > 0 && (
              <div className="p-4 border border-destructive/50 bg-destructive/5 lg:col-span-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-sm">
                      Sin umbral asignado
                    </span>
                  </div>
                  <Badge variant="destructive">{unassignedCount}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Estos clientes usarán el template por defecto de la campaña
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Indicador de completitud */}
      {hasAllThresholds && (
        <Alert className="border-green-500/50 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">
            Configuración completa
          </AlertTitle>
          <AlertDescription className="text-green-700">
            Todos los clientes tienen un umbral y plantilla asignado según sus
            días de mora.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface ClientListDialogProps {
  clients: GroupedClient[]
  thresholdName?: string
}

function ClientListDialog({ clients, thresholdName }: ClientListDialogProps) {
  const [open, setOpen] = useState(false)

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleOpenDialog}
        type="button"
      >
        <Users className="h-4 w-4 mr-2" />
        Ver {clients.length} clientes
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>Clientes en: {thresholdName}</DialogTitle>
            <DialogDescription>
              Lista de clientes que serán notificados con este umbral
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 mt-4 space-y-2">
            {clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay clientes para mostrar
              </div>
            ) : (
              clients.map((client) => (
                <div
                  key={client.nit}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {client.customer?.company_name || `NIT: ${client.nit}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {client.invoices.length} factura
                      {client.invoices.length !== 1 ? 's' : ''} • NIT:{' '}
                      {client.nit}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <p className="font-medium">
                        ${client.total.total_amount_due.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {client.total.total_days_overdue} días mora
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Total: {clients.length} cliente{clients.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={() => setOpen(false)} type="button">
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
