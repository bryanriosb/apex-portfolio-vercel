'use client'

import { useState, useEffect } from 'react'
import { Receipt, CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getPaymentHistoryAction } from '@/lib/actions/subscription'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import type { PaymentHistory as PaymentHistoryType } from '@/lib/models/subscription/subscription'

export function PaymentHistory() {
  const { activeBusiness } = useActiveBusinessStore()
  const [payments, setPayments] = useState<PaymentHistoryType[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchHistory = async () => {
    if (!activeBusiness?.business_account_id) return

    setIsLoading(true)
    const data = await getPaymentHistoryAction(activeBusiness.business_account_id)
    setPayments(data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [activeBusiness?.business_account_id])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Aprobado
          </Badge>
        )
      case 'pending':
      case 'in_process':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendiente
          </Badge>
        )
      case 'rejected':
      case 'cancelled':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rechazado
          </Badge>
        )
      case 'refunded':
        return (
          <Badge variant="outline" className="gap-1">
            <RefreshCw className="h-3 w-3" />
            Reembolsado
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (isLoading) {
    return <PaymentHistorySkeleton />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
            <CardDescription>
              Tus últimas transacciones
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchHistory}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay pagos registrados</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {formatDate(payment.created_at)}
                  </TableCell>
                  <TableCell>
                    {payment.description || 'Suscripción'}
                  </TableCell>
                  <TableCell className="capitalize">
                    {payment.payment_method || '-'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(payment.amount_cents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function PaymentHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
