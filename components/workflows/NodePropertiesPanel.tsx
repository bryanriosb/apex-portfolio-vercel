'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, Bot, Cog, Eye, Wrench, Layers, Info } from 'lucide-react'
import { AgentNodeDetailDialog } from './AgentNodeDetailDialog'
import type { GraphNode } from '@/lib/models/workflows/workflow'
import type { Agent } from '@/lib/models/agents/agent'
import type { ToolDefinition } from '@/lib/models/agents/tool'

// Lógicas "core" implementadas en el motor (Rust). No corresponden a un
// tool_definition y NO deben mezclarse con la selección de tools deterministas.
const CORE_LOGICS = ['noop', 'hitl_gate', 'state_transform'] as const
const isCoreLogic = (logic: string) =>
  (CORE_LOGICS as readonly string[]).includes(logic)

interface NodePropertiesPanelProps {
  node: GraphNode
  agents: Agent[]
  agentsLoading: boolean
  tools: ToolDefinition[]
  toolsLoading: boolean
  onChange: (node: GraphNode) => void
  onClose: () => void
}

export function NodePropertiesPanel({
  node,
  agents,
  agentsLoading,
  tools,
  toolsLoading,
  onChange,
  onClose,
}: NodePropertiesPanelProps) {
  const [agentDetailOpen, setAgentDetailOpen] = useState(false)
  const agentId = node.type === 'agent' ? node.agent_id || '' : ''

  const updatePartial = (patch: Partial<GraphNode>) => {
    onChange({ ...node, ...patch } as GraphNode)
  }

  // --- Modo del Function node: lógica core vs. tool determinista ---
  const currentLogic = node.type === 'function' ? node.logic || '' : ''
  const [functionMode, setFunctionMode] = useState<'core' | 'tool'>(
    isCoreLogic(currentLogic) || !currentLogic ? 'core' : 'tool'
  )
  // Reinicia el modo al cambiar de nodo (dep en id: al renombrar se recomputa
  // de forma coherente y al saltar a otro nodo se ajusta a su lógica actual).
  useEffect(() => {
    setFunctionMode(
      isCoreLogic(currentLogic) || !currentLogic ? 'core' : 'tool'
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id])

  const agentOptions: ComboboxOption[] = useMemo(
    () =>
      agents.map((a) => ({
        value: a.id,
        label: a.name,
        description: `${a.model_provider} · ${a.model_name}`,
        icon: <Bot className="h-3.5 w-3.5 text-primary" />,
      })),
    [agents]
  )

  // Solo los tool_definitions de tipo Function pueden invocarse como función
  // dinámica determinista (logic = tool.name; el backend los resuelve por name).
  const toolOptions: ComboboxOption[] = useMemo(
    () =>
      tools
        .filter((t) => t.tool_type === 'Function')
        .map((t) => ({
          value: t.name,
          label: t.name,
          description: t.description || undefined,
          icon: <Wrench className="h-3.5 w-3.5 text-orange-500" />,
        })),
    [tools]
  )

  const handleFunctionModeChange = (mode: 'core' | 'tool') => {
    setFunctionMode(mode)
    if (mode === 'core') {
      // Si venía de un tool, cae a un core seguro por defecto.
      if (!isCoreLogic(currentLogic)) {
        updatePartial({ logic: 'noop' } as Partial<GraphNode>)
      }
    } else {
      // Al pasar a tool, limpia el logic core para forzar una selección explícita.
      if (isCoreLogic(currentLogic)) {
        updatePartial({ logic: '' } as Partial<GraphNode>)
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {node.type === 'agent' ? (
            <Bot className="h-4 w-4 text-primary" />
          ) : (
            <Cog className="h-4 w-4 text-orange-500" />
          )}
          <span className="text-sm font-medium">
            {node.type === 'agent' ? 'Nodo Agent' : 'Nodo Function'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {node.type === 'agent' && agentId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 rounded-none"
              title="Ver detalles del agente"
              onClick={() => setAgentDetailOpen(true)}
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-none"
            onClick={onClose}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {node.type === 'agent' && agentId && (
        <AgentNodeDetailDialog
          agentId={agentId}
          open={agentDetailOpen}
          onOpenChange={setAgentDetailOpen}
        />
      )}

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs">ID del Nodo</Label>
        <Input
          value={node.id}
          onChange={(e) => updatePartial({ id: e.target.value })}
          className="h-7 text-xs rounded-none"
          placeholder="node_id"
        />
      </div>

      {node.type === 'agent' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Agente</Label>
            <Combobox
              options={agentOptions}
              value={node.agent_id || null}
              onChange={(value) =>
                updatePartial({ agent_id: value || '' } as Partial<GraphNode>)
              }
              isLoading={agentsLoading}
              placeholder="Seleccionar agente..."
              searchPlaceholder="Buscar agente..."
              emptyText="No hay agentes disponibles"
              className="h-7 text-xs rounded-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Input Field</Label>
            <Input
              value={node.input_mapper?.field || ''}
              onChange={(e) =>
                updatePartial({
                  input_mapper: {
                    ...(node.input_mapper || { field: '' }),
                    field: e.target.value,
                  },
                } as any)
              }
              className="h-7 text-xs rounded-none"
              placeholder="campo del estado"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Input Template</Label>
            <Input
              value={node.input_mapper?.template || ''}
              onChange={(e) =>
                updatePartial({
                  input_mapper: {
                    field: node.input_mapper?.field || '',
                    template: e.target.value || undefined,
                  },
                } as any)
              }
              className="h-7 text-xs rounded-none"
              placeholder="Prompt: {value}"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Output Field</Label>
            <Input
              value={node.output_mapper?.field || ''}
              onChange={(e) =>
                updatePartial({
                  output_mapper: {
                    field: e.target.value,
                    extract: node.output_mapper?.extract || 'json',
                  },
                } as any)
              }
              className="h-7 text-xs rounded-none"
              placeholder="campo destino"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Output Extract</Label>
            <Input
              value={node.output_mapper?.extract || ''}
              onChange={(e) =>
                updatePartial({
                  output_mapper: {
                    field: node.output_mapper?.field || '',
                    extract: e.target.value,
                  },
                } as any)
              }
              className="h-7 text-xs rounded-none"
              placeholder="json | field:nombre"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Stream</Label>
            <Switch
              checked={node.stream !== false}
              onCheckedChange={(checked) =>
                updatePartial({ stream: checked } as any)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Enable UI</Label>
            <Switch
              checked={node.enable_ui === true}
              onCheckedChange={(checked) =>
                updatePartial({ enable_ui: checked } as any)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Interrupt Before</Label>
            <Switch
              checked={node.interrupt_before === true}
              onCheckedChange={(checked) =>
                updatePartial({ interrupt_before: checked } as any)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Interrupt After</Label>
            <Switch
              checked={node.interrupt_after === true}
              onCheckedChange={(checked) =>
                updatePartial({ interrupt_after: checked } as any)
              }
            />
          </div>
        </>
      )}

      {node.type === 'function' && (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Tipo de lógica</Label>
            <div className="flex overflow-hidden rounded-none border">
              <Button
                type="button"
                variant={functionMode === 'core' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 h-7 rounded-none text-xs gap-1"
                onClick={() => handleFunctionModeChange('core')}
              >
                <Layers className="h-3 w-3" />
                Lógica core
              </Button>
              <Button
                type="button"
                variant={functionMode === 'tool' ? 'secondary' : 'ghost'}
                size="sm"
                className="flex-1 h-7 rounded-none text-xs gap-1 border-l"
                onClick={() => handleFunctionModeChange('tool')}
              >
                <Wrench className="h-3 w-3" />
                Tool determinista
              </Button>
            </div>
          </div>

          {functionMode === 'core' ? (
            <div className="space-y-2">
              <Label className="text-xs">Lógica</Label>
              <Select
                value={isCoreLogic(currentLogic) ? currentLogic : ''}
                onValueChange={(value) =>
                  updatePartial({ logic: value } as Partial<GraphNode>)
                }
              >
                <SelectTrigger className="h-7 text-xs rounded-none w-full">
                  <SelectValue placeholder="Seleccionar lógica" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="noop" className="text-xs">
                    noop — paso / punto de reunión
                  </SelectItem>
                  <SelectItem value="hitl_gate" className="text-xs">
                    hitl_gate — compuerta Human-in-the-Loop
                  </SelectItem>
                  <SelectItem value="state_transform" className="text-xs">
                    state_transform — reestructura el estado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-xs">Tool (tool_definition)</Label>
              <Combobox
                options={toolOptions}
                value={currentLogic && !isCoreLogic(currentLogic) ? currentLogic : null}
                onChange={(value) =>
                  updatePartial({ logic: value || '' } as Partial<GraphNode>)
                }
                isLoading={toolsLoading}
                placeholder="Seleccionar tool..."
                searchPlaceholder="Buscar tool..."
                emptyText="No hay tools de tipo Function"
                className="h-7 text-xs rounded-none"
              />
              <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                <Info className="h-3 w-3 shrink-0 mt-0.5" />
                <span>
                  Se ejecuta de forma determinista en sandbox aislado. El{' '}
                  <code className="font-mono">config</code> se fusiona como
                  valores por defecto del estado.
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Config (JSON)</Label>
            <textarea
              value={JSON.stringify(node.config || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  updatePartial({ config: parsed } as any)
                } catch {
                  // invalid JSON, ignore
                }
              }}
              className="w-full h-24 rounded-none border border-input bg-background px-3 py-2 text-xs font-mono resize-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              placeholder='{"gate_field": "approved"}'
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Interrupt Before</Label>
            <Switch
              checked={node.interrupt_before === true}
              onCheckedChange={(checked) =>
                updatePartial({ interrupt_before: checked } as any)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Interrupt After</Label>
            <Switch
              checked={node.interrupt_after === true}
              onCheckedChange={(checked) =>
                updatePartial({ interrupt_after: checked } as any)
              }
            />
          </div>
        </>
      )}
    </div>
  )
}
