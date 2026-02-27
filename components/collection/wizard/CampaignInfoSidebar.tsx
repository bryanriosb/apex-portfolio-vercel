'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Info } from 'lucide-react'

interface CampaignInfoSidebarProps {
  campaignName: string
  campaignDescription: string
  onCampaignNameChange: (value: string) => void
  onCampaignDescriptionChange: (value: string) => void
}

export function CampaignInfoSidebar({
  campaignName,
  campaignDescription,
  onCampaignNameChange,
  onCampaignDescriptionChange,
}: CampaignInfoSidebarProps) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">
          Información Requerida para Crear Campaña
        </CardTitle>
        <CardDescription className="text-xs">
          Define los como mínimo la información básica de tu campaña de cobro
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name" className="flex items-center gap-1">
            Nombre de la Campaña
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="campaign-name"
            placeholder="Ej: Cobro Febrero 2026"
            value={campaignName}
            onChange={(e) => onCampaignNameChange(e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Este nombre te ayudará a identificar la campaña
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-description">Descripción (Opcional)</Label>
          <Textarea
            id="campaign-description"
            placeholder="Agrega notas o contexto sobre esta campaña..."
            value={campaignDescription}
            onChange={(e) => onCampaignDescriptionChange(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <div className="bg-muted/50 p-3 rounded-md border">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              La Información Requerida para Crear Campaña se guardará junto con
              los datos de ejecución y te permitirá rastrear fácilmente tus
              ejecituciones.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
