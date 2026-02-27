'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ScrollArea } from '@/components/ui/scroll-area'
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
          pageSize: 20,
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
            Correos bloqueados vinculados a clientes
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

      {/* Stats Cards - Compacto */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total
            </CardTitle>
            <Ban className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold">{stats?.total || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Duros</CardTitle>
            <HardDrive className="h-3.5 w-3.5 text-red-600" />
          </CardHeader>
          <CardContent className="pb-3">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold text-red-600">
                {stats?.hard_bounces || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Suaves
            </CardTitle>
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
          </CardHeader>
          <CardContent className="pb-3">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold text-yellow-600">
                {stats?.soft_bounces || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              30 días
            </CardTitle>
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3">
            {loading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold">
                {stats?.last_30_days || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Items List - Compacto con scroll */}
      <Card className="rounded-none border shadow-none">
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Últimos registros
            </CardTitle>
            {stats && stats.total > 5 && (
              <span className="text-xs text-muted-foreground">
                Mostrando {Math.min(recentItems.length, 5)} de {stats.total}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-7" />
                </div>
              ))}
            </div>
          ) : recentItems.length === 0 ? (
            <div className="py-8 text-center">
              <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-base font-medium mb-1">Sin registros</h3>
              <p className="text-muted-foreground text-sm">
                No hay correos en la lista negra
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[280px]">
              <div className="divide-y">
                {recentItems.slice(0, 20).map((item) => {
                  const bounceConfig =
                    bounceTypeConfig[
                      item.bounce_type as keyof typeof bounceTypeConfig
                    ] || bounceTypeConfig.hard
                  const BounceIcon = bounceConfig.icon

                  return (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Icon compacto */}
                        <div
                          className={`p-1.5 shrink-0 ${bounceConfig.color.replace('bg-', 'bg-opacity-10 bg-').replace('text-', 'text-')}`}
                        >
                          <BounceIcon className="h-3.5 w-3.5" />
                        </div>

                        {/* Info compacta */}
                        <div className="min-w-0 flex-1">
                          {/* Email y Badge */}
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {item.email}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-5 ${bounceConfig.color}`}
                            >
                              {bounceConfig.label}
                            </Badge>
                          </div>

                          {/* Customer Info - una sola línea */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {item.customer_nit ? (
                              <span className="font-mono">{item.customer_nit}</span>
                            ) : item.customer_company ? (
                              <span className="truncate max-w-[150px]">{item.customer_company}</span>
                            ) : (
                              <span className="italic">Sin cliente</span>
                            )}
                            <span className="text-muted-foreground/50">•</span>
                            <span>
                              {format(
                                new Date(item.bounced_at),
                                'dd MMM',
                                { locale: es }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Delete button - visible on hover */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
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
