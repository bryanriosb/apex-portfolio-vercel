'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { BusinessWithAccount } from '@/lib/models/business/business'
import {
  Building2,
  MapPin,
  Phone,
  FileText,
  Star,
  MessageSquare,
  Calendar,
  Image,
  Store,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { getBusinessTypeLabel } from '@/lib/services/business/const/business-type-labels'

interface BusinessDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business: BusinessWithAccount | null
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: any
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && (
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="flex-1">
        <span className="text-muted-foreground text-sm block">{label}</span>
        <span className="font-medium text-sm">{value || '-'}</span>
      </div>
    </div>
  )
}

export function BusinessDetailModal({
  open,
  onOpenChange,
  business,
}: BusinessDetailModalProps) {
  if (!business) return null

  // Construir dirección completa
  const fullAddress = [business.address, business.city, business.state]
    .filter(Boolean)
    .join(', ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="h-12 w-12 rounded-lg object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                <Store className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <DialogTitle className="text-xl">{business.name}</DialogTitle>
              {business.business_account && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {business.business_account.company_name}
                </p>
              )}
            </div>
            <Badge variant="outline">
              {getBusinessTypeLabel(business.type)}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          <div className="space-y-6">
            {/* Descripción */}
            {business.description && (
              <>
                <div>
                  <h4 className="font-medium mb-2">Descripción</h4>
                  <p className="text-sm text-muted-foreground">
                    {business.description}
                  </p>
                </div>
                <Separator />
              </>
            )}

            {/* Información General */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Store className="h-4 w-4" />
                Información General
              </h4>
              <div className="rounded-lg border p-4 space-y-1">
                <InfoRow
                  label="NIT / Identificación"
                  value={
                    business.nit ? (
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {business.nit}
                      </code>
                    ) : (
                      '-'
                    )
                  }
                  icon={FileText}
                />
                <InfoRow
                  label="Teléfono"
                  value={
                    business.phone_number ? (
                      <a
                        href={`tel:${business.phone_number}`}
                        className="text-primary hover:underline"
                      >
                        {business.phone_number}
                      </a>
                    ) : (
                      '-'
                    )
                  }
                  icon={Phone}
                />
              </div>
            </div>

            <Separator />

            {/* Ubicación */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación
              </h4>
              <div className="rounded-lg border p-4">
                {fullAddress ? (
                  <div className="space-y-2">
                    <p className="text-sm">{fullAddress}</p>
                    {business.location && (
                      <p className="text-xs text-muted-foreground">
                        Coordenadas: {business.location}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin dirección registrada
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Calificaciones */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Star className="h-4 w-4" />
                Calificaciones
              </h4>
              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      {business.avg_rating.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Calificación promedio
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                      {business.review_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Reseñas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Imágenes */}
            {business.gallery_cover_image_url && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Imagen de Portada
                  </h4>
                  <div className="rounded-lg border overflow-hidden">
                    <img
                      src={business.gallery_cover_image_url}
                      alt={`Portada de ${business.name}`}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Fechas */}
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Información del Sistema
              </h4>
              <div className="rounded-lg border p-4 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground text-sm block">
                    Creación
                  </span>
                  <span className="font-medium text-sm">
                    {format(
                      new Date(business.created_at),
                      "dd 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-sm block">
                    Última actualización
                  </span>
                  <span className="font-medium text-sm">
                    {format(
                      new Date(business.updated_at),
                      "dd 'de' MMMM, yyyy",
                      { locale: es }
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
