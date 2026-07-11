'use client'

import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Bot, Eye } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AgentNodeDetailDialog } from './AgentNodeDetailDialog'

interface AgentNodeData {
  label: string
  agentId: string
  stream: boolean
  enableUi: boolean
  interruptBefore: boolean
  interruptAfter: boolean
}

export const AgentNode = memo(function AgentNode({ data, selected }: NodeProps) {
  const d = data as unknown as AgentNodeData
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <div
      className={`node-container relative h-auto w-[220px] gap-0 rounded-none border bg-card p-0 shadow-sm transition-shadow ${
        selected ? 'border-primary ring-1 ring-primary/40 shadow-md' : ''
      }`}
    >
      <Handle position={Position.Left} type="target" />
      <div className="flex items-center gap-2 border-b bg-secondary p-3">
        <Bot className="h-4 w-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{d.label}</span>
        {d.agentId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="nodrag h-6 w-6 shrink-0 rounded-none p-0"
            title="Ver detalles del agente"
            onClick={(e) => {
              e.stopPropagation()
              setDetailOpen(true)
            }}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <div className="space-y-1.5 p-3">
        <div className="text-xs text-muted-foreground truncate" title={d.agentId}>
          Agent: {d.agentId ? d.agentId.slice(0, 8) : 'Sin asignar'}
        </div>
        <div className="flex flex-wrap gap-1">
          {d.stream && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Stream</Badge>}
          {d.enableUi && <Badge variant="outline" className="text-[10px] px-1.5 py-0">UI</Badge>}
          {d.interruptBefore && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-red-500 hover:bg-red-600">HITL Before</Badge>}
          {d.interruptAfter && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-red-500 hover:bg-red-600">HITL After</Badge>}
        </div>
      </div>
      <Handle position={Position.Right} type="source" />
      {d.agentId && (
        <AgentNodeDetailDialog
          agentId={d.agentId}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}
    </div>
  )
})
