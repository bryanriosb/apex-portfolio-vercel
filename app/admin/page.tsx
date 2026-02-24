'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'
import Loading from '@/components/ui/loading'
export default function AdminPage() {
  const { isLoading, role } = useCurrentUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && role) {
      if (role === 'company_admin') {
        router.replace('/admin/company-dashboard')
      } else {
        router.replace('/admin/dashboard')
      }
    }
  }, [isLoading, role, router])

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <Loading className="h-8 w-8 text-primary" />
        <span className="text-sm text-muted-foreground">Cargando...</span>
      </div>
    </div>
  )
}
