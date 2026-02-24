'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Loading from '@/components/ui/loading'
import BusinessCustomerService from '@/lib/services/customer/business-customer-service'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import {
  User,
  Building,
  Mail,
  Phone,
  Tag,
  Calendar,
  FileText,
} from 'lucide-react'

interface CustomerDetailsModalProps {
  customerId: string | null
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Activo',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  inactive: {
    label: 'Inactivo',
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  vip: {
    label: 'VIP',
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  blocked: {
    label: 'Bloqueado',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
}

export default function CustomerDetailsModal({
  customerId,
  businessId,
  open,
  onOpenChange,
}: CustomerDetailsModalProps) {
  const [customer, setCustomer] = useState<BusinessCustomer | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!customerId || !businessId || !open) return

    const fetchCustomer = async () => {
      setIsLoading(true)
      try {
        const service = new BusinessCustomerService()
        const data = await service.getById(customerId)
        setCustomer(data)
      } catch (error) {
        console.error('Error fetching customer:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomer()
  }, [customerId, businessId, open])

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Cliente</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <Loading className="w-8 h-8" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!customer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalles del Cliente</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            No se encontró información del cliente
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const statusConfig = STATUS_CONFIG[customer.status] || STATUS_CONFIG.active

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalles del Cliente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold text-primary">
              {customer.company_name ? (
                <Building className="w-8 h-8" />
              ) : (
                <User className="w-8 h-8" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{customer.company_name || customer.full_name}</h3>
              {customer.company_name && (
                <p className="text-sm text-muted-foreground">{customer.full_name}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={statusConfig.className}>
                  {statusConfig.label}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">NIT: {customer.nit}</span>
            </div>

            {customer.emails && customer.emails.length > 0 && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.emails[0]}</span>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.phone}</span>
              </div>
            )}
          </div>

          <Separator />

          {customer.tags && customer.tags.length > 0 && (
            <div className="flex items-start gap-2">
              <Tag className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-1">
                {customer.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {customer.preferences && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Preferencias</p>
              <p className="text-sm">{customer.preferences}</p>
            </div>
          )}

          {customer.notes && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <p className="text-sm">{customer.notes}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Cliente desde{' '}
            {format(new Date(customer.created_at), "d 'de' MMMM 'de' yyyy", {
              locale: es,
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}