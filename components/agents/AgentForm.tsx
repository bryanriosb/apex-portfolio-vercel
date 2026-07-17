'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import {
  Form,
} from '@/components/ui/form'
import Loading from '@/components/ui/loading'
import { AgentFormFields } from './AgentFormFields'
import { AgentToolsSelector } from './AgentToolsSelector'
import { useAvailableLlmProviders } from '@/hooks/use-available-llm-providers'
import {
  agentFormSchema,
  type AgentFormValues,
  type Agent,
} from '@/lib/models/agents/agent'

interface AgentFormProps {
  agent?: Agent | null
  onSubmit: (values: AgentFormValues) => void
  onCancel: () => void
  isSubmitting: boolean
  selectedToolIds: string[]
  onToolsChange: (toolIds: string[]) => void
  toolsLoading?: boolean
}

export function AgentForm({
  agent,
  onSubmit,
  onCancel,
  isSubmitting,
  selectedToolIds,
  onToolsChange,
  toolsLoading = false,
}: AgentFormProps) {
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agent?.name || '',
      description: agent?.description || '',
      model_provider: agent?.model_provider || 'deepinfra',
      model_name: agent?.model_name || 'openai/gpt-oss-120b',
      api_key: '',
      base_url: agent?.base_url || '',
      system_prompt: agent?.system_prompt || '',
      max_loops: agent?.max_loops || 1,
      skill_tags: agent?.skill_tags || [],
      enable_ui: agent?.enable_ui ?? false,
      is_active: agent?.is_active ?? true,
    },
  })

  const { isRestricted, hasConfiguredProviders } = useAvailableLlmProviders()
  // Sin proveedor disponible no se puede crear un agente (apuntaría a un
  // proveedor de plataforma bloqueado). En edición se permite: el agente ya
  // tiene proveedor propio / BYOK.
  const blockCreateNoProvider =
    !agent && isRestricted && !hasConfiguredProviders

  const handleSubmit = (values: AgentFormValues) => {
    if (blockCreateNoProvider) return
    onSubmit(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="min-w-0 space-y-5">
        <AgentFormFields form={form} isSubmitting={isSubmitting} />

        <AgentToolsSelector
          selectedToolIds={selectedToolIds}
          onChange={onToolsChange}
          disabled={isSubmitting || toolsLoading}
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
            disabled={isSubmitting || blockCreateNoProvider}
            size="sm"
            className="rounded-none"
          >
            {isSubmitting ? (
              <>
                <Loading className="mr-2 h-4 w-4" />
                Guardando...
              </>
            ) : agent ? (
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
