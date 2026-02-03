'use client'

import { useRef, useMemo, useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Search, CreditCard, Building2, RefreshCw, X, MoreHorizontal, Eye } from 'lucide-react'
import PlanService, {
  type BusinessAccountWithPlan,
} from '@/lib/services/plan/plan-service'
import type { Plan } from '@/lib/models/plan/plan'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { USER_ROLES } from '@/const/roles'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AssignPlanModal } from '@/components/plans/AssignPlanModal'
import { BusinessAccountDetailModal } from '@/components/business-accounts/BusinessAccountDetailModal'
import type { BusinessAccount } from '@/lib/models/business-account/business-account'

export default function PlanAssignmentsPage() {
  const planService = useMemo(() => new PlanService(), [])
  const { role } = useCurrentUser()

  const [accounts, setAccounts] = useState<BusinessAccountWithPlan[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlanId, setFilterPlanId] = useState<string>('all')
  const [filterHasPlan, setFilterHasPlan] = useState<string>('all')
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<BusinessAccountWithPlan | null>(null)
  const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<BusinessAccount | null>(null)

  if (role !== USER_ROLES.COMPANY_ADMIN) {
    redirect('/admin')
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [accountsRes, plansRes] = await Promise.all([
        planService.fetchAccountsWithPlans({
          page_size: 100,
          company_name: searchTerm || undefined,
          plan_id: filterPlanId !== 'all' ? filterPlanId : undefined,
          has_plan:
            filterHasPlan === 'yes' ? 'yes' : filterHasPlan === 'no' ? 'no' : undefined,
        }),
        planService.fetchActivePlans(),
      ])
      setAccounts(accountsRes.data)
      setPlans(plansRes)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error al cargar los datos')
    } finally {
      setIsLoading(false)
    }
  }, [planService, searchTerm, filterPlanId, filterHasPlan])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSelectAccount = (accountId: string, checked: boolean) => {
    setSelectedAccounts((prev) =>
      checked ? [...prev, accountId] : prev.filter((id) => id !== accountId)
    )
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedAccounts(checked ? accounts.map((a) => a.id) : [])
  }

  const handleAssignPlan = (account: BusinessAccountWithPlan) => {
    setSelectedAccount(account)
    setAssignModalOpen(true)
  }

  const handleViewDetail = (account: BusinessAccountWithPlan) => {
    // Convertir BusinessAccountWithPlan a BusinessAccount para el modal de detalle
    const accountForDetail = {
      id: account.id,
      company_name: account.company_name,
      contact_name: account.contact_name,
      contact_email: account.contact_email,
      status: account.status as any,
      created_at: account.created_at,
      // Campos que no tenemos en BusinessAccountWithPlan, usamos valores por defecto
      tax_id: null,
      legal_name: null,
      billing_address: null,
      billing_city: null,
      billing_state: null,
      billing_postal_code: null,
      billing_country: 'CO',
      contact_phone: null,
      subscription_plan: 'trial',
      trial_ends_at: null,
      subscription_started_at: null,
      settings: null,
      created_by: '',
      updated_at: account.created_at,
      plan_id: account.plan_id,
    } as BusinessAccount & { plan_id: string | null }
    setSelectedAccountForDetail(accountForDetail)
    // También guardamos la cuenta completa para tener acceso al plan
    setSelectedAccount(account)
    setDetailModalOpen(true)
  }

  const handleBulkAssign = () => {
    setSelectedAccount(null)
    setAssignModalOpen(true)
  }

  const handleAssignComplete = async (planId: string | null) => {
    try {
      if (selectedAccount) {
        const result = await planService.assignPlanToAccount(selectedAccount.id, planId)
        if (result.success) {
          toast.success(
            planId ? 'Plan asignado correctamente' : 'Plan removido correctamente'
          )
        } else {
          throw new Error(result.error)
        }
      } else if (selectedAccounts.length > 0) {
        const result = await planService.bulkAssignPlanToAccounts(selectedAccounts, planId)
        if (result.success) {
          toast.success(
            `Plan ${planId ? 'asignado' : 'removido'} a ${result.updatedCount} cuenta(s)`
          )
          setSelectedAccounts([])
        } else {
          throw new Error(result.error)
        }
      }
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error al asignar el plan')
    }
  }

  const allSelected = accounts.length > 0 && selectedAccounts.length === accounts.length
  const someSelected = selectedAccounts.length > 0 && selectedAccounts.length < accounts.length

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Asignación de Planes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Asigna planes a las cuentas de negocio
          </p>
        </div>
        {selectedAccounts.length > 0 && (
          <Button onClick={handleBulkAssign}>
            <CreditCard className="mr-2 h-4 w-4" />
            Asignar Plan ({selectedAccounts.length})
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre de empresa..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterPlanId} onValueChange={setFilterPlanId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterHasPlan} onValueChange={setFilterHasPlan}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Estado de plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="yes">Con plan</SelectItem>
            <SelectItem value="no">Sin plan</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={loadData} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleccionar todo"
                  className={someSelected ? 'opacity-50' : ''}
                />
              </TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Plan Actual</TableHead>
              <TableHead>Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No se encontraron cuentas
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedAccounts.includes(account.id)}
                      onCheckedChange={(checked) =>
                        handleSelectAccount(account.id, checked as boolean)
                      }
                      aria-label={`Seleccionar ${account.company_name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{account.company_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {account.contact_email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{account.contact_name || '-'}</span>
                  </TableCell>
                  <TableCell>
                    {account.plan ? (
                      <Badge variant="default" className="gap-1">
                        <CreditCard className="h-3 w-3" />
                        {account.plan.name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <X className="h-3 w-3" />
                        Sin plan
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(account.created_at), 'dd MMM yyyy', { locale: es })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDetail(account)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAssignPlan(account)}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          {account.plan ? 'Cambiar Plan' : 'Asignar Plan'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AssignPlanModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        account={selectedAccount}
        accountCount={selectedAccount ? 1 : selectedAccounts.length}
        plans={plans}
        onAssign={handleAssignComplete}
      />

      <BusinessAccountDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        account={selectedAccountForDetail}
        plan={selectedAccount?.plan || null}
      />
    </div>
  )
}
