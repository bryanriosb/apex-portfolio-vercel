'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import Loading from '@/components/ui/loading'
import { ToolFormFields } from './ToolFormFields'
import {
  emptyToolFormValues,
  toolFormSchema,
  toolToFormValues,
  type ToolDefinition,
  type ToolFormValues,
} from '@/lib/models/agents/tool'

interface ToolFormProps {
  tool?: ToolDefinition | null
  onSubmit: (values: ToolFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function ToolForm({
  tool,
  onSubmit,
  onCancel,
  isSubmitting,
}: ToolFormProps) {
  const form = useForm<ToolFormValues>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: tool ? toolToFormValues(tool) : emptyToolFormValues(),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <ToolFormFields form={form} isSubmitting={isSubmitting} />

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
            disabled={isSubmitting}
            size="sm"
            className="rounded-none"
          >
            {isSubmitting ? (
              <>
                <Loading className="mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : tool ? (
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
