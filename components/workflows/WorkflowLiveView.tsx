'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Activity } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Controls } from '@/components/ai-elements/controls'
import { AgentNode } from './AgentNode'
import { FunctionNode } from './FunctionNode'
import { StartNode } from './StartNode'
import { EndNode } from './EndNode'
import { buildFlowElements } from './graph-flow-utils'
import {
  useWorkflowExecutionState,
  type NodeExecutionStatus,
} from '@/hooks/use-workflow-execution-state'
import { WorkflowsService } from '@/lib/services/workflows/workflow-service'
import { getWorkflowJobAction } from '@/lib/actions/automation'
import { getStatusLabel, t } from '@/lib/i18n'
import type { GraphDefinition } from '@/lib/models/workflows/workflow'
import type { JobStatus } from '@/lib/services/automation/automation-types'

const nodeTypes = {
  agent: AgentNode,
  function: FunctionNode,
  start: StartNode,
  end: EndNode,
}

const NODE_CLASS: Record<NodeExecutionStatus, string> = {
  idle: 'wf-live-idle',
  running: 'wf-live-running',
  completed: 'wf-live-completed',
  failed: 'wf-live-failed',
}

const JOB_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Running: 'default',
  Completed: 'secondary',
  Failed: 'destructive',
  Interrupted: 'outline',
  Pending: 'outline',
}

interface WorkflowLiveViewProps {
  jobId: string
  isConnected?: boolean
}

function WorkflowLiveViewInner({ jobId, isConnected }: WorkflowLiveViewProps) {
  const [graph, setGraph] = useState<GraphDefinition | null>(null)
  const [persistedStatus, setPersistedStatus] = useState<JobStatus | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getWorkflowJobAction(jobId)
      .then(async (job) => {
        if (cancelled) return
        if (job?.status) setPersistedStatus(job.status)
        if (!job?.agent_workflow_definition_id) {
          setLoadError(true)
          return
        }
        const def = await new WorkflowsService().getWorkflow(job.agent_workflow_definition_id)
        if (!cancelled) setGraph((def?.graph_json as GraphDefinition) || null)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [jobId])

  const { nodeStates, traversedEdges, activeNodeId, jobStatus } = useWorkflowExecutionState(
    jobId,
    graph,
    persistedStatus
  )

  const base = useMemo(() => (graph ? buildFlowElements(graph) : null), [graph])

  const nodes: Node[] = useMemo(() => {
    if (!base) return []
    return base.nodes.map((n) => ({
      ...n,
      draggable: false,
      connectable: false,
      selectable: false,
      className: NODE_CLASS[nodeStates[n.id] || 'idle'],
    }))
  }, [base, nodeStates])

  const edges: Edge[] = useMemo(() => {
    if (!base) return []
    return base.edges.map((e) => {
      const traversed = traversedEdges.has(`${e.source}>${e.target}`)
      const active = traversed && e.target === activeNodeId
      return {
        ...e,
        reconnectable: false,
        animated: active,
        style: {
          ...(e.style || {}),
          stroke: traversed ? 'var(--primary)' : undefined,
          strokeWidth: traversed ? 2 : undefined,
          opacity: traversed ? 1 : 0.35,
        },
      }
    })
  }, [base, traversedEdges, activeNodeId])

  if (loadError) {
    return (
      <div className="border bg-card p-4 text-sm text-muted-foreground">
        {t('ui.errorCargarGrafo')}
      </div>
    )
  }

  if (!graph || !base) {
    return (
      <div className="flex items-center justify-center border bg-card p-8">
        <Spinner className="size-5" />
      </div>
    )
  }

  return (
    <div className="workflow-live-view flex flex-col border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <Activity className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm font-medium">{t('ui.ejecucionEnVivo')}</span>
        <Badge
          variant={(jobStatus && JOB_BADGE_VARIANT[jobStatus]) || 'outline'}
          className="rounded-none"
        >
          {jobStatus ? getStatusLabel(jobStatus) : '—'}
        </Badge>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 text-xs ${
            isConnected ? 'text-muted-foreground' : 'text-destructive'
          }`}
        >
          <span
            className={`inline-block h-2 w-2 ${
              isConnected ? 'wf-live-pulse-dot bg-primary' : 'bg-destructive'
            }`}
          />
          {isConnected ? t('ui.enVivo') : t('ui.desconectado')}
        </span>
      </div>
      <div className="h-[320px] sm:h-[420px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnPinch
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}

export function WorkflowLiveView(props: WorkflowLiveViewProps) {
  return (
    <ReactFlowProvider>
      <WorkflowLiveViewInner {...props} />
    </ReactFlowProvider>
  )
}
