'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react'
import type { InventoryMovementWithProduct } from '@/lib/models/product'
import type { InventoryMovementType } from '@/lib/types/enums'

const movementTypeConfig: Record<
  InventoryMovementType,
  { label: string; icon: any; color: string; bgColor: string }
> = {
  ENTRY: {
    label: 'Entrada',
    icon: ArrowUpCircle,
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  CONSUMPTION: {
    label: 'Consumo',
    icon: ArrowDownCircle,
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  SALE: {
    label: 'Venta',
    icon: ArrowDownCircle,
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  ADJUSTMENT: {
    label: 'Ajuste',
    icon: RefreshCw,
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
  WASTE: {
    label: 'Merma',
    icon: Trash2,
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  TRANSFER: {
    label: 'Transfer.',
    icon: ArrowRightLeft,
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-100',
  },
}

export const inventoryMovementColumns: ColumnDef<InventoryMovementWithProduct>[] = [
  {
    accessorKey: 'created_at',
    header: 'Fecha',
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return (
        <div className="text-sm">
          <div>{format(date, 'dd MMM yyyy', { locale: es })}</div>
          <div className="text-xs text-muted-foreground">
            {format(date, 'HH:mm')}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'movement_type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.original.movement_type as InventoryMovementType
      const config = movementTypeConfig[type]
      const Icon = config.icon
      return (
        <Badge variant="outline" className={`block w-full text-center ${config.bgColor} ${config.color} border-0`}>
          <Icon className="h-3 w-3 inline mr-1" />
          {config.label}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'product',
    header: 'Producto',
    cell: ({ row }) => {
      const product = row.original.product
      return (
        <div>
          <div className="font-medium text-sm">{product.name}</div>
          {product.sku && (
            <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'quantity',
    header: 'Cantidad',
    cell: ({ row }) => {
      const movement = row.original
      const unit = movement.product.unit_of_measure?.abbreviation || 'und'
      const isIncrease = ['ENTRY'].includes(movement.movement_type)
      const isAdjustment = movement.movement_type === 'ADJUSTMENT'

      return (
        <div className="text-sm font-medium">
          {isAdjustment ? (
            <span className="text-orange-600">= {movement.quantity}</span>
          ) : isIncrease ? (
            <span className="text-green-600">+{movement.quantity}</span>
          ) : (
            <span className="text-red-600">-{movement.quantity}</span>
          )}{' '}
          <span className="text-muted-foreground font-normal">{unit}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'stock_after',
    header: 'Stock Result.',
    cell: ({ row }) => {
      const movement = row.original
      const unit = movement.product.unit_of_measure?.abbreviation || 'und'
      return (
        <div className="text-sm">
          <span className="text-muted-foreground">{movement.stock_before}</span>
          <span className="mx-1">→</span>
          <span className="font-medium">{movement.stock_after}</span>
          <span className="text-muted-foreground ml-1">{unit}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'notes',
    header: 'Notas',
    cell: ({ row }) => {
      const notes = row.original.notes
      if (!notes) return <span className="text-muted-foreground">-</span>
      return (
        <div className="text-sm text-muted-foreground max-w-[200px] truncate" title={notes}>
          {notes}
        </div>
      )
    },
  },
]
