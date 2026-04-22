'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Upload,
  ArrowRight,
  AlertCircle,
  DollarSign,
  FileText,
  Users,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import {
  getTodayTransactionsSummaryAction,
  getUnidentifiedTransactionsCountAction,
} from '@/lib/actions/bank-transactions'

export default function TransactionsPage() {
  const { activeBusiness } = useActiveBusinessStore()
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({
    todayCount: 0,
    todayAmount: 0,
    unidentifiedCount: 0,
  })

  useEffect(() => {
    const loadStats = async () => {
      if (!activeBusiness?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const [todaySummary, unidentifiedCount] = await Promise.all([
          getTodayTransactionsSummaryAction(activeBusiness.id),
          getUnidentifiedTransactionsCountAction(activeBusiness.id),
        ])

        setStats({
          todayCount: todaySummary.count,
          todayAmount: todaySummary.total_amount,
          unidentifiedCount,
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [activeBusiness?.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Transacciones Bancarias
          </h1>
          <p className="text-muted-foreground">
            Importa y gestiona transacciones de extractos bancarios
          </p>
        </div>
        <Link href="/admin/collection/transactions/import">
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Importar Extracto
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Transacciones Hoy
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Cargando...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.todayCount}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(stats.todayAmount)} total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Sin Identificar
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">Cargando...</span>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats.unidentifiedCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pendientes de asociar
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acciones</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link
                href="/admin/collection/transactions/import"
                className="block text-sm text-primary hover:underline"
              >
                Importar nuevo extracto
              </Link>
              <Link
                href="/admin/collection/transactions/unidentified"
                className="block text-sm text-primary hover:underline"
              >
                Ver transacciones pendientes
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.unidentifiedCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
                <Users className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="font-medium">
                  Hay {stats.unidentifiedCount} transacciones sin identificar
                </p>
                <p className="text-sm text-muted-foreground">
                  Asocia las transacciones a clientes para mejorar el seguimiento
                  de pagos
                </p>
              </div>
            </div>
            <Link href="/admin/collection/transactions/unidentified">
              <Button>
                Revisar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="border p-8 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto rounded-full">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Importar Transacciones</h3>
          <p className="text-muted-foreground text-sm">
            Sube un archivo Excel con múltiples hojas (una por banco) para
            detectar automáticamente pagos de clientes y asociarlos a sus
            cuentas. El nombre de cada hoja se usará como nombre del banco.
          </p>
          <Link href="/admin/collection/transactions/import">
            <Button className="mt-4">
              Comenzar Importación
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
