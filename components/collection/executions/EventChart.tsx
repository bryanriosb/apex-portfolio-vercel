'use client'

import { useMemo } from 'react'
import { CollectionEvent } from '@/lib/models/collection'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface EventChartProps {
  events: CollectionEvent[]
}

const eventTypeConfig: Record<string, { label: string; color: string }> = {
  execution_started: { label: 'Inicio ejecución', color: '#22c55e' },
  execution_completed: { label: 'Fin ejecución', color: '#22c55e' },
  execution_failed: { label: 'Fallo', color: '#ef4444' },
  batch_started: { label: 'Inicio lote', color: '#3b82f6' },
  batch_completed: { label: 'Fin lote', color: '#22c55e' },
  email_queued: { label: 'En cola', color: '#6b7280' },
  email_sent: { label: 'Enviado', color: '#f59e0b' },
  email_delivered: { label: 'Entregado', color: '#22c55e' },
  email_opened: { label: 'Abierto', color: '#a855f7' },
  email_clicked: { label: 'Clic', color: '#3b82f6' },
  email_bounced: { label: 'Rebotado', color: '#ef4444' },
  delivered: { label: 'Entregado', color: '#22c55e' },
  opened: { label: 'Abierto', color: '#a855f7' },
  clicked: { label: 'Clic', color: '#3b82f6' },
  bounced: { label: 'Rebotado', color: '#ef4444' },
  fallback_triggered: { label: 'Fallback activado', color: '#f97316' },
  fallback_sent: { label: 'Fallback enviado', color: '#22c55e' },
  retry_attempted: { label: 'Reintento', color: '#3b82f6' },
  error: { label: 'Error', color: '#ef4444' },
}

// Orden lógico de eventos para mostrar
const eventTypePriority: Record<string, number> = {
  execution_started: 1,
  batch_started: 2,
  email_queued: 3,
  email_sent: 4,
  email_delivered: 5,
  delivered: 5,
  email_opened: 6,
  opened: 6,
  email_clicked: 7,
  clicked: 7,
  fallback_triggered: 8,
  fallback_sent: 9,
  retry_attempted: 10,
  batch_completed: 11,
  execution_completed: 12,
  email_bounced: 13,
  bounced: 13,
  execution_failed: 14,
  error: 15,
}

export function EventChart({ events }: EventChartProps) {
  const { chartRows, timeLabels, startTime, endTime } = useMemo(() => {
    if (!events || events.length === 0) {
      return { chartRows: [], timeLabels: [], startTime: null, endTime: null }
    }

    // Ordenar eventos por timestamp
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    // Obtener rango de tiempo
    const start = new Date(sortedEvents[0].timestamp)
    const end = new Date(sortedEvents[sortedEvents.length - 1].timestamp)
    const duration = end.getTime() - start.getTime()

    // Generar etiquetas de tiempo (5 puntos)
    const labelCount = 5
    const labels: Date[] = []
    for (let i = 0; i < labelCount; i++) {
      const time = new Date(start.getTime() + (duration / (labelCount - 1)) * i)
      labels.push(time)
    }

    // Agrupar eventos por tipo
    const groupedByType: Record<string, CollectionEvent[]> = {}
    sortedEvents.forEach((event) => {
      const type = event.event_type
      if (!groupedByType[type]) {
        groupedByType[type] = []
      }
      groupedByType[type].push(event)
    })

    // Crear filas ordenadas por prioridad
    const rows = Object.entries(groupedByType)
      .sort(([typeA], [typeB]) => {
        const priorityA = eventTypePriority[typeA] || 99
        const priorityB = eventTypePriority[typeB] || 99
        return priorityA - priorityB
      })
      .map(([type, typeEvents]) => ({
        type,
        label: eventTypeConfig[type]?.label || type,
        events: typeEvents.map((e) => ({
          ...e,
          position: duration > 0
            ? ((new Date(e.timestamp).getTime() - start.getTime()) / duration) * 100
            : 50,
          time: format(parseISO(e.timestamp), 'HH:mm:ss'),
        })),
      }))

    return { chartRows: rows, timeLabels: labels, startTime: start, endTime: end }
  }, [events])

  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No hay eventos para mostrar
      </div>
    )
  }

  if (chartRows.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No se pudieron procesar los eventos
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Timeline Chart */}
      <div className="relative border rounded-lg p-4 bg-muted/30 min-h-[200px]">
        {/* Y-axis labels and grid */}
        <div className="space-y-3">
          {chartRows.map((row) => (
            <div key={row.type} className="flex items-center gap-4">
              {/* Y-axis label */}
              <div className="w-36 text-xs text-muted-foreground text-right shrink-0 truncate">
                {row.label}
              </div>

              {/* Timeline track */}
              <div className="flex-1 relative h-8">
                {/* Background grid lines */}
                <div className="absolute inset-0 flex justify-between pointer-events-none">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-full w-px bg-border/30"
                      style={{ left: `${i * 25}%`, position: 'absolute' }}
                    />
                  ))}
                </div>

                {/* Horizontal line */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />

                {/* Event dots - todos azules bg-primary */}
                {row.events.map((event, idx) => (
                  <div
                    key={`${event.id}-${idx}`}
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-150 transition-transform z-10 bg-primary"
                    style={{
                      left: `calc(${event.position}% - 6px)`,
                    }}
                    title={`${row.label} - ${event.time}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-4 ml-40 text-xs text-muted-foreground border-t pt-2">
          {timeLabels.map((time, index) => (
            <span key={index}>
              {format(time, 'HH:mm', { locale: es })}
            </span>
          ))}
        </div>
      </div>

      {/* Legend - todos azules */}
      <div className="flex flex-wrap gap-4 pt-2">
        {chartRows.map((row) => (
          <div key={row.type} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="text-muted-foreground/60">({row.events.length})</span>
          </div>
        ))}
      </div>

      {/* Info */}
      {startTime && endTime && (
        <div className="text-xs text-muted-foreground text-center">
          Rango de tiempo: {format(startTime, 'dd/MM/yyyy HH:mm', { locale: es })} - {format(endTime, 'dd/MM/yyyy HH:mm', { locale: es })}
        </div>
      )}
    </div>
  )
}
