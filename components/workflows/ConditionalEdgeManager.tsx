'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import type { ConditionalEdge, GraphNode } from '@/lib/models/workflows/workflow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ConditionalEdgeManagerProps {
  conditionalEdges: ConditionalEdge[]
  nodes: GraphNode[]
  onChange: (edges: ConditionalEdge[]) => void
}

export function ConditionalEdgeManager({ conditionalEdges, nodes, onChange }: ConditionalEdgeManagerProps) {
  const handleAddEdge = () => {
    const newEdge: ConditionalEdge = {
      from: '',
      route_by_field: '',
      routes: {}
    }
    onChange([...conditionalEdges, newEdge])
  }

  const handleRemoveEdge = (index: number) => {
    const newEdges = [...conditionalEdges]
    newEdges.splice(index, 1)
    onChange(newEdges)
  }

  const handleUpdateEdge = (index: number, updatedEdge: ConditionalEdge) => {
    const newEdges = [...conditionalEdges]
    newEdges[index] = updatedEdge
    onChange(newEdges)
  }

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
            Conditional Edges
            <span className="ml-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-none leading-none">
              {conditionalEdges.length}
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

      <CollapsibleContent className="space-y-3 pt-2 max-h-[230px] overflow-y-auto pr-1">
        {conditionalEdges.map((edge, i) => (
          <ConditionalEdgeItem
            key={i}
            edge={edge}
            nodes={nodes}
            onChange={(updated) => handleUpdateEdge(i, updated)}
            onRemove={() => handleRemoveEdge(i)}
          />
        ))}
        {conditionalEdges.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-2 border border-dashed">
            Sin conditional edges
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

function ConditionalEdgeItem({
  edge,
  nodes,
  onChange,
  onRemove
}: {
  edge: ConditionalEdge
  nodes: GraphNode[]
  onChange: (edge: ConditionalEdge) => void
  onRemove: () => void
}) {
  const handleAddRoute = () => {
    const newRoutes = { ...edge.routes, '': '' }
    // Since '' is a key, we might need a unique key if '' already exists, but for UI sake let's find a free generic name
    let base = 'condition'
    let counter = 1
    while (base in newRoutes) {
      base = `condition_${counter}`
      counter++
    }
    onChange({ ...edge, routes: { ...edge.routes, [base]: '' } })
  }

  const handleRemoveRoute = (condition: string) => {
    const newRoutes = { ...edge.routes }
    delete newRoutes[condition]
    onChange({ ...edge, routes: newRoutes })
  }

  const handleUpdateRouteCondition = (oldCondition: string, newCondition: string) => {
    if (oldCondition === newCondition) return
    const newRoutes = { ...edge.routes }
    const target = newRoutes[oldCondition]
    delete newRoutes[oldCondition]
    newRoutes[newCondition] = target
    onChange({ ...edge, routes: newRoutes })
  }

  const handleUpdateRouteTarget = (condition: string, newTarget: string) => {
    const newRoutes = { ...edge.routes, [condition]: newTarget }
    onChange({ ...edge, routes: newRoutes })
  }

  const availableNodes = [
    { id: '__start__', label: 'Start' },
    { id: '__end__', label: 'End' },
    ...nodes.map(n => ({ id: n.id, label: n.id }))
  ]

  return (
    <Card className="rounded-none border shadow-none bg-accent/10">
      <CardHeader className="p-2 py-1.5 flex flex-row items-center justify-between border-b space-y-0">
        <CardTitle className="text-[11px] font-medium">Edge</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 rounded-none text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="p-2 space-y-2">
        <div className="space-y-1">
          <Label className="text-[10px]">From Node</Label>
          <Select
            value={edge.from}
            onValueChange={(val) => onChange({ ...edge, from: val })}
          >
            <SelectTrigger className="h-7 text-xs rounded-none w-full bg-background">
              <SelectValue placeholder="Seleccione origen" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              {availableNodes.map((n) => (
                <SelectItem key={n.id} value={n.id} className="text-xs">
                  {n.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px]">Route by Field</Label>
          <Input
            value={edge.route_by_field}
            onChange={(e) => onChange({ ...edge, route_by_field: e.target.value })}
            className="h-7 text-xs rounded-none bg-background"
            placeholder="ej. next_action"
          />
        </div>

        <div className="pt-1">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-[10px] text-muted-foreground">Routes</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 text-[10px] px-1 py-0 rounded-none h-auto"
              onClick={handleAddRoute}
            >
              + route
            </Button>
          </div>
          
          <div className="space-y-1.5">
            {Object.entries(edge.routes).map(([condition, target], idx) => (
              <div key={idx} className="flex items-center gap-1">
                <Input
                  value={condition}
                  onChange={(e) => handleUpdateRouteCondition(condition, e.target.value)}
                  className="h-7 text-[10px] rounded-none bg-background flex-1"
                  placeholder="Condition..."
                />
                <Select
                  value={target}
                  onValueChange={(val) => handleUpdateRouteTarget(condition, val)}
                >
                  <SelectTrigger className="h-7 text-[10px] rounded-none w-[100px] flex-shrink-0 bg-background">
                    <SelectValue placeholder="Target..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-none">
                    {availableNodes.map((n) => (
                      <SelectItem key={n.id} value={n.id} className="text-[10px]">
                        {n.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-none text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => handleRemoveRoute(condition)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {Object.keys(edge.routes).length === 0 && (
              <div className="text-[10px] text-muted-foreground/50 italic px-1">
                Añade una ruta para evaluar
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
