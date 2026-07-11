'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Bot,
  Pencil,
  Wrench,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import Loading from '@/components/ui/loading'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AgentForm } from '@/components/agents/AgentForm'
import { ToolForm } from '@/components/agents/tools/ToolForm'
import { AgentsService } from '@/lib/services/agents/agents-service'
import { ToolsService } from '@/lib/services/agents/tools-service'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toolTypes } from '@/lib/i18n/es-automation'
import {
  buildExecutionConfig,
  parseSchemaJson,
  MANAGEABLE_TOOL_TYPES,
  type ManageableToolType,
  type ToolDefinition,
  type ToolFormValues,
} from '@/lib/models/agents/tool'
import type { Agent, AgentFormValues } from '@/lib/models/agents/agent'
import type { ToolWithAuthStatus } from '@/lib/types/oauth2-types'

interface AgentNodeDetailDialogProps {
  agentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentNodeDetailDialog({
  agentId,
  open,
  onOpenChange,
}: AgentNodeDetailDialogProps) {
  const { user } = useCurrentUser()
  const agentsService = useMemo(() => new AgentsService(), [])
  const toolsService = useMemo(() => new ToolsService(), [])

  const [agent, setAgent] = useState<Agent | null>(null)
  const [tools, setTools] = useState<ToolWithAuthStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [editAgentOpen, setEditAgentOpen] = useState(false)
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  const [initialToolIds, setInitialToolIds] = useState<string[]>([])
  const [isSavingAgent, setIsSavingAgent] = useState(false)

  const [editingTool, setEditingTool] = useState<ToolDefinition | null>(null)
  const [loadingToolId, setLoadingToolId] = useState<string | null>(null)
  const [isSavingTool, setIsSavingTool] = useState(false)

  const loadData = useCallback(async () => {
    if (!agentId) return
    setLoading(true)
    setLoadError(false)
    try {
      const agentData = await agentsService.getAgent(agentId)
      setAgent(agentData)
      if (user?.id) {
        const agentTools = await toolsService.listAgentTools(agentId, {
          user_id: user.id,
          business_account_id: agentData.business_account_id,
        })
        setTools(agentTools)
        const ids = agentTools.map((t) => t.id)
        setSelectedToolIds(ids)
        setInitialToolIds(ids)
      }
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [agentId, agentsService, toolsService, user?.id])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  const handleAgentSubmit = useCallback(
    async (values: AgentFormValues) => {
      if (!agent) return
      setIsSavingAgent(true)
      try {
        const { is_active: _is_active, ...payload } = {
          ...values,
          description: values.description || null,
          api_key: values.api_key || undefined,
          base_url: values.base_url || null,
          skill_tags: values.skill_tags || [],
        }
        await agentsService.updateAgent(agent.id, payload)

        const toMap = selectedToolIds.filter((id) => !initialToolIds.includes(id))
        const toUnmap = initialToolIds.filter((id) => !selectedToolIds.includes(id))
        if (toMap.length > 0 || toUnmap.length > 0) {
          const results = await Promise.allSettled([
            ...toMap.map((toolId) => toolsService.mapToolToAgent(agent.id, toolId)),
            ...toUnmap.map((toolId) => toolsService.unmapToolFromAgent(agent.id, toolId)),
          ])
          const failed = results.filter((r) => r.status === 'rejected').length
          if (failed > 0) {
            toast.error(
              `El agente se guardó, pero fallaron ${failed} asignaciones de herramientas.`
            )
          }
        }

        toast.success('Agente actualizado')
        setEditAgentOpen(false)
        loadData()
      } catch {
        toast.error('Ocurrió un error al guardar el agente')
      } finally {
        setIsSavingAgent(false)
      }
    },
    [agent, agentsService, toolsService, selectedToolIds, initialToolIds, loadData]
  )

  const isManageableTool = (toolType: string) =>
    MANAGEABLE_TOOL_TYPES.includes(toolType as ManageableToolType)

  const handleEditTool = useCallback(
    async (tool: ToolWithAuthStatus) => {
      setLoadingToolId(tool.id)
      try {
        const fullTool = await toolsService.getTool(tool.id)
        setEditingTool(fullTool)
      } catch {
        toast.error('No se pudo cargar el detalle de la herramienta')
      } finally {
        setLoadingToolId(null)
      }
    },
    [toolsService]
  )

  const handleToolSubmit = useCallback(
    async (values: ToolFormValues) => {
      if (!editingTool) return
      setIsSavingTool(true)
      try {
        await toolsService.patchTool(editingTool.id, {
          name: values.name,
          description: values.description || '',
          tool_type: values.tool_type,
          execution_config: buildExecutionConfig(values),
          schema_json: parseSchemaJson(values),
          is_active: values.is_active,
        })
        toast.success('Herramienta actualizada')
        setEditingTool(null)
        loadData()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al guardar la herramienta'
        )
      } finally {
        setIsSavingTool(false)
      }
    },
    [editingTool, toolsService, loadData]
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {agent?.name || 'Detalle del Agente'}
            </DialogTitle>
            <DialogDescription>
              {agent?.description || 'Información del agente asignado a este nodo.'}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loading className="h-6 w-6 text-primary" />
            </div>
          ) : loadError || !agent ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 border border-destructive/50 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="text-xs">
                No se pudo cargar el agente. Verifica el Agent ID del nodo.
              </span>
            </div>
          ) : (
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {agent.model_provider}
                </Badge>
                <Badge variant="secondary" className="max-w-full truncate text-xs">
                  {agent.model_name}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Max loops: {agent.max_loops}
                </Badge>
                <Badge
                  variant={agent.is_active ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {agent.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
                {agent.enable_ui && (
                  <Badge variant="outline" className="text-xs">
                    UI habilitada
                  </Badge>
                )}
              </div>

              {agent.skill_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {agent.skill_tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  System Prompt
                </span>
                <div className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words border border-input bg-muted/30 p-3 font-mono text-xs">
                  {agent.system_prompt || 'Sin system prompt'}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Wrench className="h-3.5 w-3.5" />
                    Herramientas asignadas
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {tools.length}
                  </Badge>
                </div>

                {tools.length === 0 ? (
                  <div className="flex h-16 items-center justify-center border border-input text-xs text-muted-foreground">
                    Este agente no tiene herramientas asignadas
                  </div>
                ) : (
                  <div className="divide-y divide-input border border-input">
                    {tools.map((tool) => {
                      const manageable = isManageableTool(tool.tool_type)
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center gap-2 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
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
                              {tool.auth_status !== 'not_required' && (
                                <span
                                  className="shrink-0"
                                  title={
                                    tool.auth_status === 'connected'
                                      ? 'Conectada'
                                      : tool.auth_status === 'expired'
                                        ? 'Autorización expirada'
                                        : 'Desconectada'
                                  }
                                >
                                  {tool.auth_status === 'connected' ? (
                                    <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                                  ) : (
                                    <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 shrink-0 rounded-none p-0"
                            disabled={!manageable || loadingToolId === tool.id}
                            title={
                              manageable
                                ? 'Ver y editar herramienta'
                                : 'Esta herramienta se gestiona en Conectores'
                            }
                            onClick={() => handleEditTool(tool)}
                          >
                            {loadingToolId === tool.id ? (
                              <Loading className="h-3.5 w-3.5" />
                            ) : (
                              <Pencil className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-none"
                  onClick={() => setEditAgentOpen(true)}
                >
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Editar Agente
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editAgentOpen} onOpenChange={setEditAgentOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Editar Agente</DialogTitle>
            <DialogDescription>
              Modifica la configuración del agente de IA.
            </DialogDescription>
          </DialogHeader>
          {editAgentOpen && agent && (
            <AgentForm
              key={agent.id}
              agent={agent}
              onSubmit={handleAgentSubmit}
              onCancel={() => setEditAgentOpen(false)}
              isSubmitting={isSavingAgent}
              selectedToolIds={selectedToolIds}
              onToolsChange={setSelectedToolIds}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={editingTool !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setEditingTool(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Editar Herramienta</DialogTitle>
            <DialogDescription>
              Modifica la configuración de la herramienta.
            </DialogDescription>
          </DialogHeader>
          {editingTool && (
            <ToolForm
              key={editingTool.id}
              tool={editingTool}
              onSubmit={handleToolSubmit}
              onCancel={() => setEditingTool(null)}
              isSubmitting={isSavingTool}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
