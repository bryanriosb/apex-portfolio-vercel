'use client'

import { useEffect, useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { KPICard, KPIGrid } from './KPICard'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchAccountsReceivableAction,
  type AccountsReceivableSummary,
} from '@/lib/actions/appointment-payment'
import AppointmentDetailsModal from '@/components/appointments/AppointmentDetailsModal'
import CustomerDetailsModal from '@/components/customers/CustomerDetailsModal'
import { Wallet, Receipt, AlertCircle, Clock, Eye } from 'lucide-react'

interface AccountsReceivableReportProps {
  businessId: string
  startDate: Date
  endDate: Date
  businessData?: {
    name: string
    address?: string
    phone?: string
    nit?: string
    business_account_id?: string
  }
}

export function AccountsReceivableReport({
  businessId,
  startDate,
  endDate,
  businessData,
}: AccountsReceivableReportProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AccountsReceivableSummary | null>(null)
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  )
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const result = await fetchAccountsReceivableAction({
        business_id: businessId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      setData(result)
    } catch (error) {
      console.error('Error fetching accounts receivable:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (businessId) {
      fetchData()
    }
  }, [businessId, startDate, endDate])

  const partialPaymentsCount = useMemo(() => {
    if (!data) return 0
    return data.items.filter((item) => item.amount_paid_cents > 0).length
  }, [data])

  const unpaidCount = useMemo(() => {
    if (!data) return 0
    return data.items.filter((item) => item.amount_paid_cents === 0).length
  }, [data])

  const averageBalance = useMemo(() => {
    if (!data || data.total_appointments === 0) return 0
    return data.total_receivable_cents / data.total_appointments
  }, [data])

  const handleViewAppointment = (appointmentId: string) => {
    setSelectedAppointmentId(appointmentId)
    setDetailsModalOpen(true)
  }

  const handleViewCustomer = (customerId: string | null) => {
    if (customerId) {
      setSelectedCustomerId(customerId)
      setCustomerModalOpen(true)
    }
  }

  const handleStatusChange = () => {
    fetchData()
  }

  return (
    <div className="space-y-6">
      <KPIGrid>
        <KPICard
          title="Total por Cobrar"
          value={formatCurrency((data?.total_receivable_cents || 0) / 100)}
          subtitle="Saldo pendiente total"
          icon={Wallet}
          loading={loading}
          variant="warning"
        />
        <KPICard
          title="Citas con Saldo"
          value={data?.total_appointments || 0}
          subtitle="Citas pendientes de pago"
          icon={Receipt}
          loading={loading}
        />
        <KPICard
          title="Sin Pagar"
          value={unpaidCount}
          subtitle="Sin ningún abono"
          icon={AlertCircle}
          loading={loading}
          variant="danger"
        />
        <KPICard
          title="Con Abonos"
          value={partialPaymentsCount}
          subtitle="Pagos parciales"
          icon={Clock}
          loading={loading}
        />
      </KPIGrid>

      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-amber-500" />
            Detalle de Cartera
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : data?.items && data.items.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Fecha Cita</TableHead>
                    <TableHead>Especialista</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Abonado</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={item.appointment_id}>
                      <TableCell>
                        <button
                          onClick={() => handleViewCustomer(item.customer_id)}
                          className="text-left hover:underline"
                          disabled={!item.customer_id}
                        >
                          <p className="font-medium text-primary">
                            {item.customer_name}
                          </p>
                          {item.customer_phone && (
                            <p className="text-xs text-muted-foreground">
                              {item.customer_phone}
                            </p>
                          )}
                        </button>
                      </TableCell>
                      <TableCell>
                        {format(new Date(item.appointment_date), 'd MMM yyyy', {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>{item.specialist_name}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.total_price_cents / 100)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {item.amount_paid_cents > 0
                          ? formatCurrency(item.amount_paid_cents / 100)
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-600">
                        {formatCurrency(item.balance_due_cents / 100)}
                      </TableCell>
                      <TableCell>
                        {item.amount_paid_cents > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-700 border-amber-200"
                          >
                            Abonado
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            Sin pagar
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleViewAppointment(item.appointment_id)
                            }
                            title="Ver cita"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>No hay saldos pendientes</p>
              <p className="text-sm">¡Todas las citas están pagadas!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.total_appointments > 0 && (
        <Card className="border">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(averageBalance / 100)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Saldo promedio por cita
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.total_appointments}</p>
                <p className="text-xs text-muted-foreground">
                  Citas pendientes
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    data.items.reduce(
                      (sum, i) => sum + i.amount_paid_cents,
                      0
                    ) / 100
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Total abonado</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">
                  {formatCurrency(data.total_receivable_cents / 100)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Total por cobrar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <AppointmentDetailsModal
        appointmentId={selectedAppointmentId}
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        onStatusChange={handleStatusChange}
        businessData={businessData}
      />

      <CustomerDetailsModal
        customerId={selectedCustomerId}
        businessId={businessId}
        open={customerModalOpen}
        onOpenChange={setCustomerModalOpen}
      />
    </div>
  )
}
