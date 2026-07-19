'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { es } from 'date-fns/locale'
import { AlertTriangle, Activity, FileText, Fingerprint, MoveRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { JobObservabilityViewer } from '@/components/automation/JobObservabilityViewer'
import { WorkflowLiveView } from '@/components/workflows/WorkflowLiveView'
import { getApexJobAction } from '@/lib/actions/automation'
import {
  safeParseJSON,
  type AuditJobItem,
  type AutomationServerEvent,
} from '@/lib/services/automation/automation-types'
import { useAutomationEventsStore } from '@/lib/store/automation-events-store'
import {
  getEventLabel,
  getJobKindLabel,
  getLogLevelLabel,
  getNodeTypeLabel,
  getStatusLabel,
  getToolNameLabel,
  t,
} from '@/lib/i18n'

interface AuditJobTraceViewProps {
  job: AuditJobItem
  timezone: string
  isConnected?: boolean
}

const formatTs = (val: string, timezone: string): string => {
  const date = new Date(val)
  if (isNaN(date.getTime())) return '-'
  try {
    return formatInTimeZone(date, timezone, 'MMM dd, yyyy HH:mm:ss', { locale: es })
  } catch {
    return '-'
  }
}

function liveEventDetail(event: AutomationServerEvent): React.ReactNode {
  switch (event.type) {
    case 'JobStateChanged':
      return (
        <span className="flex items-center gap-1.5">
          {getStatusLabel(event.old_status)}
          <MoveRight className="size-3 text-muted-foreground" />
          {getStatusLabel(event.new_status)}
        </span>
      )
    case 'WorkflowLog':
      return `${getLogLevelLabel(event.level)}: ${event.message}`
    case 'ToolCallStarted':
    case 'ToolCallCompleted': {
      const name = getToolNameLabel(event.tool_name)
      if (event.type === 'ToolCallCompleted') {
        return `${name} · ${event.success ? t('ui.exitoso') : t('ui.fallido')}${
          event.duration_ms != null ? ` · ${event.duration_ms} ms` : ''
        }`
      }
      return name
    }
    case 'AgentThinking':
    case 'AgentResolved':
      return event.agent_name
    case 'WorkflowNodeStarted':
    case 'WorkflowNodeCompleted': {
      const nodeType = 'node_type' in event && event.node_type ? getNodeTypeLabel(event.node_type) : ''
      return `${t('ui.nodo')} ${event.node_id}${nodeType ? ` (${nodeType})` : ''}`
    }
    case 'SkillsResolved':
      return event.skills?.map((s) => s.name).join(', ') || '-'
    case 'ToolConnectionChanged':
      return getToolNameLabel(event.tool_name)
    case 'CronTriggered':
      return event.cron_expression || '-'
    default:
      return null
  }
}

function LiveEventsSection({ jobId, timezone }: { jobId: string; timezone: string }) {
  const events = useAutomationEventsStore((s) => s.events)
  const jobEvents = useMemo(
    () => events.filter((e) => 'job_id' in e && e.job_id === jobId),
    [events, jobId]
  )

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground border-b border-border pb-2">
        <Activity className="size-4 text-primary" />
        {t('ui.eventosEnVivo')}
      </h4>
      {jobEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">{t('ui.sinEventosEnVivo')}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border/60 border border-border bg-background">
          {jobEvents.map((event, idx) => (
            <div key={`${event.type}-${event.timestamp}-${idx}`} className="flex items-center gap-3 px-3 py-2">
              <Badge variant="outline" className="rounded-none font-normal text-[10px] shrink-0">
                {getEventLabel(event.type)}
              </Badge>
              <span className="text-xs text-foreground/90 min-w-0 truncate flex-1">
                {liveEventDetail(event)}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                {formatTs(event.timestamp, timezone)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ApexJobResult({ jobId }: { jobId: string }) {
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getApexJobAction(jobId)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch(() => {
        if (!cancelled) setDetail(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [jobId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        {t('ui.obteniendoRegistros')}
      </div>
    )
  }

  const result = detail?.result ? safeParseJSON(detail.result) : null
  if (!result) return null

  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground border-b border-border pb-2">
        <FileText className="size-4 text-primary" />
        {t('ui.resultado')}
      </h4>
      <pre className="text-[11px] font-mono bg-muted/20 border border-border p-3 overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
        {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}

export function AuditJobTraceView({ job, timezone, isConnected }: AuditJobTraceViewProps) {
  const isAgentic = job.source === 'AgentJob' || job.source === 'AgentWorkflowJob'
  const isWorkflowJob = job.source === 'AgentWorkflowJob'

  const identifiers: Array<{ label: string; value?: string }> = [
    { label: t('ui.idTrabajo'), value: job.id },
    { label: t('ui.idReferencia'), value: job.reference_id },
    { label: t('ui.idSesion'), value: job.session_id },
    { label: t('ui.usuarioId'), value: job.user_id },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 bg-muted/10 border-t border-border">
      {isWorkflowJob && <WorkflowLiveView jobId={job.id} isConnected={isConnected} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground border-b border-border pb-2">
            <Fingerprint className="size-4 text-primary" />
            {t('ui.identificadores')}
          </h4>
          <div className="flex flex-col gap-1.5">
            {identifiers
              .filter((item) => item.value)
              .map((item) => (
                <div key={item.label} className="flex flex-col sm:flex-row sm:items-baseline gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground sm:min-w-[130px] shrink-0">
                    {item.label}
                  </span>
                  <span className="text-xs font-mono text-foreground break-all">{item.value}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground border-b border-border pb-2">
            <Activity className="size-4 text-primary" />
            {t('ui.detallesDelTrabajo')}
          </h4>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="text-[11px] font-medium text-muted-foreground sm:min-w-[130px] shrink-0">
                {t('ui.tipoDeEjecucion')}
              </span>
              <span className="text-xs text-foreground">
                {getJobKindLabel(job.kind)}
                {job.cron ? ` · ${job.cron}` : ''}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="text-[11px] font-medium text-muted-foreground sm:min-w-[130px] shrink-0">
                {t('ui.creado')}
              </span>
              <span className="text-xs font-mono text-foreground">
                {formatTs(job.created_at, timezone)}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-1">
              <span className="text-[11px] font-medium text-muted-foreground sm:min-w-[130px] shrink-0">
                {t('ui.actualizado')}
              </span>
              <span className="text-xs font-mono text-foreground">
                {formatTs(job.updated_at, timezone)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {job.error_message && (
        <div className="flex flex-col gap-2 p-3 bg-red-500/10 border border-red-500/20">
          <span className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="size-4" />
            {t('ui.mensajeDeError')}
          </span>
          <p className="text-xs font-mono text-red-600/90 dark:text-red-400/90 whitespace-pre-wrap break-words">
            {job.error_message}
          </p>
        </div>
      )}

      <LiveEventsSection jobId={job.id} timezone={timezone} />

      {isAgentic ? (
        <div className="max-h-[30rem] overflow-y-auto overflow-x-hidden border border-border bg-background p-4 min-w-0">
          <JobObservabilityViewer jobId={job.id} sessionId={job.session_id} showCosts={false} />
        </div>
      ) : (
        <ApexJobResult jobId={job.id} />
      )}
    </div>
  )
}
