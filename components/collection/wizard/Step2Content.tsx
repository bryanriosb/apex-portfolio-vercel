'use client'

import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { AttachmentManager } from '@/components/collection/attachments/AttachmentManager'
import { GroupedClient, EmailConfig, FileData } from './types'
import { ThresholdPreview } from './ThresholdPreview'
import { FileText, CheckCircle2 } from 'lucide-react'
import Loading from '@/components/ui/loading'
import { useWizardThresholdPreview } from '@/hooks/collection/use-wizard-threshold-preview'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'

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
  const { activeBusiness } = useActiveBusinessStore()

  // Usar el hook con Zustand store para evitar recálculos entre pasos
  const {
    previewData,
    unassignedClients,
    unassignedCount,
    totalClients,
    isLoading,
    hasAllThresholds,
  } = useWizardThresholdPreview(
    fileData?.groupedClients || new Map(),
    activeBusiness?.id || ''
  )

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
      {/* Umbrales Preview Componentizado */}
      {fileData?.groupedClients && fileData.groupedClients.size > 0 && (
        <ThresholdPreview clients={fileData.groupedClients} />
      )}

      {/* Adjuntos Globales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Seleccion de Archivo Adjuntos Generales
          </CardTitle>
          <CardDescription>
            Estos adjuntos que se incluirán en todos los correos que se van a
            procesar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttachmentManager
            mode="select"
            selectedIds={config.attachmentIds}
            onSelectionChange={(ids: string[]) =>
              onChange((prev) => ({ ...prev, attachmentIds: ids }))
            }
          />
        </CardContent>
      </Card>

      {/* Resumen */}
      {previewData.length > 0 && (
        <div className="bg-muted/50 p-4  border">
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
