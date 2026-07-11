'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ReactFlowProvider,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  MarkerType,
  Panel,
  Position,
} from '@xyflow/react'
import dagre from 'dagre'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bot, Cog, ChevronLeft, ChevronRight, LayoutTemplate, MousePointer2, Hand as HandIcon } from 'lucide-react'
import { Canvas } from '@/components/ai-elements/canvas'
import { Controls } from '@/components/ai-elements/controls'
import { AgentNode } from './AgentNode'
import { FunctionNode } from './FunctionNode'
import { StartNode } from './StartNode'
import { EndNode } from './EndNode'
import { NodePropertiesPanel } from './NodePropertiesPanel'
import { ChannelManager } from './ChannelManager'
import { ConditionalEdgeManager } from './ConditionalEdgeManager'
import { EdgeManager } from './EdgeManager'
import type {
  GraphDefinition,
  GraphConfig,
  GraphNode,
  GraphNodeAgent,
  GraphNodeFunction,
  ConditionalEdge,
} from '@/lib/models/workflows/workflow'

const nodeTypes = {
  agent: AgentNode,
  function: FunctionNode,
  start: StartNode,
  end: EndNode,
}

const defaultGraph: GraphDefinition = {
  channels: [],
  nodes: [],
  edges: [],
  conditional_edges: [],
  config: { recursion_limit: 10 },
}

interface FlowEditorProps {
  value: GraphDefinition
  onChange: (graph: GraphDefinition) => void
  sidebarTop?: ReactNode
}

function buildGraphFromState(
  rfNodes: Node[],
  rfEdges: Edge[],
  baseGraph: GraphDefinition
): GraphDefinition {
  const nodes: GraphNode[] = []
  const edges: { from: string; to: string }[] = []
  const positions: Record<string, { x: number; y: number }> = {}

  rfNodes.forEach((n) => {
    positions[n.id] = { x: Math.round(n.position.x), y: Math.round(n.position.y) }
    if (n.id === '__start__' || n.id === '__end__') return
    nodes.push(graphNodeFromRfNode(n))
  })

  rfEdges.forEach((e) => {
    if (!e.id.startsWith('cond-edge-')) {
      edges.push({ from: e.source, to: e.target })
    }
  })

  const result = {
    ...baseGraph,
    nodes,
    edges,
    config: {
      ...(baseGraph.config || {}),
      positions,
    },
  }
  console.log('GENERATED GRAPH:', JSON.stringify(result, null, 2))
  return result
}

// Stable serialization key to detect real graph changes
function serializeGraphKey(graph: GraphDefinition): string {
  const nodes = (graph.nodes || []).map((n) => n.id).join(',')
  const edges = (graph.edges || [])
    .map((e) => `${e.from}>${e.to}`)
    .join(',')
  const condEdges = (graph.conditional_edges || [])
    .map((c) => `${c.from}>${c.route_by_field}>${JSON.stringify(c.routes)}`)
    .join(',')
  return `${nodes}|${edges}|${condEdges}`
}

const nodeWidth = 280
const nodeHeight = 100

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
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

