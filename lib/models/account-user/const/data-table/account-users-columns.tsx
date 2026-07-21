import { AccountUser } from '@/lib/models/account-user/account-user'
import { USER_ROLES } from '@/const/roles'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const USER_ROLE_LABELS: Record<string, string> = {
  [USER_ROLES.COMPANY_ADMIN]: 'Admin de Compañía',
  [USER_ROLES.BUSINESS_ADMIN]: 'Admin de Negocio',
  [USER_ROLES.PROFESSIONAL]: 'Profesional',
  [USER_ROLES.EMPLOYEE]: 'Monitor',
}

const roleVariants: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [USER_ROLES.COMPANY_ADMIN]: 'destructive',
  [USER_ROLES.BUSINESS_ADMIN]: 'default',
  [USER_ROLES.PROFESSIONAL]: 'secondary',
  [USER_ROLES.EMPLOYEE]: 'outline',
}

export const ACCOUNT_USERS_COLUMNS: ColumnDef<AccountUser>[] = [
  {
    accessorKey: 'name',
    header: 'Usuario',
    cell: ({ row }) => {
      const name = row.getValue('name') as string | null
      const email = row.original.email
      return (
        <div>
          <div className="font-medium">{name || '-'}</div>
          <div className="text-xs text-muted-foreground">{email}</div>
        </div>
      )
    },
  },
  {
    accessorKey: 'role',
    header: 'Rol',
    cell: ({ row }) => {
      const role = row.getValue('role') as string
      return (
        <Badge variant={roleVariants[role] || 'outline'}>
          {USER_ROLE_LABELS[role] || role}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'business_account_name',
    header: 'Cuenta',
    cell: ({ row }) => {
      const accountName = row.getValue('business_account_name') as string | null
      if (!accountName) return <span className="text-muted-foreground">-</span>
      return <div className="text-sm">{accountName}</div>
    },
  },
  {
    accessorKey: 'businesses',
    header: 'Sucursales',
    cell: ({ row }) => {
      const user = row.original
      if (user.all_businesses) {
        return <Badge variant="secondary">Todas</Badge>
      }
      if (!user.businesses.length) {
        return <span className="text-muted-foreground">-</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {user.businesses.map((b) => (
            <Badge key={b.id} variant="outline">
              {b.name}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'last_sign_in_at',
    header: 'Último acceso',
    cell: ({ row }) => {
      const date = row.getValue('last_sign_in_at') as string | null
      if (!date) return <span className="text-muted-foreground">Nunca</span>
      return (
        <span className="text-sm text-muted-foreground font-mono">
          {format(new Date(date), 'dd MMM yyyy HH:mm', { locale: es })}
        </span>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Creación',
    cell: ({ row }) => {
      const date = row.getValue('created_at') as string
      return (
        <span className="text-sm text-muted-foreground font-mono">
          {format(new Date(date), 'dd MMM yyyy', { locale: es })}
        </span>
      )
    },
  },
  {
    id: 'actions',
    header: 'Acciones',
    // La celda de acciones se define dinámicamente en la página
    // para evitar problemas de serialización con callbacks
  },
]
