'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { ImportProgress } from '@/lib/services/data-templates/generic-import-service'
import Loading from './loading'

interface ImportProgressProps {
  progress: ImportProgress | null
  onCancel?: () => void
  showCancelButton?: boolean
}

export function ImportProgressComponent({
  progress,
  onCancel,
  showCancelButton = false,
}: ImportProgressProps) {
  if (!progress) {
    return null
  }

  const progressPercentage =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'idle':
        return <Loading />
      case 'processing':
        return <Loading />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-secondary" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = () => {
    switch (progress.status) {
      case 'completed':
        return 'text-secondary'
      case 'error':
        return 'text-red-700'
      case 'processing':
        return 'text-blue-700'
      default:
        return 'text-gray-700'
    }
  }

  const formatDuration = (startTime: number, endTime?: number) => {
    const duration = (endTime || Date.now()) - startTime
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      {/* Header con estado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className={`font-medium ${getStatusColor()}`}>
            {progress.status === 'idle' && 'Preparando importación...'}
            {progress.status === 'processing' && 'Importando datos...'}
            {progress.status === 'completed' && 'Importación completada'}
            {progress.status === 'error' && 'Error en la importación'}
          </h3>
        </div>

        {showCancelButton && progress.status === 'processing' && onCancel && (
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Barra de progreso */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{progress.message}</span>
          <span>
            {progress.current} de {progress.total} ({progressPercentage}%)
          </span>
        </div>

        <Progress value={progressPercentage} className="h-2" />

        {/* Información adicional */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>
            Duración: {formatDuration(progress.startTime, progress.endTime)}
          </span>
          {progress.status === 'completed' && (
            <span className="text-secondary">
              ✓ {progress.current} elementos procesados
            </span>
          )}
        </div>
      </div>

      {/* Errores */}
      {progress.errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            <div className="font-medium mb-1">Errores encontrados:</div>
            <ul className="list-disc list-inside space-y-1">
              {progress.errors.slice(0, 5).map((error, index) => (
                <li key={index} className="text-sm">
                  {error}
                </li>
              ))}
              {progress.errors.length > 5 && (
                <li className="text-sm">
                  ... y {progress.errors.length - 5} errores más
                </li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Mensaje de éxito */}
      {progress.status === 'completed' && progress.errors.length === 0 && (
        <Alert className="border-primary bg-primary/10 ">
          <CheckCircle className="h-4 w-4 text-primary-foreground" />
          <AlertDescription>
            <div className="font-medium">¡Importación exitosa!</div>
            <div className="text-sm mt-1">
              Se procesaron {progress.current} elementos correctamente en{' '}
              {formatDuration(progress.startTime, progress.endTime)}.
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export default ImportProgressComponent
