'use client'

import React, {
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from 'react'
import { useDataRefreshStore } from '@/lib/store/data-refresh-store'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  RowSelectionState,
} from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    hidden?: boolean
  }
}

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import DataTablePagination from './DataTablePagination'
import { DataTableToolbar } from './DataTableToolbar'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import Loading from './ui/loading'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'

export interface FilterConfig {
  column: string
  title: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export interface SearchConfig {
  column: string
  placeholder: string
  serverField?: string // Campo que se enviará al servidor
}

export interface ExportConfig {
  enabled?: boolean
  tableName?: string // Si no se proporciona, intenta inferirlo del service
  businessId?: string
  dateRange?: {
    start_date: string
    end_date: string
  }
  // Columnas excluidas de la exportación
  excludedColumns?: string[]
  // Formatters personalizados para columnas específicas
  columnFormatters?: Record<string, (value: any, row: any) => string | number>
}

export interface DeleteConfig {
  enabled: boolean
  itemName: string
  onDelete: (ids: string[]) => Promise<void>
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  service?: {
    fetchItems: (params: any) => Promise<any>
  }
  defaultQueryParams?: Record<string, any>
  filters?: FilterConfig[]
  searchConfig?: SearchConfig
  exportConfig?: ExportConfig
  deleteConfig?: DeleteConfig
  data?: TData[]
  pagination?: {
    pageIndex: number
    pageSize: number
    pageCount: number
    total: number
  }
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  onFiltersChange?: (filters: Record<string, any>) => void
  filterState?: any[]
  enableRowSelection?: boolean
  onDeleteSelected?: (ids: string[]) => Promise<void>
  getRowId?: (row: TData) => string
  refreshKey?: string
}

export interface DataTableRef {
  refreshData: () => void
  clearSelection: () => void
  getSelectedRowIds: () => string[]
}

export const DataTable = forwardRef<DataTableRef, DataTableProps<any, any>>(
  function DataTable<TData, TValue>(
    {
      columns,
      service,
      defaultQueryParams,
      filters,
      searchConfig,
      exportConfig,
      deleteConfig,
      data: externalData,
      pagination: externalPagination,
      onPageChange: externalOnPageChange,
      onPageSizeChange: externalOnPageSizeChange,
      onFiltersChange: externalOnFiltersChange,
      filterState: externalFilterState,
      enableRowSelection = false,
      onDeleteSelected,
      getRowId,
      refreshKey,
    }: DataTableProps<TData, TValue>,
    ref: React.Ref<DataTableRef>
  ) {
    const { triggerRefresh } = useDataRefreshStore()
    // Determinar si usar estado interno o externo
    const isAutonomous = !!service

    // Estabilizar defaultQueryParams para evitar recreaciones
    const stableDefaultQueryParams = React.useMemo(
      () => defaultQueryParams || {},
      [defaultQueryParams]
    )

    // Estado interno para manejo autónomo
    const [internalData, setInternalData] = useState<TData[]>([])
    const [internalPagination, setInternalPagination] = useState({
      pageIndex: 0,
      pageSize: 10,
      pageCount: 0,
      total: 0,
    })
    const [internalFilters, setInternalFilters] = useState<Record<string, any>>(
      {}
    )
    const [internalFilterState, setInternalFilterState] = useState<any[]>([])
    const [loading, setLoading] = useState(isAutonomous) // Iniciar loading si es autónomo
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [idsToDelete, setIdsToDelete] = useState<string[]>([])
    const [isDeleting, setIsDeleting] = useState(false)

    const [columnVisibility, setColumnVisibility] = useState<
      Record<string, boolean>
    >(() => {
      // Configurar visibilidad inicial de columnas
      const visibility: Record<string, boolean> = {}
      columns.forEach((column) => {
        if (column.meta?.hidden) {
          // Para columnas con accessorKey
          if ('accessorKey' in column) {
            visibility[column.accessorKey as string] = false
          }
          // Para columnas con id (como las que usan accessorFn)
          else if ('id' in column && column.id) {
            visibility[column.id] = false
          }
        }
      })
      return visibility
    })
    const data = isAutonomous ? internalData : externalData || []
    const pagination = isAutonomous ? internalPagination : externalPagination
    const filterState = isAutonomous
      ? internalFilterState
      : externalFilterState || []

    const selectColumn: ColumnDef<TData, TValue> = useMemo(
      () => ({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Seleccionar todos"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      }),
      []
    )

    const tableColumns = useMemo(() => {
      if (enableRowSelection) {
        return [selectColumn, ...columns]
      }
      return columns
    }, [enableRowSelection, selectColumn, columns])

    // Serializar filtros para uso en dependencias
    const serializedFilters = React.useMemo(
      () => JSON.stringify(internalFilters),
      [internalFilters]
    )

    // Función de exportación que reutiliza el service del DataTable
    const createExportFunction = React.useCallback(
      ({
        service,
        table,
        columns,
        searchConfig,
        stableDefaultQueryParams,
        internalFilters,
        exportConfig,
      }: any) => {
        return async ({
          format,
          selectedColumns,
          dateRange,
          filters,
        }: {
          format: 'csv' | 'excel'
          selectedColumns: string[]
          dateRange?: { start_date: string; end_date: string }
          filters?: Record<string, string[]>
        }) => {
          try {
            if (!service) {
              throw new Error('No hay servicio disponible para exportar')
            }

            // Construir parámetros para obtener todos los datos (hasta 10,000 registros)
            const fetchParams: any = {
              page_size: 10000,
              ...stableDefaultQueryParams,
              ...internalFilters,
            }

            // Agregar rango de fechas si se seleccionó
            if (dateRange) {
              fetchParams.date_from = dateRange.start_date
              fetchParams.date_to = dateRange.end_date
            }

            // Agregar filtros seleccionados en el modal de exportación
            if (filters && Object.keys(filters).length > 0) {
              Object.entries(filters).forEach(([key, values]) => {
                if (values.length > 0) {
                  fetchParams[key] = values
                }
              })
            }

            // Agregar búsqueda si existe
            if (searchConfig) {
              const searchValue = table
                .getColumn(searchConfig.column)
                ?.getFilterValue() as string
              if (searchValue) {
                fetchParams.search = searchValue
              }
            }

            // Usar el mismo service del DataTable
            const response = await service.fetchItems(fetchParams)
            const exportData = response.data || []

            // Construir columnas para exportación basadas en las seleccionadas
            const exportColumns = columns
              .filter((col: any) =>
                selectedColumns.includes(col.id || col.accessorKey)
              )
              .map((col: any) => {
                const key = col.accessorKey || col.id
                return {
                  key,
                  label: typeof col.header === 'string' ? col.header : key,
                }
              })

            // Aplicar formatters del cliente a cada fila
            const processedData = exportData.map((row: any) => {
              return exportColumns.map((col: any) => {
                // Los datos vienen directamente del service, no tienen row.original
                const value = row[col.key]
                const formatter = exportConfig.columnFormatters?.[col.key]
                return formatter ? formatter(value, row) : (value ?? '')
              })
            })

            // Generar contenido CSV/Excel
            const headers = exportColumns.map((col: any) => col.label)
            const content =
              format === 'csv'
                ? arrayToCSV(headers, processedData)
                : arrayToExcel(headers, processedData)

            // Generar nombre de archivo
            const timestamp = new Date().getTime()
            const filename = `export-${exportConfig.tableName}-${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'
              }`

            return {
              success: true,
              data: content,
              filename,
            }
          } catch (error) {
            console.error('Export error:', error)
            return {
              success: false,
              error: 'Error al exportar los datos',
            }
          }
        }
      },
      []
    )

    // Funciones auxiliares para generación de CSV/Excel
    const arrayToCSV = React.useCallback(
      (headers: string[], rows: (string | number)[][]): string => {
        const BOM = '\uFEFF'
        const escapeCSV = (
          value: string | number | null | undefined
        ): string => {
          if (value === null || value === undefined) return ''
          const str = String(value)
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
          }
          return str
        }
        const headerLine = headers.map(escapeCSV).join(',')
        const dataLines = rows.map((row) => row.map(escapeCSV).join(','))
        return BOM + [headerLine, ...dataLines].join('\n')
      },
      []
    )

    const arrayToExcel = React.useCallback(
      (headers: string[], rows: (string | number)[][]): any => {
        const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos')

        // Generar el buffer de Excel
        return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
      },
      []
    )

    // Función para fetch de datos
    const fetchData = useCallback(async () => {
      if (!service) return

      setLoading(true)
      try {
        const filters = JSON.parse(serializedFilters)

        // Convertir filtros a arrays para QueryParser de Fiber v2
        const arrayFilters: Record<string, string[]> = {}
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            arrayFilters[key] = value
          } else if (value) {
            arrayFilters[key] = [String(value)]
          }
        })

        const baseParams = {
          page: internalPagination.pageIndex + 1,
          page_size: internalPagination.pageSize,
        }

        // Combinar parámetros por defecto con filtros
        let queryParams: Record<string, any> = {
          ...baseParams,
          ...stableDefaultQueryParams,
        }

        if (Object.keys(arrayFilters).length > 0) {
          queryParams = { ...queryParams, ...arrayFilters }
        }

        const response = await service.fetchItems(queryParams)
        setInternalData(response.data)
        setInternalPagination((prev) => ({
          ...prev,
          pageCount: response.total_pages,
          total: response.total,
        }))
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }, [
      service,
      internalPagination.pageIndex,
      internalPagination.pageSize,
      serializedFilters,
      stableDefaultQueryParams,
      refreshKey,
      triggerRefresh,
    ])

    // Efecto para escuchar gatillos de refresco externos
    const lastTrigger = useDataRefreshStore(
      (state) => (refreshKey ? state.refreshTriggers[refreshKey] : null)
    )

    useEffect(() => {
      if (isAutonomous && lastTrigger) {
        fetchData()
      }
    }, [lastTrigger, fetchData, isAutonomous])

    // Efectos para fetch automático
    useEffect(() => {
      if (isAutonomous) {
        fetchData()
      }
    }, [fetchData, isAutonomous])

    const clearSelection = useCallback(() => {
      setRowSelection({})
    }, [])

    const getSelectedRowIds = useCallback(() => {
      const selectedRows = Object.keys(rowSelection).filter(
        (key) => rowSelection[key]
      )
      return selectedRows
        .map((index) => {
          const row = data[parseInt(index)]
          if (!row) return null
          if (getRowId) return getRowId(row)
          return (row as any).id
        })
        .filter(Boolean) as string[]
    }, [rowSelection, data, getRowId])

    useImperativeHandle(
      ref,
      () => ({
        refreshData: fetchData,
        clearSelection,
        getSelectedRowIds,
      }),
      [fetchData, clearSelection, getSelectedRowIds]
    )

    const confirmDelete = async () => {
      if (!deleteConfig || idsToDelete.length === 0) return
      
      setIsDeleting(true)
      try {
        await deleteConfig.onDelete(idsToDelete)
        toast.success(`${idsToDelete.length} ${deleteConfig.itemName}(s) eliminado(s) correctamente`)
        clearSelection()
        fetchData()
      } catch (error: any) {
        toast.error(error.message || `No se pudo eliminar el ${deleteConfig.itemName}`)
      } finally {
        setIsDeleting(false)
        setDeleteDialogOpen(false)
        setIdsToDelete([])
      }
    }

    const openDeleteDialog = (ids: string[]) => {
      setIdsToDelete(ids)
      setDeleteDialogOpen(true)
    }

    // Manejadores internos
    const handlePageChange = useCallback(
      (pageIndex: number) => {
        if (isAutonomous) {
          setInternalPagination((prev) => ({ ...prev, pageIndex }))
        } else {
          externalOnPageChange?.(pageIndex)
        }
      },
      [isAutonomous, externalOnPageChange]
    )

    const handlePageSizeChange = useCallback(
      (pageSize: number) => {
        if (isAutonomous) {
          setInternalPagination((prev) => ({ ...prev, pageIndex: 0, pageSize }))
        } else {
          externalOnPageSizeChange?.(pageSize)
        }
      },
      [isAutonomous, externalOnPageSizeChange]
    )

    const handleFiltersChange = useCallback(
      (newFilters: Record<string, any>) => {
        if (isAutonomous) {
          // Mapear nombres de columna a campos del servidor si es necesario
          const mappedFilters: Record<string, any> = {}
          Object.entries(newFilters).forEach(([columnName, value]) => {
            // Si es un filtro de búsqueda, usar el serverField si está definido
            if (
              searchConfig?.column === columnName &&
              searchConfig.serverField
            ) {
              mappedFilters[searchConfig.serverField] = value
            } else {
              mappedFilters[columnName] = value
            }
          })

          const filtersChanged =
            JSON.stringify(internalFilters) !== JSON.stringify(mappedFilters)
          if (filtersChanged) {
            setInternalFilters(mappedFilters)

            const newFilterState = Object.entries(newFilters).map(
              ([id, value]) => ({
                id,
                value,
              })
            )
            setInternalFilterState(newFilterState)

            setInternalPagination((prev) => ({ ...prev, pageIndex: 0 }))
          }
        } else {
          externalOnFiltersChange?.(newFilters)
        }
      },
      [isAutonomous, internalFilters, externalOnFiltersChange, searchConfig]
    )

    // Configurar el callback de filtros
    const handleColumnFiltersChange = React.useCallback(
      (updaterOrValue: any) => {
        const currentFilters =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(filterState || [])
            : updaterOrValue

        const filterObject: Record<string, any> = {}
        currentFilters.forEach((filter: any) => {
          if (filter.value) {
            // Manejar filtros de array (facetados)
            if (Array.isArray(filter.value) && filter.value.length > 0) {
              filterObject[filter.id] = filter.value
            }
            // Manejar filtros de texto (búsqueda)
            else if (
              typeof filter.value === 'string' &&
              filter.value.trim().length > 0
            ) {
              filterObject[filter.id] = filter.value.trim()
            }
          }
        })

        handleFiltersChange(filterObject)
      },
      [filterState, handleFiltersChange]
    )

    const selectedCount = Object.keys(rowSelection).filter(
      (key) => rowSelection[key]
    ).length

    const table = useReactTable({
      data,
      columns: tableColumns,
      getCoreRowModel: getCoreRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getFacetedRowModel: getFacetedRowModel(),
      getFacetedUniqueValues: getFacetedUniqueValues(),
      manualPagination: !!pagination && !externalData,
      manualFiltering: isAutonomous || !!externalOnFiltersChange,
      pageCount: pagination?.pageCount ?? -1,
      onColumnFiltersChange: handleColumnFiltersChange,
      onColumnVisibilityChange: setColumnVisibility,
      onRowSelectionChange: setRowSelection,
      enableRowSelection: enableRowSelection,
      meta: {
        refreshData: fetchData,
        openDeleteDialog,
      },
      state: {
        pagination: pagination
          ? {
            pageIndex: pagination.pageIndex,
            pageSize: pagination.pageSize,
          }
          : externalData
            ? {
              pageIndex: 0,
              pageSize: 10,
            }
            : undefined,
        columnFilters: filterState || [],
        columnVisibility,
        rowSelection,
      },
    })

    return (
      <div className="space-y-4 w-[20.5rem] min-w-full">
        <DataTableToolbar
          table={table}
          filters={filters}
          searchConfig={searchConfig}
          selectedCount={selectedCount}
          exportConfig={
            exportConfig && exportConfig.enabled
              ? {
                enabled: true,
                tableName: exportConfig.tableName!,
                businessId: exportConfig.businessId,
                onExport: createExportFunction({
                  service,
                  table,
                  columns,
                  searchConfig,
                  stableDefaultQueryParams,
                  internalFilters,
                  exportConfig,
                }),
              }
              : undefined
          }
          onDeleteSelected={
            deleteConfig?.enabled
              ? async () => {
                const ids = getSelectedRowIds()
                openDeleteDialog(ids)
              }
              : (onDeleteSelected
                ? async () => {
                  const ids = getSelectedRowIds()
                  await onDeleteSelected(ids)
                  clearSelection()
                }
                : undefined)
          }
          onRefresh={isAutonomous ? fetchData : undefined}
          refreshKey={refreshKey}
        />
        <div className="overflow-hidden border ">
          <Table className="w-full">
            <TableHeader className="bg-gray-100 dark:bg-transparent">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead
                        key={header.id}
                        className="px-2 py-3 whitespace-nowrap min-w-[60px] sm:min-w-[80px] md:min-w-[100px]"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Loading className="w-5 h-5" />
                      <span>Cargando datos...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="px-2 py-3 whitespace-nowrap min-w-[60px] sm:min-w-[80px] md:min-w-[100px]"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <svg
                        className="w-12 h-12 text-muted-foreground/50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="font-medium">
                        No hay resultados disponibles
                      </span>
                      <span className="text-sm">
                        Intenta ajustar los filtros de búsqueda
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end">
          <DataTablePagination
            table={table}
            total={pagination?.total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>

        {deleteConfig?.enabled && (
          <ConfirmDeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={confirmDelete}
            isLoading={isDeleting}
            itemName={deleteConfig.itemName}
            count={idsToDelete.length}
          />
        )}
      </div>
    )
  }
)
