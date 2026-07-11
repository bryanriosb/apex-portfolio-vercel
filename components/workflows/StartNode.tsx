'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Play } from 'lucide-react'

export const StartNode = memo(function StartNode({ data }: NodeProps) {
  const d = data as unknown as { label: string }
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-none border bg-primary text-primary-foreground shadow-sm">
      <Handle position={Position.Right} type="source" />
      <Play className="h-4 w-4" />
    </div>
  )
})
