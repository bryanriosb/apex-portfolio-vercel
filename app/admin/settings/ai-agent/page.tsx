'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import { AgentLinkModal, AgentLinkCard } from '@/components/ai-agent'
import { Plus, Bot, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import {
  createAgentLinkAction,
  fetchAgentLinksAction,
  updateAgentLinkAction,
  deleteAgentLinkAction,
} from '@/lib/actions/ai-agent'
import type { AgentLink, AgentLinkInsert, AgentLinkUpdate } from '@/lib/models/ai-conversation'

export default function AIAgentSettingsPage() {
  const { activeBusiness } = useActiveBusinessStore()
  const [links, setLinks] = useState<AgentLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedLink, setSelectedLink] = useState<AgentLink | null>(null)
  const [linkToDelete, setLinkToDelete] = useState<AgentLink | null>(null)

  const loadLinks = useCallback(async () => {
    if (!activeBusiness?.id) return

    setIsLoading(true)
    try {
      const result = await fetchAgentLinksAction(activeBusiness.id)
      if (result.success && result.data) {
        setLinks(result.data)
      }
    } catch (error) {
      console.error('Error loading links:', error)
      toast.error('Error al cargar los enlaces')
    } finally {
      setIsLoading(false)
    }
  }, [activeBusiness?.id])

  useEffect(() => {
    loadLinks()
  }, [loadLinks])

  const handleCreateLink = () => {
    setSelectedLink(null)
    setModalOpen(true)
  }

  const handleEditLink = (link: AgentLink) => {
    setSelectedLink(link)
    setModalOpen(true)
  }

  const handleDeleteLink = (link: AgentLink) => {
    setLinkToDelete(link)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!linkToDelete) return

    try {
      const result = await deleteAgentLinkAction(linkToDelete.id)
      if (result.success) {
        toast.success('Enlace eliminado correctamente')
        loadLinks()
      } else {
        throw new Error(result.error)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar el enlace'
      toast.error(message)
    } finally {
      setDeleteDialogOpen(false)
      setLinkToDelete(null)
    }
  }

  const handleSaveLink = async (data: AgentLinkInsert | AgentLinkUpdate) => {
    try {
      if (selectedLink) {
        const result = await updateAgentLinkAction(selectedLink.id, data as AgentLinkUpdate)
        if (result.success) {
          toast.success('Enlace actualizado correctamente')
        } else {
          throw new Error(result.error)
        }
      } else {
        const result = await createAgentLinkAction(data as AgentLinkInsert)
        if (result.success) {
          toast.success('Enlace creado correctamente')
        } else {
          throw new Error(result.error)
        }
      }
      loadLinks()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar el enlace'
      toast.error(message)
      throw error
    }
  }

  if (!activeBusiness) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Selecciona un negocio para continuar</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-8 w-8" />
            Asistente IA
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los enlaces de tu asistente virtual para agendar citas
          </p>
        </div>
        <Button onClick={handleCreateLink} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Crear Enlace
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : links.length === 0 ? (
        <div className="flex h-[30vh] flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed">
          <Bot className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">No hay enlaces creados</p>
            <p className="text-sm text-muted-foreground">
              Crea tu primer enlace para compartir el asistente con tus clientes
            </p>
          </div>
          <Button onClick={handleCreateLink}>
            <Plus className="mr-2 h-4 w-4" />
            Crear primer enlace
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <AgentLinkCard
              key={link.id}
              link={link}
              onEdit={handleEditLink}
              onDelete={handleDeleteLink}
            />
          ))}
        </div>
      )}

      <AgentLinkModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        link={selectedLink}
        businessId={activeBusiness.id}
        onSave={handleSaveLink}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="enlace"
      />
    </div>
  )
}