function FlowEditorInner({ value, onChange, sidebarTop }: FlowEditorProps) {
  const graph = value || defaultGraph
  const graphRef = useRef(graph)
  graphRef.current = graph

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const buildInitialElements = useCallback((g: GraphDefinition) => {
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

      ; (g.edges || []).forEach((e, i) => {
        edges.push({
          id: `edge-${i}-${e.from}-${e.to}`,
          source: e.from,
          target: e.to,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: true,
        })
      })

      ; (g.conditional_edges || []).forEach((cond, i) => {
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
  }, [])

  const initialElements = useMemo(() => buildInitialElements(graph), [graph, buildInitialElements])
  const [rfNodes, setRfNodes] = useState<Node[]>(() => initialElements.nodes)
  const [rfEdges, setRfEdges] = useState<Edge[]>(() => initialElements.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [canvasMode, setCanvasMode] = useState<'pan' | 'select'>('pan')

  // Sync when value changes externally (e.g. form.reset on load)
  // Use a stable key to avoid resetting on every re-render
  const prevGraphKeyRef = useRef<string>('')
  useEffect(() => {
    const key = serializeGraphKey(graph)
    if (key !== prevGraphKeyRef.current) {
      prevGraphKeyRef.current = key
      const elems = buildInitialElements(graph)
      setRfNodes(elems.nodes)
      setRfEdges(elems.edges)
      // Only set graphRef current if we re-sync
      graphRef.current = graph
    }
  }, [graph, buildInitialElements])

  const syncToParent = useCallback(
    (nodes: Node[], edges: Edge[]) => {
      const updated = buildGraphFromState(nodes, edges, graphRef.current)
      onChangeRef.current(updated)
    },
    []
  )

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setRfNodes((nds) => {
        const next = applyNodeChanges(changes, nds)
        syncToParent(next, rfEdges)
        return next
      })
    },
    [rfEdges, syncToParent]
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setRfEdges((eds) => {
        const next = applyEdgeChanges(changes, eds)
        syncToParent(rfNodes, next)
        return next
      })
    },
    [rfNodes, syncToParent]
  )

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setRfEdges((eds) => {
        const next = addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
          },
          eds
        )
        syncToParent(rfNodes, next)
        return next
      })
    },
    [rfNodes, syncToParent]
  )

  const propertiesPanelRef = useRef<HTMLDivElement>(null)

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id)
      // Los nodos start/end no tienen propiedades editables
      if (node.id !== '__start__' && node.id !== '__end__') {
        setSidebarOpen(true)
      }
    },
    []
  )

  // Al seleccionar un nodo, desplaza el sidebar hasta la sección de propiedades
  useEffect(() => {
    if (!selectedNodeId || !sidebarOpen) return
    const frame = requestAnimationFrame(() => {
      propertiesPanelRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedNodeId, sidebarOpen])

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null)
  }, [])

  const onLayout = useCallback(() => {
    const layouted = getLayoutedElements(rfNodes, rfEdges)
    setRfNodes([...layouted.nodes])
    setRfEdges([...layouted.edges])
    syncToParent(layouted.nodes, layouted.edges)
  }, [rfNodes, rfEdges, syncToParent])

  const handleAddNode = useCallback(
    (type: 'agent' | 'function') => {
      const id = `node_${Date.now()}`
      const newNode: GraphNode =
        type === 'agent'
          ? {
            type: 'agent',
            id,
            agent_id: '',
            stream: true,
            enable_ui: false,
          }
          : {
            type: 'function',
            id,
            logic: 'noop',
            config: {},
          }

      const rfNode: Node = {
        id,
        type,
        position: {
          x: 300 + Math.random() * 200,
          y: 100 + Math.random() * 200,
        },
        data: getDataFromGraphNode(newNode),
      }

      setRfNodes((nds) => {
        const next = [...nds, rfNode]
        syncToParent(next, rfEdges)
        return next
      })
    },
    [rfEdges, syncToParent]
  )

  const handleNodeUpdate = useCallback(
    (updatedNode: GraphNode) => {
      setRfNodes((nds) => {
        const next = nds.map((n) =>
          n.id === updatedNode.id
            ? { ...n, data: getDataFromGraphNode(updatedNode) }
            : n
        )
        syncToParent(next, rfEdges)
        return next
      })
    },
    [rfEdges, syncToParent]
  )

  const handleChannelsChange = useCallback(
    (channels: string[]) => {
      onChange({ ...graphRef.current, channels })
    },
    [onChange]
  )

  const handleConditionalEdgesChange = useCallback(
    (conditional_edges: ConditionalEdge[]) => {
      onChange({ ...graphRef.current, conditional_edges })
    },
    [onChange]
  )

  const handleEdgesChange = useCallback(
    (edges: { from: string; to: string }[]) => {
      onChange({ ...graphRef.current, edges })
    },
    [onChange]
  )

  const handleConfigChange = useCallback(
    (config: GraphConfig) => {
      onChange({ ...graphRef.current, config })
    },
    [onChange]
  )

  const selectedNode = selectedNodeId
    ? (graph.nodes || []).find((n) => n.id === selectedNodeId) || null
    : null

  const nodeCount = (graph.nodes || []).length
  const edgeCount = (graph.edges || []).length
  const channelCount = (graph.channels || []).length

  return (
    <div className="flex w-full border bg-background overflow-hidden" style={{ height: '100%', minHeight: 600 }}>
      {/* Inline sidebar — replaces Sheet (modal overlay) to avoid z-index and height issues */}
      {sidebarOpen && (
        <div className="flex flex-col w-[340px] min-w-[340px] border-r bg-sidebar overflow-hidden">
          <div className="border-b px-4 py-3">
            <span className="text-sm font-medium">Configuración del Grafo</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {selectedNode && (
              <div ref={propertiesPanelRef} className="scroll-mt-4 space-y-4">
                <div className="border border-primary/20 border-l-2 border-l-primary bg-primary/5 p-3">
                  <NodePropertiesPanel
                    node={selectedNode}
                    onChange={handleNodeUpdate}
                    onClose={() => {
                      setSelectedNodeId(null)
                      // Quita el resaltado del nodo en el canvas
                      setRfNodes((nds) =>
                        nds.map((n) => (n.selected ? { ...n, selected: false } : n))
                      )
                    }}
                  />
                </div>
                <Separator />
              </div>
            )}

            {sidebarTop && (
              <>
                {sidebarTop}
                <Separator />
              </>
            )}
            <ChannelManager
              channels={graph.channels || []}
              onChange={handleChannelsChange}
            />

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Agregar Nodo
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-none flex-1 h-7 text-xs"
                  onClick={() => handleAddNode('agent')}
                >
                  <Bot className="h-3 w-3 mr-1" />
                  Agent
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-none flex-1 h-7 text-xs"
                  onClick={() => handleAddNode('function')}
                >
                  <Cog className="h-3 w-3 mr-1" />
                  Function
                </Button>
              </div>
            </div>

            <Separator />
            
            <EdgeManager
              edges={graph.edges || []}
              nodes={graph.nodes || []}
              onChange={handleEdgesChange}
            />

            <Separator />
            
            <ConditionalEdgeManager
              conditionalEdges={graph.conditional_edges || []}
              nodes={graph.nodes || []}
              onChange={handleConditionalEdgesChange}
            />

            <Separator />

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Config
              </Label>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Recursion Limit</Label>
                  <Input
                    type="number"
                    value={graph.config?.recursion_limit ?? 10}
                    onChange={(e) =>
                      handleConfigChange({
                        ...graph.config,
                        recursion_limit: parseInt(e.target.value) || 10,
                      })
                    }
                    className="h-7 text-xs rounded-none"
                    min={1}
                    max={100}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Checkpoint</Label>
                  <Input
                    value={graph.config?.checkpoint || ''}
                    className="h-7 text-xs rounded-none"
                    placeholder="neo4j"
                    disabled
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Canvas area — must have explicit dimensions for ReactFlow to render nodes */}
      <div className="relative flex-1 min-w-0" style={{ height: '100%' }}>
        <Canvas
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          style={{ width: '100%', height: '100%' }}
          panOnScroll={false}
          panOnDrag={canvasMode === 'pan'}
          selectionOnDrag={canvasMode === 'select'}
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed },
            animated: true,
          }}
        >
          <Controls />
          <Panel position="top-right">
            <div className="flex bg-background border rounded-md shadow-sm overflow-hidden">
              <Button
                type="button"
                variant={canvasMode === 'pan' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-none border-r"
                onClick={() => setCanvasMode('pan')}
                title="Herramienta de Mover (Pan)"
              >
                <HandIcon className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={canvasMode === 'select' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-none"
                onClick={() => setCanvasMode('select')}
                title="Herramienta de Selección"
              >
                <MousePointer2 className="h-4 w-4" />
              </Button>
            </div>
          </Panel>
          <Panel position="top-left">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none h-7 text-xs"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          </Panel>
          <Panel position="bottom-right">
            <div className="flex gap-2 items-center justify-end mb-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onLayout}
                className="bg-background gap-2 text-xs h-7"
              >
                <LayoutTemplate className="h-3 w-3" />
                Auto-Organizar
              </Button>
            </div>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{nodeCount} nodos</Badge>
              <Badge variant="outline">{edgeCount} aristas</Badge>
              <Badge variant="outline">{channelCount} canales</Badge>
            </div>
          </Panel>
        </Canvas>
      </div>
    </div>
  )
}

