'use client'

import { ColumnDef } from '@tanstack/react-table'
import { CollectionExecution } from '@/lib/models/collection'
import { StatusBadge } from '../shared/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, RefreshCw, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

export const executionColumns: ColumnDef<CollectionExecution>[] = [
  {
    accessorKey: 'name',
    header: 'Nombre',
    cell: ({ row }) => {
      const execution = row.original
      return (
        <div className="space-y-1">
          <Link
            href={`/admin/collection/executions/${execution.id}`}
            className="font-medium hover:underline"
          >
            {execution.name}
          </Link>
          {execution.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {execution.description}
            </p>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'total_clients',
    header: 'Clientes',
    cell: ({ row }) => {
      const execution = row.original
      return (
        <div className="text-sm">
          <div className="font-medium">{execution.total_clients}</div>
          <div className="text-xs text-muted-foreground">total</div>
        </div>
      )
    },
  },
  {
    accessorKey: 'emails_sent',
    header: 'Enviados',
    cell: ({ row }) => {
      const execution = row.original
      const percentage =
        execution.total_clients > 0
          ? Math.round((execution.emails_sent / execution.total_clients) * 100)
          : 0

      return (
        <div className="space-y-1">
          <div className="text-sm font-medium">{execution.emails_sent}</div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{percentage}%</span>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'open_rate',
    header: 'Tasa Apertura',
    cell: ({ row }) => {
      const rate = row.original.open_rate
      const color =
        rate >= 40
          ? 'text-green-600'
          : rate >= 20
            ? 'text-yellow-600'
            : 'text-red-600'

      return (
        <div className={`text-sm font-medium ${color}`}>{rate.toFixed(1)}%</div>
      )
    },
  },
  {
    accessorKey: 'bounce_rate',
    header: 'Tasa Rebote',
    cell: ({ row }) => {
      const rate = row.original.bounce_rate
      const color =
        rate < 2
          ? 'text-green-600'
          : rate < 5
            ? 'text-yellow-600'
            : 'text-red-600'

      return (
        <div className={`text-sm font-medium ${color}`}>{rate.toFixed(1)}%</div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Creado',
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return (
        <div className="text-sm text-muted-foreground">
          {formatDistanceToNow(date, { addSuffix: true, locale: es })}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const execution = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/admin/collection/executions/${execution.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalle
              </Link>
            </DropdownMenuItem>
            {execution.status === 'failed' && (
              <DropdownMenuItem>
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
