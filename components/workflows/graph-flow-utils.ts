import dagre from 'dagre'
import { MarkerType, Position, type Edge, type Node } from '@xyflow/react'
import type {
  GraphDefinition,
  GraphNode,
  GraphNodeAgent,
  GraphNodeFunction,
} from '@/lib/models/workflows/workflow'

export const nodeWidth = 280
export const nodeHeight = 100

export function getDataFromGraphNode(node: GraphNode) {
  if (node.type === 'agent') {
    const a = node as GraphNodeAgent
    return {
      label: a.id,
      agentId: a.agent_id,
      stream: a.stream !== false,
      enableUi: a.enable_ui === true,
      interruptBefore: a.interrupt_before === true,
      interruptAfter: a.interrupt_after === true,
      def: node,
    }
  }
  const f = node as GraphNodeFunction
  return {
    label: f.id,
    logic: f.logic,
    config: f.config || {},
    interruptBefore: f.interrupt_before === true,
    interruptAfter: f.interrupt_after === true,
    def: node,
  }
}

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction, ranksep: 150, nodesep: 80, edgesep: 80 })

  nodes.forEach((node) => {
    const width = node.measured?.width ?? nodeWidth
    const height = node.measured?.height ?? nodeHeight
    dagreGraph.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id)
    node.targetPosition = direction === 'LR' ? Position.Left : Position.Top
    node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom

    const width = node.measured?.width ?? nodeWidth
    const height = node.measured?.height ?? nodeHeight

    // Shift the dagre node position (anchor=center center) to the top left
    node.position = {
      x: nodeWithPosition.x - width / 2,
      y: nodeWithPosition.y - height / 2,
    }
  })

  return { nodes, edges }
}

/**
 * Convierte un GraphDefinition al par nodes/edges de React Flow.
 * Misma semántica que el editor: nodos sintéticos __start__/__end__,
 * ids de edges deterministas y layout dagre cuando no hay posiciones.
 */
export function buildFlowElements(g: GraphDefinition): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []
  const allNodes = g.nodes || []
  const positions = g.config?.positions || {}

  nodes.push({
    id: '__start__',
    type: 'start',
    position: positions['__start__'] || { x: 0, y: 0 },
    data: { label: 'Start' },
  })

  nodes.push({
    id: '__end__',
    type: 'end',
    position: positions['__end__'] || { x: 0, y: 0 },
    data: { label: 'End' },
  })

  allNodes.forEach((n) => {
    nodes.push({
      id: n.id,
      type: n.type,
      position: positions[n.id] || { x: 0, y: 0 },
      data: getDataFromGraphNode(n),
    })
  })

  ;(g.edges || []).forEach((e, i) => {
    edges.push({
      id: `edge-${i}-${e.from}-${e.to}`,
      source: e.from,
      target: e.to,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true,
      reconnectable: true,
    })
  })

  ;(g.conditional_edges || []).forEach((cond, i) => {
    Object.entries(cond.routes).forEach(([condition, target], j) => {
      edges.push({
        id: `cond-edge-${i}-${j}-${cond.from}-${target}`,
        source: cond.from,
        target,
        label: condition,
        labelBgStyle: { fill: 'var(--background)' },
        labelStyle: { fill: 'var(--foreground)' },
        style: { strokeDasharray: '5,5' },
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: true,
        reconnectable: false,
      })
    })
  })

  const hasPositions = Object.keys(positions).length > 0
  if (!hasPositions) {
    return getLayoutedElements(nodes, edges)
  }

  nodes.forEach((node) => {
    node.targetPosition = Position.Left
    node.sourcePosition = Position.Right
  })

  return { nodes, edges }
}
