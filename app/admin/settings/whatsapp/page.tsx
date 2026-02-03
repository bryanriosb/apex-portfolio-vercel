'use client'

import { useState } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { SharedWhatsAppConfigForm } from '@/components/whatsapp/SharedWhatsAppConfigForm'
import { WhatsAppAccountsList } from '@/components/whatsapp/WhatsAppAccountsList'
import { WhatsAppTestMessage } from '@/components/whatsapp/WhatsAppTestMessage'
import { Loader2, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { USER_ROLES } from '@/const/roles'
import type { WhatsAppConfig } from '@/lib/models/whatsapp/whatsapp-config'

export default function WhatsAppSettingsPage() {
  const { isLoading: userLoading, role } = useCurrentUser()
  const [sharedConfig, setSharedConfig] = useState<WhatsAppConfig | null>(null)

  if (userLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (role !== USER_ROLES.COMPANY_ADMIN) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            WhatsApp
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configuracion de WhatsApp
          </p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-semibold">Acceso restringido</h2>
                <p className="text-muted-foreground">
                  Solo los administradores de la plataforma pueden configurar WhatsApp.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          WhatsApp
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Configura la integracion con WhatsApp Business API
        </p>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList>
          <TabsTrigger value="config">Configuracion</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
          <TabsTrigger value="test">Pruebas</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <SharedWhatsAppConfigForm onConfigChange={setSharedConfig} />
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <WhatsAppAccountsList sharedConfig={sharedConfig} />
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <WhatsAppTestMessage
            businessAccountId={null}
            businessId={null}
            sharedConfig={sharedConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
