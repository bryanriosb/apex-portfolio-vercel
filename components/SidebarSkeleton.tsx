import { Skeleton } from '@/components/ui/skeleton'

/**
 * Skeleton component para el sidebar mientras carga los items filtrados
 * Se usa en Suspense boundaries para evitar parpadeos
 */
export function SidebarSkeleton() {
  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      {/* Header */}
      <div className="flex h-14 items-center border-b px-4">
        <Skeleton className="h-6 w-32" />
      </div>

      {/* Navigation Items */}
      <div className="flex-1 space-y-1 p-2">
        {/* Dashboard */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Appointments */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Services */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-14" />
        </div>

        {/* Products */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Inventory */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-18" />
        </div>

        {/* Specialists */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Customers */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-16" />
        </div>

        {/* Medical Records */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Commissions */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-18" />
        </div>

        {/* Reports */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-14" />
        </div>

        {/* Invoices */}
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t p-2">
        <div className="flex items-center space-x-2 rounded-lg px-3 py-2">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  )
}