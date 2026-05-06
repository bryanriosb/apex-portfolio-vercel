'use client'

import { useCurrentUser } from '@/hooks/use-current-user'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import Loading from '@/components/ui/loading'

export default function CustomerDashboardPage() {
  const { user, role, isLoading } = useCurrentUser()

  useEffect(() => {
    if (!isLoading && role !== 'customer') {
      // Redirigir según el rol
      if (role === 'company_admin' || role === 'business_admin' || role === 'business_monitor') {
        redirect('/admin/dashboard')
      } else {
        redirect('/admin')
      }
    }
  }, [isLoading, role])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    )
  }

  if (role !== 'customer') {
    return null
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Cliente</h1>
        <p className="text-muted-foreground">
          Bienvenido, {user?.name || 'Cliente'}
        </p>
      </div>
    </div>
  )
}