function getDataFromGraphNode(node: GraphNode) {
  if (node.type === 'agent') {
    const a = node as GraphNodeAgent
    return {
      label: a.id,
      agentId: a.agent_id,
      stream: a.stream !== false,
      enableUi: a.enable_ui === true,
      interruptBefore: a.interrupt_before === true,
      interruptAfter: a.interrupt_after === true,
    }
  }
  const f = node as GraphNodeFunction
  return {
    label: f.id,
    logic: f.logic,
    config: f.config || {},
    interruptBefore: f.interrupt_before === true,
    interruptAfter: f.interrupt_after === true,
  }
}

function graphNodeFromRfNode(rfNode: Node): GraphNode {
  const data = rfNode.data as Record<string, any>
  if (rfNode.type === 'agent') {
    return {
      type: 'agent',
      id: rfNode.id,
      agent_id: data.agentId || '',
      stream: data.stream,
      enable_ui: data.enableUi,
      interrupt_before: data.interruptBefore,
      interrupt_after: data.interruptAfter,
    }
  }
  if (rfNode.type === 'function') {
    return {
      type: 'function',
      id: rfNode.id,
      logic: data.logic || 'noop',
      config: data.config || {},
      interrupt_before: data.interruptBefore,
      interrupt_after: data.interruptAfter,
    }
  }
  return {
    type: 'function',
    id: rfNode.id,
    logic: 'noop',
  }
}

export function FlowEditor(props: FlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
