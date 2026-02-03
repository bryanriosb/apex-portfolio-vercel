'use client'

import { Control } from 'react-hook-form'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Palette,
  HeadphonesIcon,
  Code,
  Calendar,
  Boxes,
  Scissors,
  Users,
  HardDrive,
} from 'lucide-react'

interface PlanFeaturesFormProps {
  control: Control<any>
  disabled?: boolean
}

// Configuraciones adicionales (no son módulos)
const booleanFeatures = [
  {
    name: 'has_custom_branding',
    label: 'Marca personalizada',
    description: 'Personalización de marca y colores',
    icon: Palette,
  },
  {
    name: 'has_priority_support',
    label: 'Soporte prioritario',
    description: 'Atención prioritaria al cliente',
    icon: HeadphonesIcon,
  },
  {
    name: 'has_api_access',
    label: 'Acceso API',
    description: 'Acceso a la API del sistema',
    icon: Code,
  },
]

// Límites de uso (null = sin límite)
const numericFeatures = [
  {
    name: 'max_appointments_per_month',
    label: 'Máx. citas por mes',
    description: 'Dejar vacío para ilimitado',
    icon: Calendar,
    placeholder: 'Ilimitado',
  },
  {
    name: 'max_products',
    label: 'Máx. productos',
    description: 'Dejar vacío para ilimitado',
    icon: Boxes,
    placeholder: 'Ilimitado',
  },
  {
    name: 'max_services',
    label: 'Máx. servicios',
    description: 'Dejar vacío para ilimitado',
    icon: Scissors,
    placeholder: 'Ilimitado',
  },
  {
    name: 'max_customers',
    label: 'Máx. clientes',
    description: 'Dejar vacío para ilimitado',
    icon: Users,
    placeholder: 'Ilimitado',
  },
  {
    name: 'max_storage_mb',
    label: 'Almacenamiento (MB)',
    description: 'Dejar vacío para ilimitado',
    icon: HardDrive,
    placeholder: 'Ilimitado',
  },
]

export function PlanFeaturesForm({ control, disabled }: PlanFeaturesFormProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Límites de uso</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Define los límites del plan. Deja vacío para indicar sin límite.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {numericFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <FormField
                key={feature.name}
                control={control}
                name={`features.${feature.name}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {feature.label}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder={feature.placeholder}
                        disabled={disabled}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          field.onChange(value === '' ? null : Number(value))
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )
          })}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="text-sm font-medium mb-3">Configuraciones adicionales</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Características extras del plan (no son módulos del sistema).
        </p>
        <div className="space-y-3">
          {booleanFeatures.map((feature) => {
            const Icon = feature.icon
            return (
              <FormField
                key={feature.name}
                control={control}
                name={`features.${feature.name}`}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">{feature.label}</FormLabel>
                        <FormDescription className="text-xs">
                          {feature.description}
                        </FormDescription>
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={disabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
