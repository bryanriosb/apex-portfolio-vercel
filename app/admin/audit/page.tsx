'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { DatePickerWithRange } from '@/components/ui/date-picker-range'
import PingPulse from '@/components/ui/ping-pulse'
import { DataTable, type DataTableRef, type FilterConfig } from '@/components/DataTable'
import {
  AUDIT_SOURCES,
  AUDIT_STATUSES,
  getAuditJobsColumns,
  getStatusKanbanHeader,
} from '@/components/audit/AuditJobsColumns'
import { AuditJobTraceView } from '@/components/audit/AuditJobTraceView'
import { getAuditJobsAction } from '@/lib/actions/automation'
import { useAutomationWebSocket } from '@/hooks/use-automation-websocket'
import { useAutomationEventsStore } from '@/lib/store/automation-events-store'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import type {
  AuditJobItem,
  AutomationServerEvent,
} from '@/lib/services/automation/automation-types'
import { modules as moduleLabels } from '@/lib/i18n/es-automation'
import { getJobTypeLabel, getModuleLabel, getStatusLabel, t } from '@/lib/i18n'

const toArray = (value: unknown): string[] | undefined => {
  if (value == null || value === '') return undefined
  return Array.isArray(value) ? value.map(String) : [String(value)]
}

export default function AuditPage() {
  const { activeBusiness } = useActiveBusinessStore()
  const timezone = activeBusiness?.timezone || 'America/Bogota'

  const tableRef = useRef<DataTableRef>(null)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [hasActivity, setHasActivity] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const service = useMemo(
    () => ({
      fetchItems: async (params: Record<string, any>) => {
        try {
          const response = await getAuditJobsAction({
            status: toArray(params.status),
            source: toArray(params.source),
            module: toArray(params.module)?.join(','),
            search: params.search || undefined,
            from: params.from,
            to: params.to,
            page: params.page,
            page_size: params.page_size,
          })
          setStatusCounts(response.status_counts ?? {})
          setHasActivity(false)
          return {
            data: response.items,
            total: response.total,
            total_pages: Math.max(1, Math.ceil(response.total / response.page_size)),
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t('ui.errorCargandoAuditoria'))
          return { data: [], total: 0, total_pages: 1 }
        }
      },
    }),
    []
  )

  const defaultQueryParams = useMemo(() => {
    if (!dateRange?.from) return {}
    const endOfDay = new Date(dateRange.to ?? dateRange.from)
    endOfDay.setHours(23, 59, 59, 999)
    return {
      from: dateRange.from.toISOString(),
      to: endOfDay.toISOString(),
    }
  }, [dateRange])

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        column: 'status',
        title: t('ui.estado'),
        options: AUDIT_STATUSES.map((status) => ({
          label: getStatusLabel(status),
          value: status,
        })),
      },
      {
        column: 'source',
        title: t('ui.tipo'),
        options: AUDIT_SOURCES.map((source) => ({
          label: getJobTypeLabel(source),
          value: source,
        })),
      },
      {
        column: 'module',
        title: t('ui.modulo'),
        options: Object.keys(moduleLabels).map((module) => ({
          label: getModuleLabel(module),
          value: module,
        })),
      },
    ],
    []
  )

  const handleEvent = useCallback((event: AutomationServerEvent) => {
    if (event.type === 'Pong') return
    useAutomationEventsStore.getState().addEvent(event)
    if (event.type === 'JobStateChanged') {
      setHasActivity(true)
    }
  }, [])

  const { isConnected } = useAutomationWebSocket(handleEvent)

  const columns = useMemo(() => getAuditJobsColumns(timezone), [timezone])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t('ui.auditoria')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {t('ui.auditoriaDescripcion')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasActivity && (
            <Button
              variant="outline"
              size="sm"
              className="border-primary/40 text-primary"
              onClick={() => tableRef.current?.refreshData()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('ui.nuevosEventosDisponibles')}
            </Button>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border px-2.5 py-1.5 bg-muted/20">
            <PingPulse color={isConnected ? 'green-500' : 'red-500'} />
            {isConnected ? t('ui.enVivo') : t('ui.desconectado')}
          </div>
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {AUDIT_STATUSES.map((status) => (
          <div
            key={status}
            className="flex flex-col items-start gap-1.5 border border-border bg-muted/10 p-3"
          >
            {getStatusKanbanHeader(status)}
            <span className="text-xl font-bold leading-none">
              {(statusCounts[status] ?? 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <DataTable
        ref={tableRef}
        columns={columns}
        service={service}
        defaultQueryParams={defaultQueryParams}
        filters={filters}
        searchConfig={{
          column: 'name',
          placeholder: t('ui.buscarTrabajos'),
          serverField: 'search',
        }}
        getRowId={(row: AuditJobItem) => row.id}
        refreshKey="audit-jobs"
        renderExpandedRow={(row) => (
          <AuditJobTraceView job={row.original as AuditJobItem} timezone={timezone} isConnected={isConnected} />
        )}
        emptyState={
          <div className="flex flex-col items-center justify-center gap-3 py-8">
            <ShieldCheck className="h-10 w-10 text-muted-foreground/50" />
            <div className="text-center">
              <p className="font-medium">{t('ui.sinTrabajosRegistrados')}</p>
              <p className="text-sm text-muted-foreground">{t('ui.sinTrabajosDescripcion')}</p>
            </div>
          </div>
        }
      />
    </div>
  )
}
