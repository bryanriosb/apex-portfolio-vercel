'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { GraphEdge, GraphNode } from '@/lib/models/workflows/workflow'

interface EdgeManagerProps {
  edges: GraphEdge[]
  nodes: GraphNode[]
  onChange: (edges: GraphEdge[]) => void
}

export function EdgeManager({ edges, nodes, onChange }: EdgeManagerProps) {
  const handleAddEdge = () => {
    const newEdge: GraphEdge = {
      from: '',
      to: '',
    }
    onChange([...edges, newEdge])
  }

  const handleRemoveEdge = (index: number) => {
    const newEdges = [...edges]
    newEdges.splice(index, 1)
    onChange(newEdges)
  }

  const handleUpdateEdge = (index: number, updatedEdge: GraphEdge) => {
    const newEdges = [...edges]
    newEdges[index] = updatedEdge
    onChange(newEdges)
  }

  const availableNodes = [
    { id: '__start__', label: 'Start' },
    { id: '__end__', label: 'End' },
    ...nodes.map((n) => ({ id: n.id, label: n.id }))
  ]

  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 p-0 hover:bg-transparent flex items-center gap-1 rounded-none text-xs font-medium text-muted-foreground"
          >
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Standard Edges
            <span className="ml-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-none leading-none">
              {edges.length}
            </span>
          </Button>
        </CollapsibleTrigger>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2 rounded-none"
          onClick={handleAddEdge}
        >
          <Plus className="h-3 w-3 mr-1" />
          Añadir
        </Button>
      </div>

      <CollapsibleContent className="space-y-2 pt-2 max-h-[300px] overflow-y-auto pr-1">
        {edges.map((edge, i) => (
          <div
            key={i}
            className="relative flex flex-col gap-1.5 bg-accent/10 p-2 border rounded-none"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-1.5 right-1.5 h-5 w-5 p-0 rounded-none text-muted-foreground hover:text-destructive"
              onClick={() => handleRemoveEdge(i)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>

            <div className="space-y-1.5 pr-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground w-8 uppercase">From</span>
                <Select
                  value={edge.from}
                  onValueChange={(val) => handleUpdateEdge(i, { ...edge, from: val })}
                >
                  <SelectTrigger className="h-7 text-[10px] rounded-none flex-1 bg-background min-w-0">
                    <SelectValue placeholder="From node..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {availableNodes.map((n) => (
                      <SelectItem key={n.id} value={n.id} className="text-[10px]">
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-muted-foreground w-8 uppercase">To</span>
                <Select
                  value={edge.to}
                  onValueChange={(val) => handleUpdateEdge(i, { ...edge, to: val })}
                >
                  <SelectTrigger className="h-7 text-[10px] rounded-none flex-1 bg-background min-w-0">
                    <SelectValue placeholder="To node..." className="truncate" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {availableNodes.map((n) => (
                      <SelectItem key={n.id} value={n.id} className="text-[10px]">
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
        {edges.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-2 border border-dashed">
            Sin edges estáticos
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
