'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, Wrench } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import Loading from '@/components/ui/loading'
import { ToolsService } from '@/lib/services/agents/tools-service'
import type { ToolDefinition } from '@/lib/models/agents/tool'
import { toolTypes } from '@/lib/i18n/es-automation'

interface AgentToolsSelectorProps {
  selectedToolIds: string[]
  onChange: (toolIds: string[]) => void
  disabled?: boolean
}

export function AgentToolsSelector({
  selectedToolIds,
  onChange,
  disabled = false,
}: AgentToolsSelectorProps) {
  const service = useMemo(() => new ToolsService(), [])
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    service
      .listTools()
      .then((data) => {
        if (!cancelled) {
          // Incluye tools MCP: su creación vive en Conectores, pero sí son asignables
          setTools(data.filter((tool) => tool.is_active))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTools([])
          setLoadError(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [service])

  const filteredTools = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return tools
    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(term) ||
        (tool.description || '').toLowerCase().includes(term)
    )
  }, [tools, search])

  const handleToggle = (toolId: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedToolIds, toolId])
    } else {
      onChange(selectedToolIds.filter((id) => id !== toolId))
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Herramientas</span>
        {selectedToolIds.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {selectedToolIds.length} seleccionada
            {selectedToolIds.length === 1 ? '' : 's'}
          </Badge>
        )}
      </div>
      <p className="text-[0.8rem] text-muted-foreground">
        Selecciona las herramientas que este agente podrá invocar.
      </p>

      {loading ? (
        <div className="flex h-24 items-center justify-center border border-input">
          <Loading className="h-5 w-5 text-primary" />
        </div>
      ) : loadError ? (
        <div className="flex h-24 flex-col items-center justify-center gap-1 border border-destructive/50 text-destructive">
          <Wrench className="h-5 w-5" />
          <span className="text-xs">
            No se pudieron cargar las herramientas. Cierra y reintenta.
          </span>
        </div>
      ) : tools.length === 0 ? (
        <div className="flex h-24 flex-col items-center justify-center gap-1 border border-input text-muted-foreground">
          <Wrench className="h-5 w-5" />
          <span className="text-xs">No hay herramientas activas disponibles</span>
        </div>
      ) : (
        <div className="border border-input">
          <div className="relative border-b border-input">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar herramienta..."
              className="border-0 pl-8 rounded-none focus-visible:ring-0"
              disabled={disabled}
            />
          </div>
          <div className="max-h-44 overflow-y-auto">
            <div className="divide-y divide-input">
              {filteredTools.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  Sin resultados para &quot;{search}&quot;
                </div>
              ) : (
                filteredTools.map((tool) => {
                  const checked = selectedToolIds.includes(tool.id)
                  return (
                    <label
                      key={tool.id}
                      className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          handleToggle(tool.id, value === true)
                        }
                        disabled={disabled}
                        className="mt-0.5 rounded-none"
                      />
                      <div className="min-w-0 flex-1 space-y-0.5 overflow-hidden">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 truncate text-sm font-medium">
                            {tool.name}
                          </span>
                          <Badge
                            variant="outline"
                            className="shrink-0 text-[10px]"
                          >
                            {toolTypes[tool.tool_type] || tool.tool_type}
                          </Badge>
                        </div>
                        {tool.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
