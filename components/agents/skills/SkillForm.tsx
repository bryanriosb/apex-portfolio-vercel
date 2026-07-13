'use client'

import { useEffect } from 'react'
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
} from '@/lib/models/agents/skill'

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
  onSubmit: (values: SkillFormValues) => Promise<void>
  isSubmitting: boolean
  /** Valores iniciales al editar; null al crear. */
  initialValues: SkillFormValues | null
  /** Contenido cargándose desde el catálogo (modo edición). */
  isLoadingContent?: boolean
}

export function SkillForm({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  initialValues,
  isLoadingContent = false,
}: SkillFormProps) {
  const { resolvedTheme } = useTheme()
  const isEditing = initialValues !== null

  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: initialValues ?? { name: '', content: buildSkillTemplate('') },
  })

  useEffect(() => {
    if (open) {
      form.reset(initialValues ?? { name: '', content: buildSkillTemplate('') })
    }
  }, [open, initialValues, form])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
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
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
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
                        if (!isEditing && !form.formState.dirtyFields.content) {
                          form.setValue(
                            'content',
                            buildSkillTemplate(e.target.value)
                          )
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Identificador único. No se puede cambiar después de crearla.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contenido</FormLabel>
                  <FormControl>
                    {isLoadingContent ? (
                      <div className="flex h-[320px] items-center justify-center border border-input">
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
                          height={320}
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
                    Markdown con frontmatter YAML. El backend valida el formato
                    antes de guardar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
