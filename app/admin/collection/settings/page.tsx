'use client'

import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  GeneralTab,
  DeliveryStrategiesTab,
  ThresholdsTab,
} from '@/components/collection/config'

export default function CollectionSettingsPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const defaultTab = tabParam === 'thresholds' ? 'thresholds' : 'general'

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Configuración de Cobros
        </h1>
        <p className="text-muted-foreground">
          Gestiona estrategias de envío, reputación de dominios y umbrales de
          notificación
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="strategies">Estrategias de Envío</TabsTrigger>
          <TabsTrigger value="thresholds">Umbrales de Días de Mora</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6">
          <GeneralTab />
        </TabsContent>

        <TabsContent value="strategies" className="mt-6">
          <DeliveryStrategiesTab />
        </TabsContent>

        <TabsContent value="thresholds" className="mt-6">
          <ThresholdsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
