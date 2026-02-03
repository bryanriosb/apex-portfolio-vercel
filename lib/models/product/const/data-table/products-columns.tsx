'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Package, Syringe, ImageIcon, AlertTriangle } from 'lucide-react'
import Image from 'next/image'
import type { ProductWithDetails } from '@/lib/models/product'

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export const PRODUCTS_COLUMNS: ColumnDef<ProductWithDetails>[] = [
  {
    accessorKey: 'image_url',
    header: '',
    cell: ({ row }) => {
      const imageUrl = row.getValue('image_url') as string | null
      return (
        <div className="w-10 h-10 rounded-md overflow-hidden bg-muted flex items-center justify-center">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt="Producto"
              width={40}
              height={40}
              className="object-cover w-full h-full"
            />
          ) : (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'name',
    header: 'Producto',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const description = row.original.description
      const sku = row.original.sku
      return (
        <div className="max-w-xs">
          <div className="font-medium">{name}</div>
          {sku && (
            <div className="text-xs text-muted-foreground">SKU: {sku}</div>
          )}
          {description && (
            <div className="text-xs text-muted-foreground truncate">
              {description}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }) => {
      const type = row.getValue('type') as string
      const isSupply = type === 'SUPPLY'
      return (
        <Badge
          variant={isSupply ? 'secondary' : 'default'}
          className="block w-full text-center gap-1"
        >
          {isSupply ? (
            <>
              <Syringe className="h-3 w-3 inline mr-1" />
              Insumo
            </>
          ) : (
            <>
              <Package className="h-3 w-3 inline mr-1" />
              Venta
            </>
          )}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'cost_price_cents',
    header: 'Costo',
    cell: ({ row }) => {
      const priceCents = row.getValue('cost_price_cents') as number
      return <span className="text-sm">{formatPrice(priceCents)}</span>
    },
  },
  {
    accessorKey: 'sale_price_cents',
    header: 'Precio Venta',
    cell: ({ row }) => {
      const priceCents = row.getValue('sale_price_cents') as number
      const type = row.original.type
      if (type === 'SUPPLY') {
        return <span className="text-muted-foreground text-sm">-</span>
      }
      return <span className="font-medium">{formatPrice(priceCents)}</span>
    },
  },
  {
    accessorKey: 'current_stock',
    header: 'Stock',
    cell: ({ row }) => {
      const currentStock = row.getValue('current_stock') as number
      const minStock = row.original.min_stock
      const unit = row.original.unit_of_measure?.abbreviation || 'und'
      const isLow = currentStock <= minStock

      return (
        <div className="flex items-center gap-1">
          {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
          <span className={isLow ? 'text-amber-600 font-medium' : ''}>
            {currentStock} {unit}
          </span>
        </div>
      )
    },
  },
  {
    accessorKey: 'category_id',
    header: 'Categoría',
    cell: ({ row }) => {
      const category = row.original.category
      return category ? (
        <span className="text-sm">{category.name}</span>
      ) : (
        <span className="text-muted-foreground text-sm">Sin categoría</span>
      )
    },
  },
  {
    accessorKey: 'is_active',
    header: 'Estado',
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      return (
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className="block w-full text-center"
        >
          {isActive ? 'Activo' : 'Inactivo'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Creación',
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
      return (
        <span className="text-sm text-muted-foreground">
          {format(new Date(date), 'dd MMM yyyy', { locale: es })}
        </span>
      )
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
  },
]
