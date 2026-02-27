'use client'

import { useState, useMemo } from 'react'
import {
  CollectionEvent,
  EventType,
  EventStatus,
} from '@/lib/models/collection'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { formatInBusinessTimeZone } from '@/lib/utils/date-format'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  ChevronRight,
  RefreshCcw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  MailOpen,
  AlertTriangle,
  RotateCcw,
  Zap,
  Play,
  Flag,
  MessageSquare,
  Smartphone,
  AlertOctagon,
  Package,
  Info,
  X,
} from 'lucide-react'

interface EventLogProps {
  events: CollectionEvent[]
  onRefresh?: () => void
  isRefreshing?: boolean
}

const eventTypeConfig: Record<
  EventType,
  { label: string; color: string; icon: any; bgColor: string }
> = {
  execution_started: {
    label: 'Ejecución iniciada',
    color: 'text-green-600',
    icon: Play,
    bgColor: 'bg-green-50',
  },
  execution_completed: {
    label: 'Ejecución completada',
    color: 'text-green-600',
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
  },
  execution_failed: {
    label: 'Ejecución fallida',
    color: 'text-red-600',
    icon: XCircle,
    bgColor: 'bg-red-50',
  },
  batch_started: {
    label: 'Lote iniciado',
    color: 'text-blue-600',
    icon: Package,
    bgColor: 'bg-blue-50',
  },
  batch_completed: {
    label: 'Lote completado',
    color: 'text-green-600',
    icon: Package,
    bgColor: 'bg-green-50',
  },
  email_queued: {
    label: 'Email en cola',
    color: 'text-gray-600',
    icon: Clock,
    bgColor: 'bg-gray-50',
  },
  email_sent: {
    label: 'Email enviado',
    color: 'text-yellow-600',
    icon: Mail,
    bgColor: 'bg-yellow-50',
  },
  email_delivered: {
    label: 'Email entregado',
    color: 'text-green-600',
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
  },
  email_opened: {
    label: 'Email abierto',
    color: 'text-purple-600',
    icon: MailOpen,
    bgColor: 'bg-purple-50',
  },
  email_bounced: {
    label: 'Email rebotado',
    color: 'text-red-600',
    icon: AlertTriangle,
    bgColor: 'bg-red-50',
  },
  email_clicked: {
    label: 'Email clicado',
    color: 'text-blue-500',
    icon: MessageSquare,
    bgColor: 'bg-blue-50',
  },
  fallback_triggered: {
    label: 'Fallback activado',
    color: 'text-orange-600',
    icon: Zap,
    bgColor: 'bg-orange-50',
  },
  fallback_sent: {
    label: 'Fallback enviado',
    color: 'text-green-600',
    icon: MessageSquare,
    bgColor: 'bg-green-50',
  },
  retry_attempted: {
    label: 'Reintento',
    color: 'text-blue-600',
    icon: RotateCcw,
    bgColor: 'bg-blue-50',
  },
  error: {
    label: 'Error',
    color: 'text-red-600',
    icon: AlertOctagon,
    bgColor: 'bg-red-50',
  },
}

const statusConfig: Record<EventStatus, { label: string; variant: any }> = {
  success: { label: 'Éxito', variant: 'default' },
  error: { label: 'Error', variant: 'destructive' },
  pending: { label: 'Pendiente', variant: 'secondary' },
}

