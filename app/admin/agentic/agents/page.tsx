'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import {
  Plus,
  Bot,
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { useCurrentUser } from '@/hooks/use-current-user'
import { AgentsService } from '@/lib/services/agents/agents-service'
import { ToolsService } from '@/lib/services/agents/tools-service'
import { getAgentsColumns } from '@/components/agents/AgentsColumns'
import { AgentForm } from '@/components/agents/AgentForm'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import type { Agent, AgentFormValues } from '@/lib/models/agents/agent'

export default function AgentsPage() {
  const { activeBusiness, isLoading: businessLoading } = useActiveBusinessStore()
  const { user } = useCurrentUser()

  const service = useMemo(() => new AgentsService(), [])
  const toolsService = useMemo(() => new ToolsService(), [])

  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
  const [initialToolIds, setInitialToolIds] = useState<string[]>([])
  const [toolsLoading, setToolsLoading] = useState(false)
  const toolsRequestRef = useRef(0)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await service.listAgents()
      setAgents(data)
    } catch (err) {
      toast.error('No se pudieron cargar los agentes')
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = useCallback(() => {
    toolsRequestRef.current += 1
    setEditingAgent(null)
    setSelectedToolIds([])
    setInitialToolIds([])
    setToolsLoading(false)
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback(
    async (agent: Agent) => {
      const requestId = ++toolsRequestRef.current
      setEditingAgent(agent)
      setSelectedToolIds([])
      setInitialToolIds([])
      setFormOpen(true)

      if (!user?.id) {
        toast.error(
          'No se pudieron cargar las herramientas asignadas; reabre el agente'
        )
        return
      }

      setToolsLoading(true)
      try {
        const agentTools = await toolsService.listAgentTools(agent.id, {
          user_id: user.id,
          business_account_id: agent.business_account_id,
        })
        if (toolsRequestRef.current !== requestId) return
        const toolIds = agentTools.map((tool) => tool.id)
        setSelectedToolIds(toolIds)
        setInitialToolIds(toolIds)
      } catch (err) {
        if (toolsRequestRef.current === requestId) {
          toast.error('No se pudieron cargar las herramientas del agente')
        }
      } finally {
        if (toolsRequestRef.current === requestId) {
          setToolsLoading(false)
        }
      }
    },
    [toolsService, user?.id]
  )

  const handleToggleActive = useCallback(
    async (agent: Agent) => {
      try {
        await service.updateAgent(agent.id, { is_active: !agent.is_active })
        toast.success(
          `Agente ${agent.is_active ? 'desactivado' : 'activado'} exitosamente`
        )
        loadData()
      } catch (err) {
        toast.error('No se pudo cambiar el estado del agente')
      }
    },
    [service, loadData]
  )

  const handleDeleteClick = useCallback((agent: Agent) => {
    setAgentToDelete(agent)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!agentToDelete) return
    setIsDeleting(true)
    try {
      await service.deleteAgent(agentToDelete.id)
      toast.success('Agente eliminado')
      setDeleteDialogOpen(false)
      setAgentToDelete(null)
      loadData()
    } catch (err) {
      toast.error('Ocurrió un error al eliminar el agente')
    } finally {
      setIsDeleting(false)
    }
  }, [service, agentToDelete, loadData])

  const handleSubmit = useCallback(
    async (values: AgentFormValues) => {
      setIsSubmitting(true)
      try {
        const payload = {
          ...values,
          description: values.description || null,
          api_key: values.api_key || undefined,
          base_url: values.base_url || null,
          skill_tags: values.skill_tags || [],
        }

        let agentId: string
        if (editingAgent) {
          const { is_active: _is_active, ...updatePayload } = payload
          await service.updateAgent(editingAgent.id, updatePayload)
          agentId = editingAgent.id
          toast.success('Agente actualizado')
        } else {
          const created = await service.createAgent(payload)
          agentId = created.id
          toast.success('Agente creado')
        }

        const toolsToMap = selectedToolIds.filter(
          (id) => !initialToolIds.includes(id)
        )
        const toolsToUnmap = initialToolIds.filter(
          (id) => !selectedToolIds.includes(id)
        )
        if (toolsToMap.length > 0 || toolsToUnmap.length > 0) {
          const results = await Promise.allSettled([
            ...toolsToMap.map((toolId) =>
              toolsService.mapToolToAgent(agentId, toolId)
            ),
            ...toolsToUnmap.map((toolId) =>
              toolsService.unmapToolFromAgent(agentId, toolId)
            ),
          ])
          const failed = results.filter(
            (result) => result.status === 'rejected'
          ).length
          if (failed > 0) {
            toast.error(
              `El agente se guardó, pero fallaron ${failed} asignaciones de herramientas. Reabre el agente para verificar.`
            )
          }
        }

        setFormOpen(false)
        setEditingAgent(null)
        loadData()
      } catch (err) {
        toast.error('Ocurrió un error al guardar el agente')
      } finally {
        setIsSubmitting(false)
      }
    },
    [service, toolsService, editingAgent, selectedToolIds, initialToolIds, loadData]
  )

  const timezone = activeBusiness?.timezone || 'America/Bogota'

  const columns = useMemo(() => {
    return getAgentsColumns(timezone).map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const agent = row.original as Agent
            return (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleEdit(agent)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleToggleActive(agent)}>
                    {agent.is_active ? (
                      <>
                        <PowerOff className="mr-2 h-4 w-4" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <Power className="mr-2 h-4 w-4" />
                        Activar
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleDeleteClick(agent)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          },
        }
      }
      return col
    })
  }, [timezone, handleEdit, handleToggleActive, handleDeleteClick])

  if (businessLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loading className="h-8 w-8 text-primary" />
          <span className="text-sm text-muted-foreground">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Agentes
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los agentes de IA de tu organización.
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Agente
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={agents}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Bot className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium">Sin agentes</p>
                <p className="text-sm text-muted-foreground">
                  Crea tu primer agente de IA para comenzar.
                </p>
              </div>
              <Button onClick={handleCreate} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Crear Agente
              </Button>
            </div>
          }
        />
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>
              {editingAgent ? 'Editar Agente' : 'Nuevo Agente'}
            </DialogTitle>
            <DialogDescription>
              {editingAgent
                ? 'Modifica la configuración del agente de IA.'
                : 'Configura un nuevo agente de IA.'}
            </DialogDescription>
          </DialogHeader>
          {formOpen && (
            <AgentForm
              key={editingAgent ? editingAgent.id : 'new'}
              agent={editingAgent}
              onSubmit={handleSubmit}
              onCancel={() => setFormOpen(false)}
              isSubmitting={isSubmitting}
              selectedToolIds={selectedToolIds}
              onToolsChange={setSelectedToolIds}
              toolsLoading={toolsLoading}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        itemName="agente"
        count={1}
      />
    </div>
  )
}
