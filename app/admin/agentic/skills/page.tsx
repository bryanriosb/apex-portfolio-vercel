'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/DataTable'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { SkillsService } from '@/lib/services/agents/skills-service'
import { getSkillsColumns } from '@/components/agents/skills/SkillsColumns'
import { SkillForm } from '@/components/agents/skills/SkillForm'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import type {
  SkillFormValues,
  SkillListItem,
<<<<<<< HEAD
  SkillReferenceOps,
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
} from '@/lib/models/agents/skill'

export default function SkillsPage() {
  const { isLoading: businessLoading } = useActiveBusinessStore()

  const service = useMemo(() => new SkillsService(), [])

  const [skills, setSkills] = useState<SkillListItem[]>([])
  const [loading, setLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editingValues, setEditingValues] = useState<SkillFormValues | null>(
    null
  )
<<<<<<< HEAD
  const [editingReferences, setEditingReferences] = useState<string[]>([])
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
  const [isLoadingContent, setIsLoadingContent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [skillToDelete, setSkillToDelete] = useState<SkillListItem | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await service.listSkills()
      setSkills(data)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'No se pudieron cargar las habilidades'
      )
    } finally {
      setLoading(false)
    }
  }, [service])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCreate = useCallback(() => {
    setEditingValues(null)
<<<<<<< HEAD
    setEditingReferences([])
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
    setFormOpen(true)
  }, [])

  const handleEdit = useCallback(
    async (skill: SkillListItem) => {
      setEditingValues({ name: skill.name, content: '' })
<<<<<<< HEAD
      setEditingReferences([])
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
      setIsLoadingContent(true)
      setFormOpen(true)
      try {
        const full = await service.getSkill(skill.name)
        setEditingValues({ name: full.name, content: full.content })
<<<<<<< HEAD
        setEditingReferences(
          (full.metadata?.references ?? []).map((path) =>
            path.replace(/^references\//, '')
          )
        )
      } catch {
=======
      } catch (err) {
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
        toast.error('No se pudo cargar el contenido de la habilidad')
        setFormOpen(false)
      } finally {
        setIsLoadingContent(false)
      }
    },
    [service]
  )

<<<<<<< HEAD
  const loadReferenceContent = useCallback(
    async (filename: string) => {
      const name = editingValues?.name
      if (!name) throw new Error('Skill sin nombre')
      const reference = await service.getSkillReference(name, filename)
      return reference.content
    },
    [service, editingValues]
  )

=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
  const handleDeleteClick = useCallback((skill: SkillListItem) => {
    setSkillToDelete(skill)
    setDeleteDialogOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!skillToDelete) return
    setIsDeleting(true)
    try {
      await service.deleteSkill(skillToDelete.name)
      toast.success('Habilidad eliminada')
      setDeleteDialogOpen(false)
      setSkillToDelete(null)
      loadData()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Ocurrió un error al eliminar la habilidad'
      )
    } finally {
      setIsDeleting(false)
    }
  }, [service, skillToDelete, loadData])

  const handleSubmit = useCallback(
<<<<<<< HEAD
    async (values: SkillFormValues, references: SkillReferenceOps) => {
=======
    async (values: SkillFormValues) => {
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
      setIsSubmitting(true)
      try {
        if (editingValues) {
          await service.updateSkill(values.name, values.content)
<<<<<<< HEAD
        } else {
          await service.createSkill(values)
        }

        // Los archivos de reference se suben tras persistir la skill; las
        // operaciones son independientes entre sí → en paralelo. Ante un
        // fallo parcial el diálogo queda abierto y el reintento es seguro:
        // POST /skills es upsert, PUT de reference reemplaza y DELETE es
        // idempotente (204 aunque el objeto ya no exista).
        await Promise.all([
          ...references.upserts.map((file) =>
            service.putSkillReference(values.name, file.filename, file.content)
          ),
          ...references.deletions.map((filename) =>
            service.deleteSkillReference(values.name, filename)
          ),
        ])

        toast.success(
          editingValues ? 'Habilidad actualizada' : 'Habilidad creada'
        )
        setFormOpen(false)
        setEditingValues(null)
        setEditingReferences([])
=======
          toast.success('Habilidad actualizada')
        } else {
          await service.createSkill(values)
          toast.success('Habilidad creada')
        }
        setFormOpen(false)
        setEditingValues(null)
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
        loadData()
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al guardar la habilidad'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [service, editingValues, loadData]
  )

  const columns = useMemo(() => {
    return getSkillsColumns().map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: ({ row }: { row: any }) => {
            const skill = row.original as SkillListItem
            return (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => handleEdit(skill)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleDeleteClick(skill)}
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
  }, [handleEdit, handleDeleteClick])

  if (businessLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
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
            <Sparkles className="h-6 w-6 text-primary" />
            Habilidades
          </h1>
          <p className="text-sm text-muted-foreground">
            Instrucciones reutilizables que tus agentes activan según la
            consulta. Los cambios se sirven en segundos, sin reiniciar.
          </p>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Habilidad
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loading className="h-8 w-8 text-primary" />
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={skills}
          searchConfig={{
            column: 'name',
            placeholder: 'Buscar habilidad...',
          }}
          emptyState={
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Sparkles className="h-10 w-10 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-medium">Sin habilidades</p>
                <p className="text-sm text-muted-foreground">
                  Crea tu primera habilidad para tus agentes.
                </p>
              </div>
            </div>
          }
        />
      )}

      <SkillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        initialValues={editingValues}
<<<<<<< HEAD
        initialReferences={editingReferences}
        loadReferenceContent={loadReferenceContent}
=======
>>>>>>> ea092bee9537f06f5f3ca5f85183d1c08da795d8
        isLoadingContent={isLoadingContent}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        title="Eliminar habilidad"
        description={`¿Seguro que deseas eliminar la habilidad "${skillToDelete?.name}"? Los agentes dejarán de usarla en segundos.`}
      />
    </div>
  )
}
