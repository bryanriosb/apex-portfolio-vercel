'use client'

import type { ReactNode } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  ListTodo,
  Loader2,
  PlaySquare,
  Repeat,
  UserCheck,
  Workflow,
  Wrench,
} from 'lucide-react'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import type { AuditJobItem } from '@/lib/services/automation/automation-types'
import {
  getApexJobTypeLabel,
  getCategoryLabel,
  getJobKindLabel,
  getJobTypeLabel,
  getModuleLabel,
  getStatusLabel,
  t,
} from '@/lib/i18n'

export const AUDIT_STATUSES = [
  'Pending',
  'Running',
  'Interrupted',
  'Completed',
  'Failed',
  'Recurring',
] as const

export const AUDIT_SOURCES = ['AgentJob', 'AgentWorkflowJob', 'ApexJob'] as const

export function getStatusBadge(status: string) {
  switch (status) {
    case 'Completed':
      return (
        <Badge className="rounded-none gap-1 bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30 hover:bg-green-500/20">
          <CheckCircle2 className="size-3" />
          {getStatusLabel(status)}
        </Badge>
      )
    case 'Failed':
      return (
        <Badge variant="destructive" className="rounded-none gap-1">
          <AlertTriangle className="size-3" />
          {getStatusLabel(status)}
        </Badge>
      )
    case 'Running':
      return (
        <Badge className="rounded-none gap-1 bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20">
          <Loader2 className="size-3 animate-spin" />
          {getStatusLabel(status)}
        </Badge>
      )
    case 'Interrupted':
      return (
        <Badge className="rounded-none gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20">
          <UserCheck className="size-3" />
          {getStatusLabel(status)}
        </Badge>
      )
    case 'Recurring':
      return (
        <Badge variant="secondary" className="rounded-none gap-1">
          <Repeat className="size-3" />
          {getStatusLabel(status)}
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="rounded-none gap-1">
          <Clock className="size-3" />
          {getStatusLabel(status)}
        </Badge>
      )
  }
}

/**
 * Encabezado de estado con el mismo estilo de las columnas del kanban de
 * automatizaciones (KanbanColumn): icono + label uppercase con color por estado.
 */
export function getStatusKanbanHeader(status: string) {
  const styles: Record<string, { icon: ReactNode; colorClass: string; label: string }> = {
    Pending: {
      icon: <ListTodo className="w-4 h-4" />,
      colorClass: 'text-slate-400',
      label: t('ui.pendiente'),
    },
    Running: {
      icon: <PlaySquare className="w-4 h-4" />,
      colorClass: 'text-blue-500',
      label: t('ui.procesando'),
    },
    Interrupted: {
      icon: <AlertCircle className="w-4 h-4" />,
      colorClass: 'text-amber-500',
      label: t('ui.aprobacion'),
    },
    Completed: {
      icon: <Activity className="w-4 h-4" />,
      colorClass: 'text-primary',
      label: t('ui.completado'),
    },
    Failed: {
      icon: <AlertTriangle className="w-4 h-4" />,
      colorClass: 'text-red-500',
      label: getStatusLabel('Failed'),
    },
    Recurring: {
      icon: <Repeat className="w-4 h-4" />,
      colorClass: 'text-violet-500',
      label: getStatusLabel('Recurring'),
    },
  }
  const style = styles[status] ?? {
    icon: <Clock className="w-4 h-4" />,
    colorClass: 'text-muted-foreground',
    label: getStatusLabel(status),
  }
  return (
    <div className={`flex items-center gap-2 ${style.colorClass}`}>
      {style.icon}
      <h3 className="font-semibold text-[11px] uppercase tracking-wider">{style.label}</h3>
    </div>
  )
}

export function getSourceIcon(source: AuditJobItem['source']) {
  switch (source) {
    case 'AgentJob':
      return <Bot className="size-3.5 text-primary" />
    case 'AgentWorkflowJob':
      return <Workflow className="size-3.5 text-primary" />
    default:
      return <Wrench className="size-3.5 text-primary" />
  }
}

const parseDateValue = (val: string | null | undefined): Date | null => {
  if (!val) return null
  const date = new Date(val)
  return isNaN(date.getTime()) ? null : date
}

const formatDuration = (job: AuditJobItem): string => {
  if (job.status !== 'Completed' && job.status !== 'Failed') return '-'
  const start = parseDateValue(job.created_at)
  const end = parseDateValue(job.updated_at)
  if (!start || !end) return '-'
  const ms = end.getTime() - start.getTime()
  if (ms < 0) return '-'
  if (ms < 1000) return `${ms} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ${Math.round(seconds % 60)} s`
  const hours = Math.floor(minutes / 60)
  return `${hours} h ${minutes % 60} min`
}

const formatDate = (val: string, timezone: string) => {
  const date = parseDateValue(val)
  if (!date) return '-'
  try {
    return formatInTimeZone(date, timezone, 'MMM dd, yyyy HH:mm:ss', { locale: es })
  } catch {
    return '-'
  }
}

export const getAuditJobsColumns = (timezone: string): ColumnDef<AuditJobItem>[] => [
  {
    id: 'expander',
    header: '',
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={(e) => {
          e.stopPropagation()
          row.toggleExpanded()
        }}
        aria-label={row.getIsExpanded() ? t('ui.colapsar') : t('ui.expandir')}
      >
        <ChevronDown
          className={`size-4 text-muted-foreground transition-transform ${
            row.getIsExpanded() ? 'rotate-180' : ''
          }`}
        />
      </Button>
    ),
  },
  {
    accessorKey: 'name',
    header: t('ui.trabajo'),
    cell: ({ row }) => (
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-sm truncate max-w-[280px]" title={row.original.name}>
          {row.original.name || '-'}
        </span>
        <span className="text-[11px] text-muted-foreground font-mono truncate">
          {row.original.id}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'source',
    header: t('ui.tipo'),
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {getSourceIcon(row.original.source)}
          <span className="text-sm">{getJobTypeLabel(row.original.source)}</span>
        </div>
        {row.original.job_type && (
          <span className="text-[11px] text-muted-foreground pl-5">
            {getApexJobTypeLabel(row.original.job_type)}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'module',
    header: t('ui.modulo'),
    cell: ({ row }) => (
      <Badge variant="outline" className="rounded-none font-normal">
        {getModuleLabel(row.original.module)}
      </Badge>
    ),
  },
  {
    accessorKey: 'category',
    header: t('ui.categoria'),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {row.original.category ? getCategoryLabel(row.original.category) : '-'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: t('ui.estado'),
    cell: ({ row }) => getStatusBadge(row.original.status),
  },
  {
    accessorKey: 'kind',
    header: t('ui.tipoDeEjecucion'),
    cell: ({ row }) => {
      const { kind, cron } = row.original
      return (
        <div className="flex flex-col gap-0.5">
          <Badge variant="secondary" className="rounded-none font-normal w-fit">
            {cron ? getJobKindLabel('Recurring') : getJobKindLabel(kind)}
          </Badge>
          {cron && <span className="text-[11px] font-mono text-muted-foreground">{cron}</span>}
        </div>
      )
    },
  },
  {
    accessorKey: 'created_at',
    header: t('ui.creado'),
    cell: ({ row }) => (
      <span className="text-sm font-mono whitespace-nowrap">
        {formatDate(row.original.created_at, timezone)}
      </span>
    ),
  },
  {
    id: 'duration',
    header: t('ui.duracion'),
    cell: ({ row }) => (
      <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
        {formatDuration(row.original)}
      </span>
    ),
  },
]
