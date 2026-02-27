'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Ban,
  Trash2,
  HardDrive,
  AlertTriangle,
  Mail,
  User,
  Building2,
  RefreshCw,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import {
  getBlacklistWithCustomerInfoAction,
  getBlacklistStatsAction,
  removeFromBlacklistAction,
  BlacklistWithCustomerInfo,
} from '@/lib/actions/blacklist'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface BlacklistStats {
  total: number
  hard_bounces: number
  soft_bounces: number
  complaints: number
  last_30_days: number
}

const bounceTypeConfig = {
  hard: {
    label: 'Duro',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: HardDrive,
  },
  soft: {
    label: 'Suave',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: AlertTriangle,
  },
  complaint: {
    label: 'Queja',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertCircle,
  },
}

export const BlacklistMonitor: React.FC = () => {
  const { activeBusiness } = useActiveBusinessStore()
  const [stats, setStats] = useState<BlacklistStats | null>(null)
  const [recentItems, setRecentItems] = useState<BlacklistWithCustomerInfo[]>(
    []
  )
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!activeBusiness?.id) return

    setLoading(true)
    try {
      const [statsData, itemsData] = await Promise.all([
        getBlacklistStatsAction(activeBusiness.id),
        getBlacklistWithCustomerInfoAction({
          businessId: activeBusiness.id,
          page: 1,
          pageSize: 10,
        }),
      ])

      setStats(statsData)
      setRecentItems(itemsData.data)
    } catch {
      toast.error('Error al cargar datos de la lista negra')
    } finally {
      setLoading(false)
    }
  }, [activeBusiness?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (id: string) => {
    try {
      const result = await removeFromBlacklistAction(id)
      if (result.success) {
        toast.success('Correo eliminado de la lista negra')
        fetchData()
      } else {
        toast.error(result.error || 'Error al eliminar')
      }
    } catch (error) {
      toast.error('Error al eliminar el correo')
    }
  }

  if (!activeBusiness) {
    return (
      <Card className="rounded-none border">
        <CardContent className="py-12">
          <div className="text-center">
            <Ban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              Selecciona una sucursal
            </h3>
            <p className="text-muted-foreground text-sm">
              Debes seleccionar una sucursal para ver la lista negra de correos
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold tracking-tight flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Lista Negra de Correos
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Últimos 10 correos bloqueados vinculados a clientes
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="rounded-none"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
          />
          Actualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bloqueados
            </CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rebotes Duros</CardTitle>
            <HardDrive className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-red-600">
                {stats?.hard_bounces || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rebotes Suaves
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {stats?.soft_bounces || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Últimos 30 días
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.last_30_days || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Items List */}
      <Card className="rounded-none border shadow-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Últimos registros
            </CardTitle>
            {stats && stats.total > 10 && (
              <span className="text-xs text-muted-foreground">
                Mostrando 10 de {stats.total}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : recentItems.length === 0 ? (
            <div className="py-12 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Sin registros</h3>
              <p className="text-muted-foreground text-sm">
                No hay correos en la lista negra para esta sucursal
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {recentItems.map((item) => {
                const bounceConfig =
                  bounceTypeConfig[
                    item.bounce_type as keyof typeof bounceTypeConfig
                  ] || bounceTypeConfig.hard
                const BounceIcon = bounceConfig.icon

                return (
                  <div
                    key={item.id}
                    className="p-4 flex items-start justify-between gap-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      {/* Icon */}
                      <div
                        className={`p-2 shrink-0 ${bounceConfig.color.replace('bg-', 'bg-opacity-10 bg-').replace('text-', 'text-')}`}
                      >
                        <BounceIcon className="h-4 w-4" />
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Email */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">
                            {item.email}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs ${bounceConfig.color}`}
                          >
                            {bounceConfig.label}
                          </Badge>
                        </div>

                        {/* Customer Info */}
                        {item.customer_name || item.customer_company ? (
                          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                            {item.customer_name && (
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {item.customer_name}
                              </span>
                            )}
                            {item.customer_company && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {item.customer_company}
                              </span>
                            )}
                            {item.customer_nit && (
                              <span className="font-mono text-xs">
                                NIT: {item.customer_nit}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            Cliente no vinculado al directorio
                          </span>
                        )}

                        {/* Date */}
                        <div className="text-xs text-muted-foreground">
                          {format(
                            new Date(item.bounced_at),
                            'dd MMM yyyy, HH:mm',
                            { locale: es }
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View All Link */}
      {stats && stats.total > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() =>
              (window.location.href = '/admin/customers/blacklist')
            }
          >
            Ver todos los registros
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  )
}
