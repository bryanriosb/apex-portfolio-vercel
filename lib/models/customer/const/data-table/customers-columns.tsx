import type {
  BusinessCustomer,
  CustomerStatus,
} from '@/lib/models/customer/business-customer'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

// Función para obtener el nombre de la categoría a partir del ID
const getCategoryName = (
  categoryId: string | null,
  categories: any[]
): string => {
  if (!categoryId) return '-'
  const category = categories.find((cat) => cat.id === categoryId)
  return category?.name || categoryId
}

const statusLabels: Record<CustomerStatus, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  vip: 'VIP',
  blocked: 'Bloqueado',
}

const statusVariants: Record<
  CustomerStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  inactive: 'secondary',
  vip: 'default',
  blocked: 'destructive',
}

export const CUSTOMERS_COLUMNS: ColumnDef<BusinessCustomer>[] = [
  {
    accessorKey: 'company_name',
    header: 'Empresa',
    cell: ({ row }) => {
      const companyName = row.original.company_name
      return <div className="font-medium">{companyName || '-'}</div>
    },
  },
  {
    accessorKey: 'nit',
    header: 'NIT',
    cell: ({ row }) => {
      const nit = row.original.nit
      return <div className="font-mono text-sm">{nit}</div>
    },
  },
  {
    accessorKey: 'full_name',
    header: 'Contacto',
    cell: ({ row }) => {
      const fullName = row.original.full_name
      return <div className="font-medium">{fullName}</div>
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => {
      const email = row.original.email
      return <div className="text-muted-foreground">{email}</div>
    },
  },
  {
    accessorKey: 'phone',
    header: 'Teléfono',
    cell: ({ row }) => {
      const phone = row.original.phone
      return <div className="text-muted-foreground">{phone || '-'}</div>
    },
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    cell: ({ row }) => {
      const categoryId = row.original.category
      const categoryName = row.original.category_name?.name
      // Si tenemos el nombre de la categoría, lo mostramos, si no, el ID o guión
      return <div className="text-sm">{categoryName || categoryId || '-'}</div>
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'status',
    header: 'Estado',
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <Badge
          variant={statusVariants[status]}
          className={`block text-center ${
            status === 'vip' ? 'bg-amber-500 hover:bg-amber-600' : ''
          }`}
        >
          {statusLabels[status]}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'tags',
    header: 'Etiquetas',
    cell: ({ row }) => {
      const tags = row.original.tags
      if (!tags || tags.length === 0)
        return <div className="text-muted-foreground">-</div>
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag: string) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Creado',
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
