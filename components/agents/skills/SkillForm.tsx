'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTheme } from 'next-themes'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  buildSkillTemplate,
  skillFormSchema,
  type SkillFormValues,
  type SkillReferenceDraft,
  type SkillReferenceOps,
} from '@/lib/models/agents/skill'
import {
  updateSkillFrontmatterName,
  updateSkillReferencesList,
} from '@/lib/models/agents/skill-frontmatter'
import { SkillLogicFields } from '@/components/agents/skills/SkillLogicFields'
import { SkillReferencesEditor } from '@/components/agents/skills/SkillReferencesEditor'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center border border-input">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface SkillFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: SkillFormValues, references: SkillReferenceOps) => Promise<void>
  isSubmitting: boolean
  /** Valores iniciales al editar; null al crear. */
  initialValues: SkillFormValues | null
  /** Archivos de reference ya persistidos de la skill (vacío al crear).
   * Debe ser una referencia estable (estado del caller), no un literal
   * inline: participa en las deps del reset del formulario. */
  initialReferences: string[]
  /** Descarga el contenido de una reference persistida (modo edición). */
  loadReferenceContent: (filename: string) => Promise<string>
  /** Contenido cargándose desde el catálogo (modo edición). */
  isLoadingContent?: boolean
}

export function SkillForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialValues,
  initialReferences,
  loadReferenceContent,
  isLoadingContent = false,
}: SkillFormProps) {
  const { resolvedTheme } = useTheme()
  const isEditing = initialValues !== null

  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: initialValues ?? { name: '', content: buildSkillTemplate('') },
  })

  const [referenceDrafts, setReferenceDrafts] = useState<SkillReferenceDraft[]>([])

  useEffect(() => {
    if (open) {
      form.reset(initialValues ?? { name: '', content: buildSkillTemplate('') })
      setReferenceDrafts(
        initialReferences.map((filename) => ({
          filename,
          content: null,
          dirty: false,
        }))
      )
    }
  }, [open, initialValues, initialReferences, form])

  const handleDraftsChange = (drafts: SkillReferenceDraft[]) => {
    const filenamesChanged =
      drafts.map((d) => d.filename).join('\n') !==
      referenceDrafts.map((d) => d.filename).join('\n')
    setReferenceDrafts(drafts)

    // El frontmatter `references` refleja la LISTA de archivos: solo se
    // reescribe cuando cambia el conjunto, no en cada tecla del editor de
    // contenido (evita churn y marcar `content` dirty sin motivo).
    if (!filenamesChanged) return
    const current = form.getValues('content')
    const synced = updateSkillReferencesList(
      current,
      drafts.map((d) => `references/${d.filename}`)
    )
    if (synced !== null) {
      form.setValue('content', synced, { shouldDirty: true })
    }
  }

  const handleSubmit = (values: SkillFormValues) => {
    const upserts = referenceDrafts
      .filter((d) => d.dirty && d.content !== null)
      .map((d) => ({ filename: d.filename, content: d.content as string }))
    const deletions = initialReferences.filter(
      (filename) => !referenceDrafts.some((d) => d.filename === filename)
    )
    return onSubmit(values, { upserts, deletions })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* La base del DialogContent trae `sm:max-w-lg`: el override debe usar
          el mismo breakpoint o tailwind-merge no lo reemplaza. */}
      <DialogContent className="max-h-[90vh] w-[95vw] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar habilidad' : 'Nueva habilidad'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Los cambios quedan disponibles para los agentes en segundos, sin reiniciar.'
              : 'Define el frontmatter (name, description) y las instrucciones en markdown.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            {/* Dos columnas en desktop (40/60: el editor necesita más ancho),
                apiladas en móvil: identidad y metadata a la izquierda;
                references y contenido (largos) a la derecha. */}
            <div className="grid items-start gap-6 md:grid-cols-5">
              <div className="flex min-w-0 flex-col gap-4 md:col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="seguimiento-facturas"
                          disabled={isEditing || isSubmitting}
                          onChange={(e) => {
                            field.onChange(e)
                            if (isEditing) return
                            // Mantiene el `name:` del frontmatter sincronizado
                            // sin pisar tags/allowed-tools/references ya
                            // editados.
                            const current = form.getValues('content')
                            const synced = updateSkillFrontmatterName(
                              current,
                              e.target.value || 'mi-habilidad'
                            )
                            if (synced !== null) {
                              form.setValue('content', synced)
                            } else if (!form.formState.dirtyFields.content) {
                              form.setValue(
                                'content',
                                buildSkillTemplate(e.target.value)
                              )
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Identificador único. No se puede cambiar después de
                        crearla.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!isLoadingContent && (
                  <SkillLogicFields
                    control={form.control}
                    onContentChange={(value) =>
                      form.setValue('content', value, { shouldDirty: true })
                    }
                    disabled={isSubmitting}
                  />
                )}
              </div>

              <div className="flex min-w-0 flex-col gap-4 md:col-span-3">
                {!isLoadingContent && (
                  <SkillReferencesEditor
                    drafts={referenceDrafts}
                    onDraftsChange={handleDraftsChange}
                    loadContent={loadReferenceContent}
                    disabled={isSubmitting}
                  />
                )}

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contenido</FormLabel>
                      <FormControl>
                        {isLoadingContent ? (
                          <div className="flex h-[380px] items-center justify-center border border-input">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div
                            data-color-mode={
                              resolvedTheme === 'dark' ? 'dark' : 'light'
                            }
                            className="min-w-0 overflow-hidden"
                          >
                            <MDEditor
                              value={field.value || ''}
                              onChange={(value) => field.onChange(value ?? '')}
                              onBlur={field.onBlur}
                              height={380}
                              preview="edit"
                              className="rounded-none!"
                              textareaProps={{
                                placeholder:
                                  '---\nname: mi-habilidad\ndescription: ...\n---\nInstrucciones...',
                                disabled: isSubmitting,
                              }}
                            />
                          </div>
                        )}
                      </FormControl>
                      <FormDescription>
                        Markdown con frontmatter YAML. El backend valida el
                        formato antes de guardar.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting || isLoadingContent}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? 'Guardar cambios' : 'Crear habilidad'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
