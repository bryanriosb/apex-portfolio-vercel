'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  reconnectEdge,
  MarkerType,
  Panel,
} from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bot, Cog, ChevronLeft, ChevronRight, LayoutTemplate, MousePointer2, Hand as HandIcon, X } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
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
import { AgentsService } from '@/lib/services/agents/agents-service'
import { ToolsService } from '@/lib/services/agents/tools-service'
import type { Agent } from '@/lib/models/agents/agent'
import type { ToolDefinition } from '@/lib/models/agents/tool'
import type {
  GraphDefinition,
  GraphConfig,
  GraphNode,
  ConditionalEdge,
} from '@/lib/models/workflows/workflow'

import {
  buildFlowElements,
  getDataFromGraphNode,
  getLayoutedElements,
} from './graph-flow-utils'

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

  return {
    ...baseGraph,
    nodes,
    edges,
    config: {
      ...(baseGraph.config || {}),
      positions,
    },
  }
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

function FlowEditorInner({ value, onChange, sidebarTop }: FlowEditorProps) {
  const graph = value || defaultGraph
  const graphRef = useRef(graph)
  graphRef.current = graph

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const buildInitialElements = useCallback(
    (g: GraphDefinition) => buildFlowElements(g),
    []
  )

  const initialElements = useMemo(() => buildInitialElements(graph), [graph, buildInitialElements])
  const [rfNodes, setRfNodes] = useState<Node[]>(() => initialElements.nodes)
  const [rfEdges, setRfEdges] = useState<Edge[]>(() => initialElements.edges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [canvasMode, setCanvasMode] = useState<'pan' | 'select'>('pan')
  const isMobile = useIsMobile()

  // En mobile el sidebar es un drawer superpuesto: inicia cerrado para
  // priorizar el canvas. Solo se fuerza una vez al detectar el viewport.
  const mobileInitRef = useRef(false)
  useEffect(() => {
    if (isMobile && !mobileInitRef.current) {
      mobileInitRef.current = true
      setSidebarOpen(false)
    }
  }, [isMobile])

  const { setCenter, getZoom } = useReactFlow()

  // Catálogos cargados una sola vez y compartidos con el panel de propiedades
  // (evita un fetch por nodo). Scoped al tenant en el backend.
  const [agents, setAgents] = useState<Agent[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [toolsLoading, setToolsLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const agentsService = new AgentsService()
    const toolsService = new ToolsService()
    setAgentsLoading(true)
    setToolsLoading(true)
    agentsService
      .listAgents()
      .then((data) => {
        if (!cancelled) setAgents(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAgentsLoading(false)
      })
    toolsService
      .listTools()
      .then((data) => {
        if (!cancelled) setTools(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setToolsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  // --- Reconexión de aristas (arrastrar un extremo a otro nodo) ---
  const edgeReconnectSuccessful = useRef(true)

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false
  }, [])

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true
      setRfEdges((eds) => {
        const next = reconnectEdge(oldEdge, newConnection, eds)
        syncToParent(rfNodes, next)
        return next
      })
    },
    [rfNodes, syncToParent]
  )

  const onReconnectEnd = useCallback(() => {
    // Si el extremo se soltó fuera de un handle, conservamos la arista intacta
    // (no la eliminamos): el usuario pidió poder moverla sin tener que borrarla.
    edgeReconnectSuccessful.current = true
  }, [])

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

      // Posición escalonada (determinista) para evitar solapamiento
      const position = {
        x: 320 + (rfNodes.length % 4) * 60,
        y: 120 + (rfNodes.length % 6) * 70,
      }

      setRfNodes((nds) => {
        const rfNode: Node = {
          id,
          type,
          position,
          data: getDataFromGraphNode(newNode),
        }
        const next = [...nds, rfNode]
        syncToParent(next, rfEdges)
        return next
      })

      // Centra la vista en el nodo recién agregado (no hace zoom out global),
      // conservando el nivel de zoom actual. El ancho del nodo es ~220px.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const zoom = getZoom()
          setCenter(position.x + 110, position.y + 50, {
            zoom: zoom < 0.7 ? 0.9 : zoom,
            duration: 400,
          })
        })
      })
    },
    [rfNodes, rfEdges, syncToParent, setCenter, getZoom]
  )

  const handleNodeUpdate = useCallback(
    (updatedNode: GraphNode) => {
      const oldId = selectedNodeId
      const newId = updatedNode.id
      const idChanged = !!oldId && newId !== oldId

      // Si cambió el id, remapea las aristas (source/target) para no romperlas.
      let nextEdges = rfEdges
      if (idChanged) {
        nextEdges = rfEdges.map((e) => ({
          ...e,
          source: e.source === oldId ? newId : e.source,
          target: e.target === oldId ? newId : e.target,
        }))
        setRfEdges(nextEdges)

        // Remapea también los conditional_edges (viven en el grafo base).
        const cond = (graphRef.current.conditional_edges || []).map((c) => ({
          ...c,
          from: c.from === oldId ? newId : c.from,
          routes: Object.fromEntries(
            Object.entries(c.routes).map(([k, v]) => [
              k,
              v === oldId ? newId : v,
            ])
          ),
        }))
        graphRef.current = { ...graphRef.current, conditional_edges: cond }
        setSelectedNodeId(newId)
      }

      setRfNodes((nds) => {
        const next = nds.map((n) =>
          n.id === (oldId ?? updatedNode.id)
            ? { ...n, id: newId, data: getDataFromGraphNode(updatedNode) }
            : n
        )
        syncToParent(next, nextEdges)
        return next
      })
    },
    [rfEdges, syncToParent, selectedNodeId]
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
    <div className="relative flex w-full border bg-background overflow-hidden h-full min-h-[420px] md:min-h-[600px]">
      {/* Backdrop solo en mobile: el sidebar se superpone al canvas como drawer */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 z-10 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Inline sidebar — replaces Sheet (modal overlay) to avoid z-index and height issues.
          En < md se comporta como drawer superpuesto para no robarle ancho al canvas. */}
      {sidebarOpen && (
        <div className="absolute inset-y-0 left-0 z-20 flex flex-col w-[min(85vw,340px)] border-r bg-sidebar overflow-hidden shadow-xl md:static md:z-auto md:w-[340px] md:min-w-[340px] md:shadow-none">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-sm font-medium">Configuración del Grafo</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-none h-7 w-7 p-0 md:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar panel de configuración"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 p-4">
            {selectedNode && (
              <div ref={propertiesPanelRef} className="scroll-mt-4 space-y-4">
                <div className="border border-primary/20 border-l-2 border-l-primary bg-primary/5 p-3">
                  <NodePropertiesPanel
                    node={selectedNode}
                    agents={agents}
                    agentsLoading={agentsLoading}
                    tools={tools}
                    toolsLoading={toolsLoading}
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
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
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
                <>
                  <ChevronRight className="h-3 w-3" />
                  <span className="ml-1 md:hidden">Configuración</span>
                </>
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
            <div className="hidden sm:flex gap-2 text-xs text-muted-foreground">
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

// La definición completa del nodo (`def`) se conserva íntegra dentro de
// `rfNode.data` para que el round-trip canvas ⇄ grafo no pierda campos como
// `input_mapper` / `output_mapper` / `config`. Los campos "aplanados" (label,
// agentId, logic, ...) existen solo para el render de los componentes de nodo.
function graphNodeFromRfNode(rfNode: Node): GraphNode {
  const data = rfNode.data as Record<string, any>
  // Preserva la definición completa; el id se toma del rfNode (fuente de verdad
  // tras un rename) para mantenerlos sincronizados.
  if (data?.def) {
    return { ...(data.def as GraphNode), id: rfNode.id } as GraphNode
  }
  // Fallback defensivo (no debería ocurrir): reconstruye lo mínimo.
  if (rfNode.type === 'agent') {
    return {
      type: 'agent',
      id: rfNode.id,
      agent_id: data?.agentId || '',
      stream: data?.stream,
      enable_ui: data?.enableUi,
      interrupt_before: data?.interruptBefore,
      interrupt_after: data?.interruptAfter,
    }
  }
  return {
    type: 'function',
    id: rfNode.id,
    logic: data?.logic || 'noop',
    config: data?.config || {},
    interrupt_before: data?.interruptBefore,
    interrupt_after: data?.interruptAfter,
  }
}

export function FlowEditor(props: FlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowEditorInner {...props} />
    </ReactFlowProvider>
  )
}
