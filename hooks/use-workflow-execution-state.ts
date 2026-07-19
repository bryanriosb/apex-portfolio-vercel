'use client'

import { useMemo } from 'react'
import { useAutomationEventsStore } from '@/lib/store/automation-events-store'
import {
  type AutomationServerEvent,
  type JobStatus,
} from '@/lib/services/automation/automation-types'
import type { GraphDefinition } from '@/lib/models/workflows/workflow'

export type NodeExecutionStatus = 'idle' | 'running' | 'completed' | 'failed'

export interface WorkflowExecutionState {
  nodeStates: Record<string, NodeExecutionStatus>
  /** Aristas recorridas, en formato "from>to" sobre ids del grafo. */
  traversedEdges: Set<string>
  activeNodeId: string | null
  jobStatus: JobStatus | null
}

const TERMINAL_JOB_STATUSES: JobStatus[] = ['Completed', 'Failed']

function edgePairsOf(graph: GraphDefinition): Array<{ from: string; to: string }> {
  const pairs: Array<{ from: string; to: string }> = []
  ;(graph.edges || []).forEach((e) => pairs.push({ from: e.from, to: e.to }))
  ;(graph.conditional_edges || []).forEach((cond) => {
    Object.values(cond.routes).forEach((target) => pairs.push({ from: cond.from, to: target }))
  })
  return pairs
}

/**
 * Reducer puro: reconstruye el estado de ejecución a partir de la secuencia
 * cronológica de eventos del job. Las aristas recorridas se infieren: cuando
 * un nodo arranca, toda arista entrante cuyo origen ya terminó (o __start__)
 * formó parte del camino tomado.
 */
export function reduceExecutionState(
  events: AutomationServerEvent[],
  graph: GraphDefinition,
  initialJobStatus: JobStatus | null
): WorkflowExecutionState {
  const nodeStates: Record<string, NodeExecutionStatus> = {}
  const traversedEdges = new Set<string>()
  let activeNodeId: string | null = null
  let jobStatus: JobStatus | null = initialJobStatus

  const pairs = edgePairsOf(graph)
  let sawNodeEvent = false
  const isDone = (id: string) =>
    id === '__start__' || nodeStates[id] === 'completed' || nodeStates[id] === 'failed'

  for (const event of events) {
    switch (event.type) {
      case 'WorkflowNodeStarted': {
        sawNodeEvent = true
        nodeStates['__start__'] = 'completed'
        nodeStates[event.node_id] = 'running'
        activeNodeId = event.node_id
        pairs.forEach(({ from, to }) => {
          if (to === event.node_id && isDone(from)) {
            traversedEdges.add(`${from}>${to}`)
          }
        })
        break
      }
      case 'WorkflowNodeCompleted': {
        sawNodeEvent = true
        nodeStates[event.node_id] = event.success ? 'completed' : 'failed'
        if (activeNodeId === event.node_id) activeNodeId = null
        break
      }
      case 'JobStateChanged': {
        jobStatus = event.new_status as JobStatus
        break
      }
      default:
        break
    }
  }

  if (jobStatus === 'Completed' && sawNodeEvent) {
    nodeStates['__end__'] = 'completed'
    pairs.forEach(({ from, to }) => {
      if (to === '__end__' && isDone(from)) {
        traversedEdges.add(`${from}>__end__`)
      }
    })
    activeNodeId = null
  }
  if (jobStatus === 'Failed') {
    activeNodeId = null
  }

  return { nodeStates, traversedEdges, activeNodeId, jobStatus }
}

/**
 * Estado en vivo de la ejecución de un AgentWorkflowJob. Consume los eventos
 * que el WebSocket de automation ya deposita en el store global (no abre
 * conexiones propias). `persistedStatus` cubre ejecuciones ya iniciadas o
 * terminadas antes de conectar.
 */
export function useWorkflowExecutionState(
  jobId: string,
  graph: GraphDefinition | null,
  persistedStatus: JobStatus | null = null
): WorkflowExecutionState {
  const events = useAutomationEventsStore((s) => s.events)

  return useMemo(() => {
    if (!graph) {
      return {
        nodeStates: {},
        traversedEdges: new Set<string>(),
        activeNodeId: null,
        jobStatus: persistedStatus,
      }
    }
    const jobEvents = events
      .filter((e) => 'job_id' in e && e.job_id === jobId)
      .slice()
      .reverse() // el store guarda el más reciente primero; el reducer es cronológico

    const liveHasTerminal = jobEvents.some(
      (e) => e.type === 'JobStateChanged' && TERMINAL_JOB_STATUSES.includes(e.new_status as JobStatus)
    )
    const initialStatus = liveHasTerminal ? null : persistedStatus
    return reduceExecutionState(jobEvents, graph, initialStatus)
  }, [events, graph, jobId, persistedStatus])
}
