'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Square } from 'lucide-react'

export const EndNode = memo(function EndNode({ data }: NodeProps) {
  const d = data as unknown as { label: string }
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-none border bg-secondary text-secondary-foreground shadow-sm">
      <Handle position={Position.Left} type="target" />
      <Square className="h-4 w-4" />
    </div>
  )
})
