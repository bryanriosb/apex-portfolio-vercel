'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  Trash2,
  X,
  AlertCircle,
  Info,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import ImportProgressComponent from '@/components/ui/import-progress'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface EntityConfig {
  entityType: 'customers' | 'services' | 'specialists' | 'products' | 'plans'
  displayName: string
  templateDownloadUrl: string
  importAction: (formData: FormData) => Promise<{ sessionId: string; status: string }>
  requiredFields?: string[]
  optionalFields?: string[]
}

interface GenericImportExportButtonsProps {
  config: EntityConfig
  onImportComplete?: () => void
  additionalFormData?: Record<string, string>
}

export function GenericImportExportButtons({
  config,
  onImportComplete,
  additionalFormData = {},
}: GenericImportExportButtonsProps) {
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState<any>(null)
  const [isPolling, setIsPolling] = useState(false)
  const isPollingRef = useRef(false)

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(config.templateDownloadUrl)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.error || 'Error al descargar la plantilla')
        return
      }

      // Obtener el nombre del archivo desde el header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `plantilla-${config.entityType}.xlsx`

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      // Crear blob desde la respuesta y descargar
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Plantilla descargada correctamente')
    } catch (error: any) {
      console.error('Error downloading template:', error)
      toast.error('Error al descargar la plantilla')
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ]

      if (!allowedTypes.includes(file.type)) {
        toast.error('Solo se permiten archivos Excel (.xlsx o .xls)')
        return
      }

      // Validar tamaño (10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error('El archivo no debe superar los 10MB')
        return
      }

      setSelectedFile(file)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Selecciona un archivo primero')
      return
    }

    // Generar session ID único
    const sessionId = `import_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`
    setCurrentSessionId(sessionId)

    try {
      // Crear FormData con archivo y sessionId
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('sessionId', sessionId)

      // Agregar parámetros adicionales al FormData
      Object.entries(additionalFormData).forEach(([key, value]) => {
        formData.append(key, value)
      })

      // Iniciar importación con progreso
      await config.importAction(formData)
    } catch (error: any) {
      console.error('Error starting import:', error)
      toast.error('Error al iniciar la importación')
      setCurrentSessionId(null)
    }
  }

  // Función de polling para obtener progreso
  const pollProgress = useCallback(
    async (sessionId: string) => {
      if (!sessionId || !isPollingRef.current) {
        return
      }

      try {
        const response = await fetch(`/api/import/progress/${sessionId}`)
        if (response.ok) {
          const progressData = await response.json()
          setImportProgress(progressData)

          // Continuar polling si no terminó y aún estamos polling
          if (
            progressData.status !== 'completed' &&
            progressData.status !== 'error' &&
            isPollingRef.current
          ) {
            setTimeout(() => pollProgress(sessionId), 500)
          } else {
            setIsPolling(false)
            isPollingRef.current = false
            // Mostrar resultado final
            if (progressData.status === 'completed') {
              if (progressData.errors.length === 0) {
                toast.success(
                  `Importación completada: ${progressData.current} elementos procesados`
                )
              } else {
                toast.warning(
                  `Importación completada con ${progressData.errors.length} errores`
                )
              }
              onImportComplete?.()
            } else if (progressData.status === 'error') {
              toast.error('Error fatal en la importación')
            }

            // Limpiar estado
            setCurrentSessionId(null)
          }
        } else if (response.status === 404) {
          // Sesión no encontrada, reintentar en 2 segundos
          setTimeout(() => pollProgress(sessionId), 2000)
        } else {
          // Otro error, reintentar en 3 segundos
          setTimeout(() => pollProgress(sessionId), 3000)
        }
      } catch (error) {
        console.error('Polling error:', error)
        // Reintentar en caso de error de red
        setTimeout(() => pollProgress(sessionId), 3000)
      }
    },
    [onImportComplete]
  )

  // Efecto para iniciar polling cuando hay sessionId
  useEffect(() => {
    if (currentSessionId && !isPolling) {
      setIsPolling(true)
      isPollingRef.current = true
      pollProgress(currentSessionId)
    }
  }, [currentSessionId, isPolling, pollProgress])

  const clearFileInput = () => {
    setSelectedFile(null)
    setCurrentSessionId(null)
    setImportProgress(null)
    setIsPolling(false)
    isPollingRef.current = false
    // Reset file input
    const fileInput = document.getElementById(
      'template-file'
    ) as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const handleCloseDialog = () => {
    // Si hay una importación en progreso, cancelarla
    if (currentSessionId && importProgress?.status === 'processing') {
      handleCancelImport()
    }
    setImportDialogOpen(false)
    clearFileInput()
  }

  const handleCancelImport = () => {
    setIsPolling(false)
    isPollingRef.current = false
    
    // Limpiar el progreso de la sesión en el servidor
    if (currentSessionId) {
      // Llamar al endpoint para limpiar la sesión
      fetch(`/api/import/progress/${currentSessionId}`, { method: 'DELETE' })
        .catch(() => {
          // Ignorar errores de cleanup
        })
    }
    
    setCurrentSessionId(null)
    setImportProgress(null)
    toast.info('Importación cancelada')
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Descargar Plantilla
        </Button>

        <Button
          variant="outline"
          onClick={() => setImportDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Importar {config.displayName}
        </Button>
      </div>

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog()
          } else {
            setImportDialogOpen(true)
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar {config.displayName}
            </DialogTitle>
            <DialogDescription>
              Sube una plantilla Excel para crear o actualizar {config.displayName.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 p-1">
            {/* Información de campos requeridos */}
            {config.requiredFields && config.requiredFields.length > 0 && (
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <div className="font-medium mb-1">Columnas obligatorias:</div>
                  <div className="text-sm">
                    {config.requiredFields.join(', ')}
                  </div>
                  {config.optionalFields && config.optionalFields.length > 0 && (
                    <>
                      <div className="font-medium mt-2 mb-1">Columnas opcionales:</div>
                      <div className="text-sm text-blue-700">
                        {config.optionalFields.join(', ')}
                      </div>
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}
            <div>
              <Label
                htmlFor="template-file"
                className="flex items-center justify-center w-full h-32 px-4 py-2 text-center border-2 border-dashed rounded-md cursor-pointer text-muted-foreground hover:border-primary hover:text-primary"
              >
                {selectedFile ? (
                  <div className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>
                      Archivo: {selectedFile.name} (
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8" />
                    <span className="font-bold">Seleccionar archivo</span>
                    <span className="text-xs">
                      O arrástralo y suéltalo aquí
                    </span>
                  </div>
                )}
              </Label>
              <Input
                id="template-file"
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                disabled={!!currentSessionId}
              />
            </div>

            {currentSessionId && !importProgress && (
              <div className="space-y-2 pt-4">
                <h3 className="font-medium">Progreso de Importación</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    Iniciando importación... Esto puede tardar unos segundos.
                  </span>
                </div>
                <Progress value={2} className="h-2 w-full" />
              </div>
            )}

            {importProgress && (
              <div className="space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Progreso de Importación</h3>
                  {importProgress.status === 'processing' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelImport}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancelar importación
                    </Button>
                  )}
                </div>
                <ImportProgressComponent
                  progress={importProgress}
                  showCancelButton={false}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={clearFileInput}
                disabled={!selectedFile || !!currentSessionId}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar
              </Button>

              <Button
                onClick={handleImport}
                disabled={!selectedFile || !!currentSessionId || (importProgress && importProgress.status === 'completed')}
              >
                {!!currentSessionId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (importProgress && importProgress.status === 'completed') ? (
                  `Importación Finalizada`
                ) : (
                  `Importar ${config.displayName}`
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
