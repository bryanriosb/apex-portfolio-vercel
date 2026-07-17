'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Cog, Hand, Wrench } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const CORE_LOGICS = ['noop', 'hitl_gate', 'state_transform']

interface FunctionNodeData {
  label: string
  logic: string
  config: Record<string, unknown>
  interruptBefore?: boolean
  interruptAfter?: boolean
}

export const FunctionNode = memo(function FunctionNode({ data, selected }: NodeProps) {
  const d = data as unknown as FunctionNodeData
  const configEntries = Object.entries(d.config || {})
  const isTool = !!d.logic && !CORE_LOGICS.includes(d.logic)
  return (
    <div
      className={`node-container relative h-auto w-[220px] gap-0 rounded-none border bg-card p-0 shadow-sm transition-shadow ${
        selected ? 'border-primary ring-1 ring-primary/40 shadow-md' : ''
      }`}
    >
      <Handle position={Position.Left} type="target" />
      <div className={`flex items-center gap-2 border-b p-3 ${d.logic === 'hitl_gate' ? 'bg-red-50' : 'bg-secondary'}`}>
        {d.logic === 'hitl_gate' ? (
          <Hand className="h-4 w-4 text-red-500" />
        ) : isTool ? (
          <Wrench className="h-4 w-4 text-orange-500" />
        ) : (
          <Cog className="h-4 w-4 text-orange-500" />
        )}
        <span className="text-sm font-medium truncate">{d.label}</span>
      </div>
      <div className="space-y-1.5 p-3">
        <div className="text-xs text-muted-foreground truncate" title={d.logic}>
          {isTool ? `Tool: ${d.logic}` : `Logic: ${d.logic}`}
        </div>
        {(d.interruptBefore || d.interruptAfter) && (
          <div className="flex flex-wrap gap-1">
            {d.interruptBefore && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-red-500 hover:bg-red-600">HITL Before</Badge>}
            {d.interruptAfter && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 bg-red-500 hover:bg-red-600">HITL After</Badge>}
          </div>
        )}
        {configEntries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {configEntries.slice(0, 3).map(([key, val]) => (
              <Badge key={key} variant="outline" className="text-[10px] px-1.5 py-0">
                {key}: {String(val)}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Handle position={Position.Right} type="source" />
    </div>
  )
})
