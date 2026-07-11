'use client'

import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import Loading from '@/components/ui/loading'
import { LlmProviderFormFields } from './LlmProviderFormFields'
import {
  emptyLlmProviderFormValues,
  findLlmProviderOption,
  getLlmProviderFormSchema,
  llmProviderToFormValues,
  type LlmProvider,
  type LlmProviderFormValues,
  type LlmProviderOption,
} from '@/lib/models/agents/llm-provider'

interface LlmProviderFormProps {
  provider?: LlmProvider | null
  providerOptions: { native: LlmProviderOption[]; compatible: LlmProviderOption[] }
  onSubmit: (values: LlmProviderFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
}

export function LlmProviderForm({
  provider,
  providerOptions,
  onSubmit,
  onCancel,
  isSubmitting,
}: LlmProviderFormProps) {
  const isEditing = Boolean(provider)

  const schema = useMemo(
    () =>
      getLlmProviderFormSchema({
        isEditing,
        requiresBaseUrl: (value) =>
          findLlmProviderOption(providerOptions, value)?.requiresBaseUrl ??
          false,
      }),
    [isEditing, providerOptions]
  )

  const form = useForm<LlmProviderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: provider
      ? llmProviderToFormValues(provider)
      : emptyLlmProviderFormValues(),
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <LlmProviderFormFields
          form={form}
          providerOptions={providerOptions}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
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
            disabled={isSubmitting}
            size="sm"
            className="rounded-none"
          >
            {isSubmitting ? (
              <>
                <Loading className="mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : provider ? (
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
