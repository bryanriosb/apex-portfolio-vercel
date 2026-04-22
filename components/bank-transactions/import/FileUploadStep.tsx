'use client'

import { useState } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  BrushCleaning,
  CheckCircle,
  AlertTriangle,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  parseBankExtractFile,
  type DateFormatConfig,
  type BankSheetData,
} from '@/lib/services/bank-transactions/import-service'
import type { ImportFileData, BankPreviewSummary } from './types'

interface FileUploadStepProps {
  fileData: ImportFileData | null
  onFileDataUpdate: (data: ImportFileData | null) => void
  activeBusinessId: string
  configValid: boolean
  dateFormat: string | null
}

interface ProcessingStatus {
  progress: number
  message: string
}

export function FileUploadStep({
  fileData,
  onFileDataUpdate,
  activeBusinessId,
  configValid,
  dateFormat,
}: FileUploadStepProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    progress: 0,
    message: '',
  })

  const processFile = async (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls'].includes(fileExtension || '')) {
      toast.error('Formato de archivo no válido. Use Excel (.xlsx, .xls)')
      return
    }

    flushSync(() => {
      setIsProcessing(true)
      setProcessingStatus({ progress: 0, message: 'Preparando...' })
    })

    // Allow the UI to render the initial state before heavy processing
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)))

    try {
      const dateFormatConfig: DateFormatConfig = {
        inputFormat: dateFormat || 'DD-MM-AAAA',
        outputFormat: 'AAAA-MM-DD',
      }

      const result = await parseBankExtractFile(
        file,
        dateFormatConfig,
        (progress, message) => {
          flushSync(() => {
            setProcessingStatus({
              progress,
              message: message || 'Procesando...',
            })
          })
        }
      )

      if (result.totalErrors.length > 0 && result.totalTransactions === 0) {
        toast.error(result.totalErrors[0])
        onFileDataUpdate(null)
      } else {
        onFileDataUpdate({
          fileName: result.fileName,
          sheets: result.sheets,
          totalTransactions: result.totalTransactions,
          errors: result.totalErrors,
          dateFormat: dateFormat || '',
        })

        if (result.totalTransactions > 0) {
          toast.success(
            `${result.totalTransactions} transacciones detectadas en ${result.sheets.length} banco(s)`
          )
        }
      }

      setProcessingStatus({ progress: 100, message: 'Completado' })
    } catch (error: any) {
      console.error('Error processing file:', error)
      toast.error('Error al procesar el archivo: ' + error.message)
      onFileDataUpdate(null)
    } finally {
      setTimeout(() => {
        setIsProcessing(false)
        setProcessingStatus({ progress: 0, message: '' })
      }, 500)
    }
  }

  const handleNativeFileInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const triggerFileInput = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls'
    input.onchange = handleNativeFileInput
    input.click()
  }

  const clearFile = () => {
    onFileDataUpdate(null)
    setProcessingStatus({ progress: 0, message: '' })
  }

  const getBankSummaries = (): BankPreviewSummary[] => {
    if (!fileData) return []

    return fileData.sheets.map((sheet) => {
      const validRecords = sheet.transactions.length
      const errorCount = sheet.errors.length
      const withNitCount = sheet.transactions.filter(
        (t) => t.customer_nit
      ).length
      const noNitCount = sheet.transactions.filter(
        (t) => !t.customer_nit
      ).length
      const totalAmount = sheet.transactions.reduce(
        (sum, t) => sum + t.amount,
        0
      )

      return {
        bankName: sheet.bankName,
        sheetName: sheet.sheetName,
        totalRecords: sheet.rowCount,
        validRecords,
        errorCount,
        withNitCount,
        noNitCount,
        totalAmount,
      }
    })
  }

  return (
    <div className="space-y-6">
      {!configValid ? (
        <div className="border-2 border-dashed border-amber-300 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-amber-900">
                Configuración Requerida
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                Debe configurar el formato de fecha en{' '}
                <a
                  href="/admin/settings/collection?tab=general"
                  className="underline font-medium hover:text-amber-900"
                >
                  Configuración de Cobros
                </a>{' '}
                antes de importar transacciones.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() =>
                  (window.location.href =
                    '/admin/settings/collection?tab=general')
                }
              >
                Ir a Configuración
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>
                Formato de fecha configurado: <strong>{dateFormat}</strong>
              </span>
            </div>
          </div>

          <div
            className={cn(
              'border-2 border-dashed p-4 transition-colors cursor-pointer',
              fileData ? 'border-primary bg-primary/5' : 'hover:border-primary'
            )}
            onClick={() => {
              if (!isProcessing) {
                triggerFileInput()
              }
            }}
          >
            {fileData ? (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-base font-medium truncate">
                      {fileData.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fileData.totalTransactions} transacciones •{' '}
                      {fileData.sheets.length} banco(s)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      triggerFileInput()
                    }}
                  >
                    Cambiar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive px-2"
                    onClick={(e) => {
                      e.stopPropagation()
                      clearFile()
                    }}
                  >
                    <BrushCleaning className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-base font-medium">Seleccionar archivo</p>
                    <p className="text-xs text-muted-foreground">
                      Excel (.xlsx, .xls) con múltiples hojas por banco
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Examinar
                </Button>
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {processingStatus.message || 'Procesando archivo...'}
                </span>
                <span className="font-mono">{processingStatus.progress}%</span>
              </div>
              <Progress value={processingStatus.progress} className="h-2" />
            </div>
          )}

          {fileData && fileData.errors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-amber-900">Advertencias</p>
                  <ul className="text-sm text-amber-700 mt-1 space-y-1">
                    {fileData.errors.slice(0, 5).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                    {fileData.errors.length > 5 && (
                      <li className="text-muted-foreground">
                        ...y {fileData.errors.length - 5} más
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {fileData && fileData.sheets.length > 0 && !isProcessing && (
            <div className="border p-4">
              <h4 className="font-medium mb-4 text-muted-foreground text-sm">
                Bancos Detectados
              </h4>
              <div className="space-y-3">
                {getBankSummaries().map((bank, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-secondary/30 border"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{bank.bankName}</p>
                        <p className="text-xs text-muted-foreground">
                          {bank.validRecords} transacciones válidas
                          {bank.errorCount > 0 && (
                            <span className="text-amber-600 ml-2">
                              ({bank.errorCount} con errores)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-primary font-mono">
                        ${bank.totalAmount.toLocaleString('es-CO')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bank.noNitCount} sin NIT
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
