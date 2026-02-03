'use client'

import React, { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { Calendar } from './ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils/index'
import { toast } from 'sonner'

interface FilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

interface FilterConfig {
  column: string
  title: string
  options: FilterOption[]
}

interface SimpleExportButtonProps {
  tableName: string
  columns: { id: string; header?: string | React.ReactNode }[]
  businessId?: string
  currentFilters: Record<string, any>
  searchQuery?: string
  disabled?: boolean
  filterConfigs?: FilterConfig[]
  onExport: (params: {
    format: 'csv' | 'excel'
    selectedColumns: string[]
    dateRange?: { start_date: string; end_date: string }
    filters?: Record<string, string[]>
  }) => Promise<{
    success: boolean
    data?: string
    filename?: string
    error?: string
  }>
}

export function SimpleExportButton({
  tableName,
  columns,
  businessId,
  currentFilters,
  searchQuery,
  disabled = false,
  filterConfigs,
  onExport,
}: SimpleExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Limpiar estado cuando se cierra el modal
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      // Reset al cerrar
      setCustomDateRange({ from: undefined, to: undefined })
      setExportFilters({})
      setSelectedColumns([])
      setExportAll(true)
      setSelectedFormat('csv')
    }
  }
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'excel'>('csv')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [exportAll, setExportAll] = useState(true)
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined
    to: Date | undefined
  }>({ from: undefined, to: undefined })
  const [showDatePicker, setShowDatePicker] = useState(false)
  // Estado para filtros seleccionados en el modal de exportación
  const [exportFilters, setExportFilters] = useState<Record<string, string[]>>(
    () => {
      // Inicializar con los filtros actuales de la tabla
      const initialFilters: Record<string, string[]> = {}
      Object.entries(currentFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          initialFilters[key] = value
        } else if (value) {
          initialFilters[key] = [String(value)]
        }
      })
      return initialFilters
    }
  )

  const handleExport = async () => {
    setIsExporting(true)
    setProgress(10)

    try {
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      const finalColumns = exportAll
        ? columns.map((col) => col.id)
        : selectedColumns

      const finalDateRange =
        customDateRange.from && customDateRange.to
          ? {
              start_date: customDateRange.from.toISOString().split('T')[0],
              end_date: customDateRange.to.toISOString().split('T')[0],
            }
          : undefined

      // Solo incluir filtros que tengan valores seleccionados
      const activeFilters = Object.fromEntries(
        Object.entries(exportFilters).filter(([_, values]) => values.length > 0)
      )

      const result = await onExport({
        format: selectedFormat,
        selectedColumns: finalColumns,
        dateRange: finalDateRange,
        filters:
          Object.keys(activeFilters).length > 0 ? activeFilters : undefined,
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (result.success && result.data && result.filename) {
        // Descargar archivo
        const blob = new Blob([result.data], {
          type:
            selectedFormat === 'csv'
              ? 'text/csv;charset=utf-8;'
              : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })

        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', result.filename)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        URL.revokeObjectURL(url)

        toast.success(`Exportación completada: ${result.filename}`)
        setIsOpen(false)
      } else {
        toast.error(result.error || 'Error al exportar los datos')
      }
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Error al exportar los datos')
    } finally {
      setIsExporting(false)
      setProgress(0)
    }
  }

  const handleColumnChange = (columnId: string, checked: boolean) => {
    setSelectedColumns((prev) =>
      checked ? [...prev, columnId] : prev.filter((id) => id !== columnId)
    )
  }

  const handleFilterChange = (
    column: string,
    value: string,
    checked: boolean
  ) => {
    setExportFilters((prev) => {
      const currentValues = prev[column] || []
      const newValues = checked
        ? [...currentValues, value]
        : currentValues.filter((v) => v !== value)

      return {
        ...prev,
        [column]: newValues,
      }
    })
  }

  const clearAllFilters = () => {
    setExportFilters({})
  }

  const getActiveFiltersCount = () => {
    return Object.values(exportFilters).reduce(
      (count, values) => count + values.length,
      0
    )
  }

  const toggleExportAll = () => {
    setExportAll(!exportAll)
    if (exportAll) {
      setSelectedColumns([])
    } else {
      setSelectedColumns(columns.map((col) => col.id))
    }
  }

  // Obtener nombre legible de la columna
  const getColumnName = (column: {
    id: string
    header?: string | React.ReactNode
  }) => {
    if (typeof column.header === 'string') {
      return column.header
    }
    return column.id.charAt(0).toUpperCase() + column.id.slice(1)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="h-8">
          <FileDown className="mr-2 h-4 w-4" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Exportar Datos</DialogTitle>
          <DialogDescription>
            Selecciona el formato y las columnas que quieres exportar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Formato de exportación */}
          <div className="space-y-2">
            <Label htmlFor="format">Formato</Label>
            <Select
              value={selectedFormat}
              onValueChange={(value: 'csv' | 'excel') =>
                setSelectedFormat(value)
              }
              disabled={isExporting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un formato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selector de rango de fechas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Rango de fechas (opcional)</Label>
              {(customDateRange.from || customDateRange.to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() =>
                    setCustomDateRange({ from: undefined, to: undefined })
                  }
                  disabled={isExporting}
                >
                  Limpiar
                </Button>
              )}
            </div>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !customDateRange.from && 'text-muted-foreground'
                  )}
                  disabled={isExporting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {customDateRange.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, 'dd/MM/yy', {
                            locale: es,
                          })}{' '}
                          -{' '}
                          {format(customDateRange.to, 'dd/MM/yy', {
                            locale: es,
                          })}
                        </>
                      ) : (
                        format(customDateRange.from, 'dd/MM/yy', { locale: es })
                      )
                    ) : (
                      'Selecciona un rango de fechas'
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange.from || new Date()}
                  selected={{
                    from: customDateRange.from,
                    to: customDateRange.to,
                  }}
                  onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                    if (range) {
                      setCustomDateRange({
                        from: range.from,
                        to: range.to,
                      })
                    }
                  }}
                  numberOfMonths={2}
                  locale={es}
                  disabled={{ after: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Filtros de datos */}
          {filterConfigs && filterConfigs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Filtrar datos a exportar</Label>
                {getActiveFiltersCount() > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    disabled={isExporting}
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Limpiar filtros ({getActiveFiltersCount()})
                  </Button>
                )}
              </div>
              <div className="space-y-4 border rounded-md p-3 max-h-48 overflow-y-auto">
                {filterConfigs.map((filter) => (
                  <div key={filter.column} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {filter.title}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {filter.options.map((option) => {
                        const isChecked =
                          exportFilters[filter.column]?.includes(
                            option.value
                          ) || false
                        return (
                          <div
                            key={option.value}
                            className={cn(
                              'flex items-center gap-1.5 px-2 py-1 rounded-md border cursor-pointer transition-colors text-sm',
                              isChecked
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'hover:bg-muted'
                            )}
                            onClick={() =>
                              !isExporting &&
                              handleFilterChange(
                                filter.column,
                                option.value,
                                !isChecked
                              )
                            }
                          >
                            {option.icon && <option.icon className="h-3 w-3" />}
                            <span>{option.label}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opciones de columnas */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="export-all"
                checked={exportAll}
                onCheckedChange={toggleExportAll}
                disabled={isExporting}
              />
              <Label htmlFor="export-all" className="font-medium">
                Exportar todas las columnas
              </Label>
            </div>

            {!exportAll && (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                <p className="text-sm text-muted-foreground mb-2">
                  Selecciona las columnas:
                </p>
                {columns.map((column) => (
                  <div key={column.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={column.id}
                      checked={selectedColumns.includes(column.id)}
                      onCheckedChange={(checked) =>
                        handleColumnChange(column.id, !!checked)
                      }
                      disabled={isExporting}
                    />
                    <Label htmlFor={column.id} className="text-sm">
                      {getColumnName(column)}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumen de filtros activos */}
          {(getActiveFiltersCount() > 0 ||
            searchQuery ||
            customDateRange.from ||
            customDateRange.to) && (
            <div className="space-y-2">
              <Label className="font-medium">Filtros que se aplicarán:</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                {searchQuery && <p>• Búsqueda: &quot;{searchQuery}&quot;</p>}
                {customDateRange.from && customDateRange.to && (
                  <p>
                    • Rango fechas:{' '}
                    {format(customDateRange.from, 'dd/MM/yy', { locale: es })} -{' '}
                    {format(customDateRange.to, 'dd/MM/yy', { locale: es })}
                  </p>
                )}
                {filterConfigs &&
                  Object.entries(exportFilters).map(([column, values]) => {
                    if (values.length === 0) return null
                    const filterConfig = filterConfigs.find(
                      (f) => f.column === column
                    )
                    if (!filterConfig) return null
                    const labels = values.map(
                      (v) =>
                        filterConfig.options.find((o) => o.value === v)
                          ?.label || v
                    )
                    return (
                      <p key={column}>
                        • {filterConfig.title}: {labels.join(', ')}
                      </p>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Barra de progreso */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exportando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleExport}
            disabled={
              isExporting || (!exportAll && selectedColumns.length === 0)
            }
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exportando...
              </>
            ) : (
              'Exportar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