export function EventLog({ events, onRefresh, isRefreshing }: EventLogProps) {
  const [selectedEvent, setSelectedEvent] = useState<CollectionEvent | null>(
    null
  )
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Get unique event types from events
  const availableEventTypes = useMemo(() => {
    const types = new Set<string>()
    events.forEach((event) => types.add(event.event_type))
    return Array.from(types).sort()
  }, [events])

  // Filter events
  const filteredEvents = useMemo(() => {
    if (selectedFilters.size === 0) return events
    return events.filter((event) => selectedFilters.has(event.event_type))
  }, [events, selectedFilters])

  // Sort events by timestamp descending
  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const toggleFilter = (eventType: string) => {
    const newFilters = new Set(selectedFilters)
    if (newFilters.has(eventType)) {
      newFilters.delete(eventType)
    } else {
      newFilters.add(eventType)
    }
    setSelectedFilters(newFilters)
  }

  const clearFilters = () => {
    setSelectedFilters(new Set())
  }

  const { user } = useCurrentUser()
  const timezone = user?.timezone || 'America/Bogota'

  const formatEventTime = (timestamp: string) => {
    return formatInBusinessTimeZone(timestamp, 'MMM d, yyyy, h:mm a', timezone)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Event List */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-medium">
            Logs de Eventos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCcw
                className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </Button>

            {/* Filter Popover */}
            <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative">
                  <Filter className="h-4 w-4 mr-1" />
                  Filtro
                  {selectedFilters.size > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                    >
                      {selectedFilters.size}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">
                      Filtrar por tipo
                    </span>
                    {selectedFilters.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto py-1 px-2 text-xs"
                      >
                        Limpiar
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="p-2 space-y-1">
                    {availableEventTypes.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No hay eventos disponibles
                      </div>
                    ) : (
                      availableEventTypes.map((eventType) => {
                        const config = eventTypeConfig[
                          eventType as EventType
                        ] || {
                          label: eventType,
                          color: 'text-gray-600',
                          icon: Info,
                          bgColor: 'bg-gray-50',
                        }
                        const Icon = config.icon
                        const isSelected = selectedFilters.has(eventType)
                        const count = events.filter(
                          (e) => e.event_type === eventType
                        ).length

                        return (
                          <div
                            key={eventType}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted transition-colors ${isSelected ? 'bg-muted' : ''
                              }`}
                            onClick={() => toggleFilter(eventType)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleFilter(eventType)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className={`p-1.5 rounded ${config.bgColor}`}>
                              <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                            </div>
                            <span className="flex-1 text-sm">
                              {config.label}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {count}
                            </Badge>
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {sortedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                {selectedFilters.size > 0 ? (
                  <>
                    <Filter className="h-8 w-8 mb-2 opacity-50" />
                    <p>No hay eventos que coincidan con los filtros</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="mt-2"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpiar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <Info className="h-8 w-8 mb-2 opacity-50" />
                    <p>No hay eventos registrados</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {sortedEvents.map((event) => {
                  const config = eventTypeConfig[event.event_type] || {
                    label: event.event_type,
                    color: 'text-gray-600',
                    icon: Info,
                    bgColor: 'bg-gray-50',
                  }
                  const Icon = config.icon
                  const isSelected = selectedEvent?.id === event.id

                  return (
                    <div
                      key={event.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? 'bg-muted' : ''
                        }`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {config.label}
                              </p>
                              {event.client_id && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Cliente: {event.client_id}
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatEventTime(event.timestamp)}
                            </span>
                            {event.error_details && (
                              <Badge variant="destructive" className="text-xs">
                                Error
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detalle del Evento */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">
            {selectedEvent ? 'Detalle del Evento' : 'Detalles del Evento'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedEvent ? (
            <div className="space-y-6">
              {/* Metadata Section */}
              <div>
                <h4 className="text-sm font-medium mb-3">Metadata</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">
                      {eventTypeConfig[selectedEvent.event_type]?.label ||
                        selectedEvent.event_type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge
                      variant={statusConfig[selectedEvent.event_status].variant}
                    >
                      {statusConfig[selectedEvent.event_status].label}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha:</span>
                    <span>{formatEventTime(selectedEvent.timestamp)}</span>
                  </div>
                  {selectedEvent.client_id && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente ID:</span>
                      <span className="font-mono text-xs">
                        {selectedEvent.client_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Event Data */}
              {selectedEvent.event_data &&
                Object.keys(selectedEvent.event_data).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">
                      Datos del Evento
                    </h4>
                    <div className="bg-muted rounded-lg p-3">
                      <pre className="text-xs overflow-auto">
                        {JSON.stringify(
                          Object.fromEntries(
                            Object.entries(selectedEvent.event_data).filter(
                              ([key]) => key !== 'provider'
                            )
                          ),
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </div>
                )}

              {/* Error Details */}
              {selectedEvent.error_details && (
                <div>
                  <h4 className="text-sm font-medium mb-3 text-destructive">
                    Error
                  </h4>
                  <div className="bg-destructive/10 rounded-lg p-3">
                    <p className="text-sm text-destructive">
                      {selectedEvent.error_details}
                    </p>
                  </div>
                </div>
              )}

              {/* AWS Metadata */}
              {(selectedEvent.aws_request_id ||
                selectedEvent.lambda_function_name) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-3">AWS Metadata</h4>
                      <div className="space-y-2 text-sm">
                        {selectedEvent.aws_request_id && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Request ID:
                            </span>
                            <span className="font-mono text-xs">
                              {selectedEvent.aws_request_id}
                            </span>
                          </div>
                        )}
                        {selectedEvent.lambda_function_name && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Lambda:</span>
                            <span className="font-mono text-xs">
                              {selectedEvent.lambda_function_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
              <Info className="h-12 w-12 mb-4 opacity-50" />
              <p>Selecciona un evento para ver sus detalles</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
