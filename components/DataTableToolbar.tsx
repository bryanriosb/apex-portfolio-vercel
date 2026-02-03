'use client'

import { Table } from '@tanstack/react-table'
import { FunnelX, Trash2, RefreshCcw } from 'lucide-react'
import { Input } from './ui/input'
import { DataTableFacetedFilter } from './DataTableFacetedFilter'
import { Button } from './ui/button'
import { DataTableViewOptions } from './DataTableViewOptions'
import { SimpleExportButton } from './SimpleExportButton'
import React, { useState, useEffect } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'

interface FilterConfig {
  column: string
  title: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

interface SearchConfig {
  column: string
  placeholder: string
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  filters?: FilterConfig[]
  searchConfig?: SearchConfig
  selectedCount?: number
  onDeleteSelected?: () => Promise<void>
  exportConfig?: {
    enabled: boolean
    tableName: string
    businessId?: string
    onExport: (params: {
      format: 'csv' | 'excel'
      selectedColumns: string[]
      dateRange?: { start_date: string; end_date: string }
    }) => Promise<{
      success: boolean
      data?: string
      filename?: string
      error?: string
    }>
  }
  onRefresh?: () => Promise<void>
  refreshKey?: string
}

// Hook personalizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function DataTableToolbar<TData>({
  table,
  filters,
  searchConfig,
  selectedCount = 0,
  onDeleteSelected,
  exportConfig,
  onRefresh,
  refreshKey,
}: DataTableToolbarProps<TData>) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  // Obtener el valor actual del filtro de la tabla
  const currentFilterValue = searchConfig
    ? (table.getColumn(searchConfig.column)?.getFilterValue() as string) ?? ''
    : ''

  const [searchValue, setSearchValue] = useState(currentFilterValue)
  const debouncedSearchValue = useDebounce(searchValue, 300) // 300ms debounce
  const isFiltered =
    table.getState().columnFilters.length > 0 || searchValue.length > 0

  useEffect(() => {
    if (searchConfig) {
      const column = table.getColumn(searchConfig.column)
      if (column) {
        column.setFilterValue(debouncedSearchValue || undefined)
      }
    }
  }, [debouncedSearchValue, searchConfig, table])

  const handleDeleteSelected = async () => {
    if (!onDeleteSelected) return
    setIsDeleting(true)
    try {
      await onDeleteSelected()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRefresh = async () => {
    if (!onRefresh) return
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  // Sincronizar el estado local con el filtro de la tabla cuando cambie externamente
  useEffect(() => {
    setSearchValue(currentFilterValue)
  }, [currentFilterValue])

  return (
    <div className="flex  items-center justify-between">
      <div className="flex flex-wrap md:flex-nowrap gap-2 items-center space-x-2">
        {searchConfig && (
          <Input
            placeholder={searchConfig.placeholder}
            value={searchValue}
            onChange={(event) => {
              const newValue = event.target.value
              setSearchValue(newValue)
            }}
            className="h-8 w-[200px] lg:w-[250px]"
          />
        )}

        {filters?.map((filter) => {
          const column = table.getColumn(filter.column)
          return column ? (
            <DataTableFacetedFilter
              key={filter.column}
              column={column}
              title={filter.title}
              options={filter.options}
            />
          ) : null
        })}

        {isFiltered && (
          <Button
            variant="outline"
            onClick={() => {
              table.resetColumnFilters()
              setSearchValue('')
              if (searchConfig) {
                const column = table.getColumn(searchConfig.column)
                column?.setFilterValue(undefined)
              }
            }}
            className="h-8 px-2 border-dashed border-destructive"
          >
            <FunnelX className="text-destructive" size={20} />
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {selectedCount > 0 && onDeleteSelected && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="h-8 border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        )}
        {exportConfig?.enabled && (
          <SimpleExportButton
            tableName={exportConfig.tableName}
            columns={table
              .getAllColumns()
              .filter(
                (col) =>
                  typeof col.accessorFn !== 'undefined' && col.getCanHide()
              )}
            businessId={exportConfig.businessId}
            currentFilters={Object.fromEntries(
              table
                .getState()
                .columnFilters.map((filter) => [filter.id, filter.value])
            )}
            searchQuery={
              searchConfig
                ? (table
                    .getColumn(searchConfig.column)
                    ?.getFilterValue() as string) || ''
                : ''
            }
            filterConfigs={filters}
            onExport={exportConfig.onExport}
          />
        )}
        {onRefresh && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8"
                >
                  <RefreshCcw
                    className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Actualizar datos</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  )
}
