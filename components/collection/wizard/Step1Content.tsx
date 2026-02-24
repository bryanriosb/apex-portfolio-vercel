'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  Download,
  Loader2,
  BrushCleaning,
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { fetchCustomersByNitsAction } from '@/lib/actions/collection/wizard'
import { getCollectionConfigAction } from '@/lib/actions/collection/config'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { CampaignInfoSidebar } from './CampaignInfoSidebar'
import { FileData, TEMPLATE_DATA } from './types'

interface Step1ContentProps {
  fileData: FileData | null
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef: React.RefObject<HTMLInputElement>
  activeBusinessId?: string
  onDataUpdate: (data: FileData | null) => void
  campaignName: string
  campaignDescription: string
  onCampaignNameChange: (value: string) => void
  onCampaignDescriptionChange: (value: string) => void
}

export function Step1Content({
  fileData,
  onFileSelect,
  fileInputRef,
  activeBusinessId,
  onDataUpdate,
  campaignName,
  campaignDescription,
  onCampaignNameChange,
  onCampaignDescriptionChange,
}: Step1ContentProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const { activeBusiness } = useActiveBusinessStore()

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet(TEMPLATE_DATA)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla de Cobros')
    XLSX.writeFile(workbook, 'plantilla_cobros.xlsx')
    toast.success('Plantilla descargada correctamente')
  }

  const processCustomers = async () => {
    if (!fileData || !activeBusinessId || fileData.groupedClients.size === 0)
      return

    setIsProcessing(true)
    setProcessingProgress(10)

    try {
      const nits = Array.from(fileData.groupedClients.keys())
      const result = await fetchCustomersByNitsAction(activeBusinessId, nits)

      if (result.success) {
        const updatedGroupedClients = new Map(fileData.groupedClients)
        let foundCount = 0

        updatedGroupedClients.forEach((client, nit) => {
          const customer = result.data.get(nit)
          if (customer) {
            client.customer = customer
            client.status = 'found'
            foundCount++
          } else {
            client.status = 'not_found'
          }
        })

        onDataUpdate({
          ...fileData,
          groupedClients: updatedGroupedClients,
        })

        toast.success(
          `Datos de contacto sincronizados: ${foundCount} encontrados de ${nits.length}`
        )
      } else {
        toast.error('Error al obtener datos de clientes: ' + result.error)
      }
    } catch (error) {
      console.error('Processing error:', error)
      toast.error('Error durante el procesamiento de clientes')
    } finally {
      setProcessingProgress(100)
      setTimeout(() => setIsProcessing(false), 500)
    }
  }

  // Auto-process when file is loaded and valid
  useEffect(() => {
    if (fileData?.valid && !isProcessing && fileData.groupedClients.size > 0) {
      const hasPending = Array.from(fileData.groupedClients.values()).some(
        (c) => c.status === 'pending'
      )
      if (hasPending) {
        processCustomers()
      }
    }
  }, [fileData?.valid])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main content area - file upload */}
      <div className="lg:col-span-2 space-y-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onFileSelect}
          className="hidden"
        />

        {/* Download Template Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar Plantilla
          </Button>
        </div>

        {/* File Upload Area */}
        <div
          className="border-2 border-dashed p-12 text-center transition-colors cursor-pointer hover:border-primary"
          onClick={() => fileInputRef.current?.click()}
        >
          {fileData ? (
            <div className="space-y-3">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-primary" />
              <div>
                <p className="text-lg font-medium">{fileData.fileName}</p>
                <p className="text-sm text-muted-foreground">
                  {fileData.groupedClients.size} clientes identificados
                </p>
              </div>
              {fileData.valid ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Formato válido</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Faltan columnas requeridas</span>
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm">
                  Cambiar Archivo
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDataUpdate(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <BrushCleaning />
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Arrastra tu archivo aquí</p>
              <p className="text-sm text-muted-foreground mb-4">
                o haz clic para seleccionar un archivo CSV o Excel
              </p>
              <Button variant="outline">Seleccionar Archivo</Button>
            </>
          )}
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Obteniendo información de contacto...
              </span>
              <span>{processingProgress}%</span>
            </div>
            <Progress value={processingProgress} className="h-2" />
          </div>
        )}

        {/* Missing Columns Error */}
        {fileData && !fileData.valid && (
          <div className="bg-red-50 border border-red-200 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Columnas faltantes:</p>
                <p className="text-sm text-red-700">
                  {fileData.missingColumns.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Processing Summary */}
        {fileData && fileData.valid && !isProcessing && (
          <div className="border p-4">
            <h4 className="font-medium mb-4 text-muted-foreground flex justify-between items-center">
              <span>Resumen de Procesamiento</span>
              <div className="flex gap-4 text-sm">
                <span className="text-primary flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {Array.from(fileData.groupedClients.values()).filter(
                    (c) => c.status === 'found'
                  ).length}{' '}
                  Encontrados
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {Array.from(fileData.groupedClients.values()).filter(
                    (c) => c.status === 'not_found'
                  ).length}{' '}
                  Sin Contacto
                </span>
              </div>
            </h4>

            <div className="max-h-[300px] overflow-y-auto pr-2">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">NIT</th>
                    <th className="text-left p-2 font-medium">Cliente (DB)</th>
                    <th className="text-center p-2 font-medium">Facturas</th>
                    <th className="text-right p-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(fileData.groupedClients.values())
                    .slice(0, 50)
                    .map((client, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 font-mono text-xs">{client.nit}</td>
                        <td className="p-2">
                          {client.customer ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {client.customer.full_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {client.customer.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">
                              No encontrado en DB
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <span className="bg-secondary px-2 py-0.5 rounded-full text-xs">
                            {client.invoices.length}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          {client.status === 'found' ? (
                            <span className="text-primary text-xs font-medium">Listo</span>
                          ) : (
                            <span className="text-muted-foreground text-xs font-medium">Faltan datos</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {fileData.groupedClients.size > 50 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Mostrando 50 de {fileData.groupedClients.size} registros...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar - Campaign Info */}
      <div className="lg:col-span-1">
        <CampaignInfoSidebar
          campaignName={campaignName}
          campaignDescription={campaignDescription}
          onCampaignNameChange={onCampaignNameChange}
          onCampaignDescriptionChange={onCampaignDescriptionChange}
        />
      </div>
    </div>
  )
}
