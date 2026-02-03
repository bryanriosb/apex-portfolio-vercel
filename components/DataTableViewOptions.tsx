'use client'

import { DropdownMenuTrigger } from '@radix-ui/react-dropdown-menu'
import { Table } from '@tanstack/react-table'
import { RefreshCcw, Settings2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu'
import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { useState } from 'react'

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>
  service?: {
    fetchItems: (params: any) => Promise<any>
  }
}

export function DataTableViewOptions<TData>({
  table,
  service,
}: DataTableViewOptionsProps<TData>) {
  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto hidden h-8 lg:flex"
              >
                <Settings2 />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Columnas</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-[150px]">
          <DropdownMenuLabel>Columnas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllColumns()
            .filter(
              (column) =>
                typeof column.accessorFn !== 'undefined' && column.getCanHide()
            )
            .map((column) => {
              // Usar el header de la columna si está disponible, sino usar el id
              const displayName =
                typeof column.columnDef.header === 'string'
                  ? column.columnDef.header
                  : column.id

              return (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value: any) =>
                    column.toggleVisibility(!!value)
                  }
                >
                  {displayName}
                </DropdownMenuCheckboxItem>
              )
            })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
