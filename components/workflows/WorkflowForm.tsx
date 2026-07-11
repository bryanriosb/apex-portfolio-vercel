'use client'

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
import Loading from '@/components/ui/loading'
import { FlowEditor } from './FlowEditor'
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

interface WorkflowFormProps {
  workflow?: { name: string; description: string; graph_json: GraphDefinition } | null
  onSubmit: (values: WorkflowFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function WorkflowForm({
  workflow,
  onSubmit,
  onCancel,
  isSubmitting,
}: WorkflowFormProps) {
  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      name: workflow?.name || '',
      description: workflow?.description || '',
      graph_json: workflow?.graph_json || defaultGraph,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  className="rounded-none"
                  placeholder="Nombre del flujo"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input
                  className="rounded-none"
                  placeholder="Descripción del flujo"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="graph_json"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grafo del flujo de trabajo</FormLabel>
              <FormControl>
                <FlowEditor
                  value={field.value}
                  onChange={(graph) => field.onChange(graph)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            size="sm"
            className="rounded-none"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loading className="mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : workflow ? (
              'Actualizar'
            ) : (
              'Crear'
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
