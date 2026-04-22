'use client'

import { Button } from '@/components/ui/button'
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Hash,
  Building2,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ImportResult } from './types'

interface ResultStepProps {
  result: ImportResult | null
  onNewImport: () => void
  onViewTransactions: () => void
}

export function ResultStep({
  result,
  onNewImport,
  onViewTransactions,
}: ResultStepProps) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No hay resultado de importación
      </div>
    )
  }

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div className="border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-4">
            <XCircle className="h-8 w-8 text-red-600 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                Error en la Importación
              </h3>
              <p className="text-sm text-red-700 mt-2">
                No se pudo completar la importación de transacciones.
              </p>
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-4 space-y-1">
                  {result.errors.map((error, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-red-700 flex items-start gap-2"
                    >
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      {error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <Button onClick={onNewImport} variant="outline">
            Intentar de Nuevo
          </Button>
        </div>
      </div>
    )
  }

  const stats = result.stats!
  const identificationRate = stats.identification_rate
  const isHighRate = identificationRate >= 70
  const isMediumRate = identificationRate >= 50 && identificationRate < 70

  return (
    <div className="space-y-6">
      <div className="border border-green-200 bg-green-50 p-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="h-8 w-8 text-green-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-green-900">
              Importación Completada
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Se procesaron {stats.total} transacciones exitosamente.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>

        <div className="border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-green-600" />
            <p className="text-xs text-muted-foreground">Identificadas</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {stats.identified}
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {identificationRate}% del total
          </p>
        </div>

        <div className="border p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-muted-foreground">Sin Match</p>
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {stats.unidentified}
          </p>
        </div>

        <div className="border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-4 w-4 text-red-600" />
            <p className="text-xs text-muted-foreground">Sin NIT</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats.no_nit}</p>
        </div>
      </div>

      {stats.duplicates > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-medium text-amber-900">
                {stats.duplicates} transacciones duplicadas detectadas
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Estas transacciones ya existen en el sistema y no fueron
                importadas nuevamente.
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className={cn(
          'border p-4',
          isHighRate && 'bg-green-50 border-green-200',
          isMediumRate && 'bg-amber-50 border-amber-200',
          !isHighRate && !isMediumRate && 'bg-red-50 border-red-200'
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-12 w-12 flex items-center justify-center',
                isHighRate && 'bg-green-100',
                isMediumRate && 'bg-amber-100',
                !isHighRate && !isMediumRate && 'bg-red-100'
              )}
            >
              <span
                className={cn(
                  'text-lg font-bold',
                  isHighRate && 'text-green-700',
                  isMediumRate && 'text-amber-700',
                  !isHighRate && !isMediumRate && 'text-red-700'
                )}
              >
                {identificationRate}%
              </span>
            </div>
            <div>
              <p className="font-medium">Tasa de Identificación</p>
              <p
                className={cn(
                  'text-sm',
                  isHighRate && 'text-green-700',
                  isMediumRate && 'text-amber-700',
                  !isHighRate && !isMediumRate && 'text-red-700'
                )}
              >
                {isHighRate &&
                  'Excelente: La mayoría de transacciones tienen cliente asociado'}
                {isMediumRate &&
                  'Regular: Algunas transacciones requieren revisión manual'}
                {!isHighRate &&
                  !isMediumRate &&
                  'Baja: Muchas transacciones sin identificar'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {result.errors && result.errors.length > 0 && (
        <div className="border p-4">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            Advertencias durante la importación
          </h4>
          <ul className="space-y-1 max-h-[150px] overflow-y-auto">
            {result.errors.slice(0, 10).map((error, idx) => (
              <li key={idx} className="text-xs text-muted-foreground">
                {error}
              </li>
            ))}
            {result.errors.length > 10 && (
              <li className="text-xs text-muted-foreground italic">
                ...y {result.errors.length - 10} más
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={onNewImport}>
          Nueva Importación
        </Button>
        <Button onClick={onViewTransactions}>
          Ver Transacciones
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
