'use client'

import { ServiceWithCategory } from '@/lib/models/service/service'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Star, Clock, ImageIcon, Tag } from 'lucide-react'
import Image from 'next/image'

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

export const SERVICES_COLUMNS: ColumnDef<ServiceWithCategory>[] = [
  {
    accessorKey: 'category_id',
    header: 'category_id',
    meta: { hidden: true },
    enableHiding: false,
  },
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
              alt="Servicio"
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
    header: 'Servicio',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const description = row.original.description
      return (
        <div className="max-w-xs">
          <div className="font-medium">{name}</div>
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
    id: 'category',
    accessorFn: (row) => row.category?.name,
    header: 'Categoría',
    cell: ({ row }) => {
      const category = row.original.category
      return category ? (
        <Badge variant="secondary" className="block w-full text-center gap-1">
          <Tag className="h-3 w-3 inline mr-1" />
          {category.name}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">Sin categoría</span>
      )
    },
  },
  {
    accessorKey: 'price_cents',
    header: 'Precio',
    cell: ({ row }) => {
      const priceCents = row.getValue('price_cents') as number
      return <span className="font-medium">{formatPrice(priceCents)}</span>
    },
  },
  {
    accessorKey: 'duration_minutes',
    header: 'Duración',
    cell: ({ row }) => {
      const minutes = row.getValue('duration_minutes') as number
      return (
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {formatDuration(minutes)}
        </div>
      )
    },
  },
  {
    accessorKey: 'is_featured',
    header: 'Destacado',
    cell: ({ row }) => {
      const isFeatured = row.getValue('is_featured') as boolean
      return isFeatured ? (
        <Badge variant="default" className="block w-full text-center gap-1">
          <Star className="h-3 w-3 inline mr-1" />
          Destacado
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
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
