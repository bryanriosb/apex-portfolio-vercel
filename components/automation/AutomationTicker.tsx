'use client';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { useActiveBusinessStore } from '@/lib/store/active-business-store';
import { useAutomationEventsStore } from '@/lib/store/automation-events-store';
import { useWebSocketReconnectionStore } from '@/lib/store/websocket-reconnection-store';
import { Hammer, Bot, BrainCircuit, RadioOff, RefreshCw, Wrench, Brain, GitBranch, Sparkles, Plug, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';
import { Badge } from '../ui/badge';
import type { AutomationServerEvent } from '@/lib/services/automation/automation-types';
import { t, getStatusLabel, getModuleLabel, getEventLabel, getConnectionStatusLabel } from '@/lib/i18n';

interface AutomationTickerProps {
  isConnected: boolean;
  reconnectAttempt: number;
  reconnectCountdown: number;
  maxRetries: number;
  onReconnect?: () => void;
}

interface EventDisplay {
  icon: React.ReactNode;
  label: string;
  module: string;
  jobName?: string;
  timestamp: string;
  rank: number;
  timeStr: string;
  key: string;
}

function getModule(event: AutomationServerEvent): string {
  if ('module' in event && event.module) return getModuleLabel(event.module);
  return t('ui.general');
}

function getEventDisplay(event: AutomationServerEvent, timezone: string): EventDisplay | null {
  const timeStr = formatEventTime(event.timestamp, timezone);
  const base = { timestamp: event.timestamp, rank: 0, timeStr };

  switch (event.type) {
    case 'JobStateChanged':
      return {
        icon: getJobIcon(event.job_type),
        label: getStatusLabel(event.new_status),
        module: getModule(event),
        jobName: event.job_name,
        ...base,
        key: `jobstate_${event.job_id}_${event.timestamp}`,
      };
    case 'ToolCallStarted':
      return {
        icon: <Wrench className="h-3.5 w-3.5 flex-shrink-0" />,
        label: `${getEventLabel('ToolCallStarted')} ${event.tool_name}`,
        module: getModule(event),
        ...base,
        key: `toolstart_${event.job_id}_${event.call_id}_${event.timestamp}`,
      };
    case 'ToolCallCompleted':
      return {
        icon: <Wrench className="h-3.5 w-3.5 flex-shrink-0" />,
        label: `${getEventLabel('ToolCallCompleted')} ${event.tool_name}`,
        module: getModule(event),
        ...base,
        key: `toolend_${event.job_id}_${event.call_id}_${event.timestamp}`,
      };
    case 'AgentThinking':
      return {
        icon: <Brain className="h-3.5 w-3.5 flex-shrink-0" />,
        label: `${getEventLabel('AgentThinking')} ${event.agent_name}`,
        module: getModule(event),
        ...base,
        key: `agentthink_${event.job_id}_${event.agent_name}_${event.timestamp}`,
      };
    case 'AgentResolved':
      return {
        icon: <Brain className="h-3.5 w-3.5 flex-shrink-0" />,
        label: `${getEventLabel('AgentResolved')} ${event.agent_name}`,
        module: getModule(event),
        ...base,
        key: `agentresolve_${event.job_id}_${event.agent_name}_${event.timestamp}`,
      };
    case 'WorkflowNodeStarted':
      return {
        icon: <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />,
        label: `${getEventLabel('WorkflowNodeStarted')} ${event.node_id}`,
        module: getModule(event),
        ...base,
        key: `nodestart_${event.job_id}_${event.node_id}_${event.timestamp}`,
      };
    case 'WorkflowNodeCompleted':
      return {
        icon: <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />,
        label: `${getEventLabel('WorkflowNodeCompleted')} ${event.node_id}`,
        module: getModule(event),
        ...base,
        key: `nodeend_${event.job_id}_${event.node_id}_${event.timestamp}`,
      };
    case 'SkillsResolved':
      return {
        icon: <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />,
        label: getEventLabel('SkillsResolved'),
        module: getModule(event),
        ...base,
        key: `skills_${event.job_id}_${event.timestamp}`,
      };
    case 'ToolConnectionChanged':
      return {
        icon: <Plug className="h-3.5 w-3.5 flex-shrink-0" />,
        label: getConnectionStatusLabel(event.status),
        module: event.tool_name,
        ...base,
        key: `connchange_${event.tool_name}_${event.timestamp}`,
      };
    case 'CronTriggered':
      return {
        icon: <Clock className="h-3.5 w-3.5 flex-shrink-0" />,
        label: getEventLabel('CronTriggered'),
        module: getModule(event),
        ...base,
        key: `cron_${event.job_id}_${event.timestamp}`,
      };
    case 'WorkflowLog':
      return {
        icon: <FileText className="h-3.5 w-3.5 flex-shrink-0" />,
        label: event.message,
        module: getModule(event),
        ...base,
        key: `wflog_${event.job_id}_${event.timestamp}`,
      };
    default:
      return null;
  }
}

function getJobIcon(jobType?: string) {
  switch (jobType) {
    case 'ApexJob':
      return <Hammer className="h-3.5 w-3.5 flex-shrink-0" />;
    case 'AgentJob':
      return <Bot className="h-3.5 w-3.5 flex-shrink-0" />;
    case 'AgentWorkflowJob':
      return <BrainCircuit className="h-3.5 w-3.5 flex-shrink-0" />;
    default:
      return <BrainCircuit className="h-3.5 w-3.5 flex-shrink-0" />;
  }
}

function formatEventTime(timestamp: string, timezone: string) {
  try {
    const zonedDate = toZonedTime(new Date(timestamp), timezone);
    return format(zonedDate, "MMM dd, yyyy HH:mm", { locale: es });
  } catch {
    return '';
  }
}

export function AutomationTicker({ isConnected, reconnectAttempt, reconnectCountdown, maxRetries, onReconnect }: AutomationTickerProps) {
  const events = useAutomationEventsStore((s) => s.events);
  const { activeBusiness } = useActiveBusinessStore();
  const reconnectAll = useWebSocketReconnectionStore((s) => s.reconnectAll);
  const timezone = activeBusiness?.timezone || 'America/Bogota';

  const exhausted = reconnectAttempt >= maxRetries && maxRetries > 0;

  const displayEvents = useMemo(() => {
    const event = events[0];
    if (!event) return [];
    const display = getEventDisplay(event, timezone);
    if (!display) return [];
    return [display];
  }, [events, timezone]);

  if (exhausted) {
    return (
      <div className="bg-transparent px-3 flex items-center justify-center gap-2 h-9 flex-1 min-w-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            reconnectAll();
            onReconnect?.();
          }}
          className={cn(
            'h-7 gap-1.5 text-xs rounded-none border-muted-foreground/30 text-muted-foreground hover:text-foreground'
          )}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('ui.reconectar')}
        </Button>
      </div>
    );
  }

  const getStatusMessage = () => {
    if (!isConnected && reconnectAttempt === 0) return t('ui.conectando');
    if (reconnectAttempt > 0) return `${t('ui.reconectando')} - ${t('ui.reconectandoIntento', { current: String(reconnectAttempt), max: String(maxRetries), countdown: String(reconnectCountdown) })}`;
    return null;
  };

  const statusMessage = getStatusMessage();

  if (statusMessage) {
    return (
      <div className="text-xs text-muted-foreground bg-transparent px-3 flex items-center justify-center gap-2 h-9 flex-1 min-w-0 truncate">
        {statusMessage}
      </div>
    );
  }

  if (displayEvents.length === 0) {
    return (
      <div className="text-xs text-muted-foreground bg-transparent px-3 flex items-center justify-center gap-2 h-9 flex-1 min-w-0 truncate">
        <ConnectionIndicator
          isConnected={isConnected}
          reconnectAttempt={reconnectAttempt}
        />
        <RadioOff className="h-3.5 w-3.5 flex-shrink-0 opacity-70" />
        {t('ui.sinActividadReciente')}
      </div>

    );
  }

  return (
    <div
      className="relative flex-1 min-w-0 h-9 bg-transparent overflow-hidden px-3"
      style={{ perspective: '600px' }}
    >
      <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
        <AnimatePresence initial={false} mode="popLayout">
          {displayEvents.map((event) => {
            const isCurrent = event.rank === 0;
            const yOffset = event.rank * -10;
            const scale = 1 - event.rank * 0.12;
            const opacity = 1 - event.rank * 0.55;
            const rotateX = event.rank * 18;
            const blur = event.rank * 3;
            const zIndex = 10 - event.rank;

            return (
              <motion.div
                key={event.key}
                layout
                initial={{
                  y: 28,
                  opacity: 0,
                  scale: 0.75,
                  rotateX: -22,
                  filter: 'blur(2px)',
                  zIndex,
                }}
                animate={{
                  y: yOffset,
                  opacity: Math.max(opacity, 0),
                  scale,
                  rotateX,
                  filter: `blur(${blur}px)`,
                  zIndex,
                }}
                exit={{
                  y: -36,
                  opacity: 0,
                  scale: 0.65,
                  rotateX: 28,
                  filter: 'blur(3px)',
                  zIndex,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 320,
                  damping: 26,
                  mass: 0.8,
                }}
                className={cn('absolute inset-0 flex items-center justify-center gap-2 text-xs text-muted-foreground', isCurrent ? 'pointer-events-auto' : 'pointer-events-none')}
                style={{
                  transformOrigin: 'center center',
                  backfaceVisibility: 'hidden',
                }}
              >
                <div className={cn('flex items-center justify-center gap-2 w-full min-w-0 pr-0 sm:pr-6', isCurrent ? 'text-black select-text' : 'pointer-events-none select-none')}>
                  <div className="flex gap-2 sm:gap-4 flex-1 min-w-0 items-center justify-start sm:justify-center">
                    <ConnectionIndicator
                      isConnected={isConnected}
                      reconnectAttempt={reconnectAttempt}
                    />

                    <Badge className="shrink-0">{event.module}</Badge>

                    <div className="flex gap-2 sm:gap-3 items-center min-w-0">
                      <span>{event.icon}</span>
                      {event.jobName && (
                        <div className="font-bold mr-1.5 truncate max-w-[160px] sm:max-w-[200px] text-foreground">
                          {event.jobName}
                        </div>
                      )}
                    </div>


                    <Badge variant="secondary" className="truncate min-w-0 text-muted-foreground hidden sm:inline-flex">
                      {event.label}
                    </Badge>
                    {event.timeStr && (
                      <span className="text-xs shrink-0 font-mono hidden md:inline">
                        {event.timeStr}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}


function ConnectionIndicator({
  isConnected,
  reconnectAttempt,
}: { isConnected: boolean, reconnectAttempt: number }) {
  return (
    <div className="relative mr-1 sm:mr-2 shrink-0">
      <div className="flex items-center justify-center pointer-events-none">
        {reconnectAttempt > 0 ? (
          <span className="relative flex items-center justify-center h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-500 opacity-80" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          </span>
        ) : isConnected ? (
          <div className="relative flex items-center justify-center h-2 w-2">
            <div className="absolute h-2 w-2 rounded-full bg-primary animate-ping opacity-80" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
        ) : (
          <span className="relative flex items-center justify-center h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-500 opacity-80" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          </span>
        )}
      </div>
    </div>
  );
}