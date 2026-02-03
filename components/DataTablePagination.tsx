import { Table } from '@tanstack/react-table'
import { Button } from './ui/button'
import { Label } from './ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
} from '@tabler/icons-react'

interface DataTablePaginationProps {
  table: Table<any>
  total?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}

export default function DataTablePagination({
  table,
  total,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const handlePageSizeChange = (value: string) => {
    const newPageSize = Number(value)
    if (onPageSizeChange) {
      onPageSizeChange(newPageSize)
    } else {
      table.setPageSize(newPageSize)
    }
  }

  const handlePageChange = (pageIndex: number) => {
    if (onPageChange) {
      onPageChange(pageIndex)
    } else {
      table.setPageIndex(pageIndex)
    }
  }

  // Obtener el estado de paginación de manera segura
  const paginationState = table.getState().pagination || { pageIndex: 0, pageSize: 10 }
  const currentPageSize = paginationState.pageSize
  const currentPageIndex = paginationState.pageIndex

  return (
    <div className="flex w-full items-center gap-8 lg:w-fit">
      <div className="hidden items-center gap-2 lg:flex">
        <Label htmlFor="rows-per-page" className="text-sm font-medium">
          Filas por página
        </Label>
        <Select
          value={`${currentPageSize}`}
          onValueChange={handlePageSizeChange}
        >
          <SelectTrigger size="sm" className="w-20" id="rows-per-page">
            <SelectValue placeholder={currentPageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex w-fit items-center justify-center text-sm font-medium">
        Página {currentPageIndex + 1} de{' '}
        {table.getPageCount()} -
        {total && <span className="ml-2">{total} Filas</span>}
      </div>
      <div className="ml-auto flex items-center gap-2 lg:ml-0">
        <Button
          variant="outline"
          className="hidden h-8 w-8 p-0 lg:flex"
          onClick={() => handlePageChange(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Ir a la primera página</span>
          <IconChevronsLeft />
        </Button>
        <Button
          variant="outline"
          className="size-8"
          size="icon"
          onClick={() =>
            handlePageChange(currentPageIndex - 1)
          }
          disabled={!table.getCanPreviousPage()}
        >
          <span className="sr-only">Ir a la página anterior</span>
          <IconChevronLeft />
        </Button>
        <Button
          variant="outline"
          className="size-8"
          size="icon"
          onClick={() =>
            handlePageChange(currentPageIndex + 1)
          }
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Siguiente página</span>
          <IconChevronRight />
        </Button>
        <Button
          variant="outline"
          className="hidden size-8 lg:flex"
          size="icon"
          onClick={() => handlePageChange(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <span className="sr-only">Ir a la última página</span>
          <IconChevronsRight />
        </Button>
      </div>
    </div>
  )
}
