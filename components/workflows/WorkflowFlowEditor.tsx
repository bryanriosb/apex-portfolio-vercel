'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import Loading from '@/components/ui/loading'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { FlowEditor } from './FlowEditor'
import { WorkflowsService } from '@/lib/services/workflows/workflow-service'
import {
  workflowFormSchema,
  type WorkflowFormValues,
  type GraphDefinition,
} from '@/lib/models/workflows/workflow'

const defaultGraph: GraphDefinition = {
  channels: [],
  nodes: [],
  edges: [],
  conditional_edges: [],
  config: { recursion_limit: 10 },
}

interface WorkflowFlowEditorProps {
  id?: string
}

export function WorkflowFlowEditor({ id }: WorkflowFlowEditorProps) {
  const router = useRouter()
  const service = useMemo(() => new WorkflowsService(), [])
  const isEditMode = !!id

  const [loading, setLoading] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadedRef = useRef(false)

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      name: '',
      description: '',
      graph_json: defaultGraph,
    },
  })

  useEffect(() => {
    if (!id || loadedRef.current) return
    loadedRef.current = true
    setLoading(true)
    service
      .getWorkflow(id)
      .then((workflow) => {
        form.reset({
          name: workflow.name,
          description: workflow.description,
          graph_json: workflow.graph_json || defaultGraph,
        })
      })
      .catch(() => {
        toast.error('No se pudo cargar el flujo')
        router.push('/admin/agentic/flows')
      })
      .finally(() => setLoading(false))
  }, [id, service, form, router])

  const handleSubmit = useCallback(
    async (values: WorkflowFormValues) => {
      setIsSubmitting(true)
      try {
        if (isEditMode && id) {
          await service.updateWorkflow(id, {
            name: values.name,
            description: values.description,
            graph_json: values.graph_json,
          })
          toast.success('Flujo actualizado')
        } else {
          await service.createWorkflow({
            name: values.name,
            description: values.description,
            graph_json: values.graph_json,
          })
          toast.success('Flujo creado')
        }
        router.push('/admin/agentic/flows')
      } catch (err) {
        toast.error(
          isEditMode
            ? 'Ocurrió un error al actualizar el flujo'
            : 'Ocurrió un error al crear el flujo'
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [isEditMode, id, service, router]
  )

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loading className="h-8 w-8 text-primary" />
          <span className="text-sm text-muted-foreground">
            Cargando flujo...
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/agentic/flows">
            <Button variant="ghost" size="sm" className="rounded-none gap-1">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditMode ? 'Editar Flujo' : 'Nuevo Flujo'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEditMode
                ? 'Modifica la configuración del flujo de trabajo.'
                : 'Configura un nuevo flujo de trabajo de agente.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/agentic/flows">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-none"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          </Link>
          <Button
            type="submit"
            form="workflow-form"
            size="sm"
            className="rounded-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loading className="mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditMode ? 'Actualizar' : 'Crear'}
              </>
            )}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form
          id="workflow-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col flex-1"
        >
          <FormField
            control={form.control}
            name="graph_json"
            render={({ field }) => (
              <FormItem className="flex-1 flex flex-col min-h-[600px]">
                <div className="flex-1 min-h-0" style={{ minHeight: 560 }}>
                  <FlowEditor
                    value={field.value}
                    onChange={(graph) => field.onChange(graph)}
                    sidebarTop={
                      <div className="space-y-3">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field: nameField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Nombre</FormLabel>
                              <FormControl>
                                <Input
                                  className="rounded-none h-7 text-xs"
                                  placeholder="Nombre del flujo"
                                  {...nameField}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field: descField }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Descripción</FormLabel>
                              <FormControl>
                                <Textarea
                                  className="rounded-none text-xs resize-none"
                                  placeholder="Descripción del flujo"
                                  rows={3}
                                  {...descField}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    }
                  />
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  )
}
