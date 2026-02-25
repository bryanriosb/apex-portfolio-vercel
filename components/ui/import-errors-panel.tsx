'use client'

import { useState } from 'react'
import { AlertTriangle, XCircle, ChevronDown, ChevronUp, AlertCircle, FileWarning, Copy } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ImportError {
  message: string
  type?: 'error' | 'warning'
  row?: number
}

interface ImportErrorsPanelProps {
  errors: string[]
  maxHeight?: string
  className?: string
}

export function ImportErrorsPanel({ 
  errors, 
  maxHeight = "200px",
  className = ""
}: ImportErrorsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showAll, setShowAll] = useState(false)

  if (!errors || errors.length === 0) {
    return null
  }

  // Parsear errores para identificar tipos
  const parsedErrors = errors.map((error): ImportError => {
    const lowerError = error.toLowerCase()
    const isWarning = lowerError.includes('duplicado') || 
                      lowerError.includes('omitidos') ||
                      lowerError.includes('advertencia') ||
                      lowerError.includes('warning') ||
                      lowerError.includes('solo se importará')
    
    // Extraer número de fila si existe
    // Patrones: "Fila X:", "Row X:", "fila X", o "en filas: X, Y"
    let row: number | undefined
    const rowMatch = error.match(/(?:Fila|fila|Row|row)\s*(\d+)[:\s]/i)
    if (rowMatch) {
      row = parseInt(rowMatch[1])
    }
    
    return {
      message: error,
      type: isWarning ? 'warning' : 'error',
      row
    }
  })

  const errorCount = parsedErrors.filter(e => e.type === 'error').length
  const warningCount = parsedErrors.filter(e => e.type === 'warning').length

  // Separar mensajes resumen de mensajes detallados
  const summaryErrors = parsedErrors.filter(e => 
    e.message.includes('Se encontraron') || 
    e.message.includes('Se omitieron')
  )
  const detailErrors = parsedErrors.filter(e => 
    !e.message.includes('Se encontraron') && 
    !e.message.includes('Se omitieron')
  )

  // Combinar: primero los resúmenes, luego los detalles
  const orderedErrors = [...summaryErrors, ...detailErrors]
  
  // Limitar visualización inicial
  const displayErrors = showAll ? orderedErrors : orderedErrors.slice(0, 5)
  const hasMore = orderedErrors.length > 5
  const remainingCount = orderedErrors.length - 5

  // Función para copiar todos los errores al portapapeles
  const copyAllErrors = () => {
    const errorText = errors.join('\n')
    navigator.clipboard.writeText(errorText).then(() => {
      // Podríamos mostrar un toast aquí
      console.log('Errores copiados al portapapeles')
    })
  }

  return (
    <div className={`border border-red-200 bg-gradient-to-br from-red-50/80 to-orange-50/50 ${className}`}>
      {/* Header con estadísticas */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-red-200 bg-white/60">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="font-semibold text-red-900">Detalle de Errores</span>
          </div>
          
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <Badge variant="destructive" className="font-medium">
                <XCircle className="h-3 w-3 mr-1" />
                {errorCount} error{errorCount !== 1 ? 'es' : ''}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 font-medium">
                <AlertCircle className="h-3 w-3 mr-1" />
                {warningCount} advertencia{warningCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAllErrors}
            className="h-8 px-2 hover:bg-red-100/50 text-red-700"
            title="Copiar todos los errores"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 w-8 p-0 hover:bg-red-100/50"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-red-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-red-600" />
            )}
          </Button>
        </div>
      </div>

      {/* Contenido con scroll */}
      {isExpanded && (
        <>
          <div style={{ maxHeight, overflow: 'auto' }}>
            <div className="p-4 space-y-2">
              {displayErrors.map((error, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 text-sm border-l-2 ${
                    error.type === 'warning'
                      ? 'bg-amber-50/50 border-amber-400 text-amber-900'
                      : 'bg-red-50/50 border-red-400 text-red-900'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {error.type === 'warning' ? (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {error.row && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-mono ${
                            error.type === 'warning'
                              ? 'border-amber-300 text-amber-700'
                              : 'border-red-300 text-red-700'
                          }`}
                        >
                          <FileWarning className="h-3 w-3 mr-1" />
                          Fila {error.row}
                        </Badge>
                      )}
                      <span className={`font-medium ${
                        error.type === 'warning' ? 'text-amber-800' : 'text-red-800'
                      }`}>
                        {error.type === 'warning' ? 'Advertencia' : 'Error'}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed break-words">
                      {error.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer con controles */}
          {hasMore && (
            <div className="px-4 py-2 border-t border-red-200 bg-white/60 flex justify-center">
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-red-700 hover:text-red-800 hover:bg-red-100/50 rounded-md transition-colors"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Mostrar menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Ver {remainingCount} errores más
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default ImportErrorsPanel
