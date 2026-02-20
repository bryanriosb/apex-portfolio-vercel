'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DeliveryStrategiesTab,
  DomainReputationTab,
  ThresholdsTab,
} from '@/components/collection/config'

export default function CollectionSettingsPage() {
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

      <Tabs defaultValue="strategies" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="strategies">Estrategias de Envío</TabsTrigger>
          <TabsTrigger value="domains">Reputación de Dominios</TabsTrigger>
          <TabsTrigger value="thresholds">Umbrales de Días</TabsTrigger>
        </TabsList>

        <TabsContent value="strategies" className="mt-6">
          <DeliveryStrategiesTab />
        </TabsContent>

        <TabsContent value="domains" className="mt-6">
          <DomainReputationTab />
        </TabsContent>

        <TabsContent value="thresholds" className="mt-6">
          <ThresholdsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
