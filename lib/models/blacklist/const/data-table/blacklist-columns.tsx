import type {
  BounceType,
} from '@/lib/models/collection/email-blacklist'
import type { BlacklistWithCustomerInfo } from '@/lib/actions/blacklist'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MailWarning, MailX, AlertTriangle, Hand } from 'lucide-react'

const bounceTypeLabels: Record<BounceType, string> = {
  hard: 'Duro',
  soft: 'Suave',
  complaint: 'Queja',
  manual: 'Manual',
}

const bounceTypeVariants: Record<
  BounceType,
  'default' | 'secondary' | 'destructive'
> = {
  hard: 'destructive',
  soft: 'secondary',
  complaint: 'default',
  manual: 'secondary',
}

const bounceTypeIcons: Record<BounceType, typeof MailX> = {
  hard: MailX,
  soft: MailWarning,
  complaint: AlertTriangle,
  manual: Hand,
}

export const BLACKLIST_COLUMNS: ColumnDef<BlacklistWithCustomerInfo>[] = [
  {
    accessorKey: 'email',
    header: 'Correo',
    cell: ({ row }) => {
      const email = row.original.email
      return <div className="font-medium">{email}</div>
    },
  },
  {
    accessorKey: 'customer_nit',
    header: 'NIT',
    cell: ({ row }) => {
      const nit = row.original.customer_nit
      if (!nit) return <div className="text-muted-foreground">-</div>
      return <div className="font-mono text-sm">{nit}</div>
    },
  },
  {
    accessorKey: 'customer_company',
    header: 'Empresa',
    cell: ({ row }) => {
      const company = row.original.customer_company
      if (!company) return <div className="text-muted-foreground">-</div>
      // Truncar a 30 caracteres con ellipsis
      const truncated = company.length > 30 ? company.substring(0, 30) + '...' : company
      return (
        <div 
          className="text-sm max-w-[200px] truncate" 
          title={company}
        >
          {truncated}
        </div>
      )
    },
  },
  {
    accessorKey: 'bounce_type',
    header: 'Tipo',
    cell: ({ row }) => {
      const bounceType = row.original.bounce_type as BounceType
      if (!bounceType) return <div className="text-muted-foreground">-</div>

      const Icon = bounceTypeIcons[bounceType]
      return (
        <Badge
          variant={bounceTypeVariants[bounceType]}
          className="flex items-center gap-1 w-fit"
        >
          <Icon className="h-3 w-3" />
          {bounceTypeLabels[bounceType]}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'bounce_reason',
    header: 'Razón',
    cell: ({ row }) => {
      const reason = row.original.bounce_reason
      if (!reason) return <div className="text-muted-foreground">-</div>
      return (
        <div
          className="text-sm text-muted-foreground max-w-[300px] truncate"
          title={reason}
        >
          {reason}
        </div>
      )
    },
  },
  {
    accessorKey: 'bounced_at',
    header: 'Fecha de Rebotado',
    cell: ({ row }) => {
      const date = row.original.bounced_at
      if (!date) return <div className="text-muted-foreground">-</div>
      return (
        <div className="text-sm text-muted-foreground">
          {format(new Date(date), 'dd MMM yyyy HH:mm', { locale: es })}
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Agregado',
    cell: ({ row }) => {
      const date = row.original.created_at
      return (
        <div className="text-sm text-muted-foreground">
          {format(new Date(date), 'dd MMM yyyy', { locale: es })}
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
  },
]
