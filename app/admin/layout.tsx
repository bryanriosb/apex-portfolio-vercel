import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { AUTH_OPTIONS } from '@/const/auth'
import { AppSidebar } from '@/components/AppSidebar'
import AdminHeader from '@/components/AdminHeader'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TrialBanner } from '@/components/trial'
import { SidebarSkeleton } from '@/components/SidebarSkeleton'
import { getAccessibleModules } from '@/lib/actions/sidebar'
import { NavigationLoader } from '@/components/NavigationLoader'
import { PermissionsLoader } from '@/components/PermissionsLoader'
import { TrialProviderClient } from '@/components/trial/TrialProviderClient'
import { getTrialDataFromServer } from '@/lib/services/trial/trial-server-service'
import { getBusinessWithLogoByAccountAction } from '@/lib/actions/business'

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Obtener sesión del servidor
  const session = await getServerSession(AUTH_OPTIONS)
  const user = session?.user as any
  const sidebarOpen = true

  // Obtener módulos accesibles desde el servidor
  const businessAccountId = user?.business_account_id || null
  const userRole = user?.role || 'customer'

  const accessibleModules = await getAccessibleModules(
    businessAccountId,
    userRole
  )

  // Obtener datos del trial desde el servidor para pre-carga
  const trialData = await getTrialDataFromServer()

  // Obtener logo del negocio activo (SSR para mejor UX)
  const businessWithLogo = businessAccountId
    ? await getBusinessWithLogoByAccountAction(businessAccountId)
    : null
  const businessLogoUrl = businessWithLogo?.logo_url || null

  return (
    <SidebarProvider defaultOpen={sidebarOpen} className="h-full w-full">
      <Suspense fallback={<SidebarSkeleton />}>
        <AppSidebar
          accessibleModules={accessibleModules}
          businessLogoUrl={businessLogoUrl}
        />
      </Suspense>
      {businessAccountId ? (
        <TrialProviderClient
          businessAccountId={businessAccountId}
          initialData={trialData || undefined}
        >
          <section className="flex flex-col w-full h-full overflow-hidden min-w-0">
            <PermissionsLoader />
            <TrialBanner />
            <div className="flex flex-col p-4 overflow-hidden min-w-0 flex-1 h-full">
              <AdminHeader />
              <div className="flex-1 h-full overflow-auto">
                <Suspense fallback={null}>
                  <NavigationLoader className="h-full">
                    {children}
                  </NavigationLoader>
                </Suspense>
              </div>
            </div>
          </section>
        </TrialProviderClient>
      ) : (
        <section className="flex flex-col w-full h-full overflow-hidden min-w-0">
          <PermissionsLoader />
          <div className="flex flex-col gap-4 p-4 overflow-y-auto overflow-x-hidden min-w-0 flex-1">
            <AdminHeader />
            <Suspense fallback={null}>
              <NavigationLoader>{children}</NavigationLoader>
            </Suspense>
          </div>
        </section>
      )}
    </SidebarProvider>
  )
}
