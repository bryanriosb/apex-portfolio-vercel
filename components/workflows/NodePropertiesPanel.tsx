'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { X, Bot, Cog, Eye } from 'lucide-react'
import { AgentNodeDetailDialog } from './AgentNodeDetailDialog'
import type { GraphNode } from '@/lib/models/workflows/workflow'

interface NodePropertiesPanelProps {
  node: GraphNode
  onChange: (node: GraphNode) => void
  onClose: () => void
}

export function NodePropertiesPanel({
  node,
  onChange,
  onClose,
}: NodePropertiesPanelProps) {
  const [agentDetailOpen, setAgentDetailOpen] = useState(false)
  const agentId = node.type === 'agent' ? node.agent_id || '' : ''

  const updatePartial = (patch: Partial<GraphNode>) => {
    onChange({ ...node, ...patch } as GraphNode)
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
            <Label className="text-xs">Agent ID</Label>
            <Input
              value={node.agent_id || ''}
              onChange={(e) =>
                updatePartial({ agent_id: e.target.value } as any)
              }
              className="h-7 text-xs rounded-none"
              placeholder="UUID del agente"
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
            <Label className="text-xs">Logic</Label>
            <Input
              value={node.logic || ''}
              onChange={(e) =>
                updatePartial({ logic: e.target.value } as any)
              }
              className="h-7 text-xs rounded-none"
              placeholder="noop | hitl_gate | state_transform"
            />
          </div>

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
