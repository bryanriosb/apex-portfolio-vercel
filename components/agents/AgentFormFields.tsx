'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { UseFormReturn } from 'react-hook-form'
import { useTheme } from 'next-themes'
import { Eye, EyeOff, Plus, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAvailableLlmProviders } from '@/hooks/use-available-llm-providers'
import { ProviderLogo } from '@/components/agents/ProviderLogo'
import { NoLlmProvidersConfigured } from '@/components/agents/providers/NoLlmProvidersConfigured'
import { Spinner } from '@/components/ui/spinner'
import type { AgentFormValues } from '@/lib/models/agents/agent'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center border border-input">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

interface AgentFormFieldsProps {
  form: UseFormReturn<AgentFormValues>
  isSubmitting: boolean
}

const MODEL_PROVIDERS = [
  { value: 'deepinfra', label: 'DeepInfra' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'groq', label: 'Groq' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'google', label: 'Google' },
  { value: 'meta', label: 'Meta' },
  { value: 'alibaba', label: 'Alibaba' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI' },
  { value: 'cohere', label: 'Cohere' },
  { value: 'nvidia', label: 'Nvidia' },
  { value: 'zhipuai', label: 'Zhipu AI' },
  { value: 'minimax', label: 'MiniMax' },
  { value: 'moonshotai', label: 'Moonshot AI' },
  { value: 'xiaomi', label: 'Xiaomi' },
  { value: 'stepfun', label: 'StepFun' },
]

export function AgentFormFields({ form, isSubmitting }: AgentFormFieldsProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const { resolvedTheme } = useTheme()

  const selectedProvider = form.watch('model_provider')
  const {
    isLoading: modelsLoading,
    availabilityLoading,
    getModelsForProvider,
    isRestricted,
    configuredOptions,
    hasConfiguredProviders,
    configureHref,
  } = useAvailableLlmProviders()
  // Restringido → solo proveedores configurados; si no, la lista completa.
  const providerItems = isRestricted ? configuredOptions : MODEL_PROVIDERS
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    if (selectedProvider) {
      const providerModels = getModelsForProvider(selectedProvider)
      setAvailableModels(providerModels)
    } else {
      setAvailableModels([])
    }
  }, [selectedProvider, getModelsForProvider])

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (!tag) return
    const currentTags = form.getValues('skill_tags') || []
    if (!currentTags.includes(tag)) {
      form.setValue('skill_tags', [...currentTags, tag])
    }
    setTagInput('')
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = form.getValues('skill_tags') || []
    form.setValue(
      'skill_tags',
      currentTags.filter((t) => t !== tagToRemove)
    )
  }

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nombre</FormLabel>
            <FormControl>
              <Input
                placeholder="Agente de cobranza"
                className="rounded-none"
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
              <Textarea
                placeholder="Agente especializado en gestión de cobranza..."
                className="min-h-[80px] resize-none rounded-none"
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {availabilityLoading ? (
        // Validando la disponibilidad de proveedores: no afirmar todavía que
        // falta configurar uno.
        <div className="flex items-center gap-3 border border-dashed border-muted-foreground/40 bg-muted/30 p-4 text-sm text-muted-foreground rounded-none">
          <Spinner className="h-4 w-4 shrink-0" />
          Validando proveedores disponibles...
        </div>
      ) : isRestricted && !hasConfiguredProviders ? (
        // Confirmado: la cuenta restringe proveedores de plataforma y no
        // tiene ninguno propio configurado.
        <NoLlmProvidersConfigured href={configureHref} />
      ) : (
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="model_provider"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proveedor</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value)
                  const providerModels = getModelsForProvider(value)
                  if (providerModels.length > 0) {
                    form.setValue('model_name', providerModels[0].id)
                  }
                }}
                defaultValue={field.value}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full rounded-none">
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-none">
                  {providerItems.map((provider) => (
                    <SelectItem key={provider.value} value={provider.value} className="rounded-none">
                      <span className="flex items-center gap-2">
                        <ProviderLogo provider={provider.value} />
                        {provider.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                value={field.value}
                disabled={!selectedProvider || modelsLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full rounded-none">
                    {modelsLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Cargando modelos...</span>
                      </div>
                    ) : (
                      <SelectValue placeholder={
                        !selectedProvider
                          ? 'Selecciona un proveedor primero'
                          : 'Selecciona un modelo'
                      } />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-none max-h-[300px]">
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="rounded-none">
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProvider && !modelsLoading && availableModels.length === 0 && (
                <FormDescription className="text-orange-600">
                  No se encontraron modelos para este proveedor.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      )}

      <FormField
        control={form.control}
        name="api_key"
        render={({ field }) => (
          <FormItem>
            <FormLabel>API Key</FormLabel>
            <FormControl>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  className="rounded-none pr-10"
                  {...field}
                  value={field.value || ''}
                />
                <div className="absolute right-0 top-0 h-full flex items-center pr-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 rounded-none"
                    onClick={() => setShowApiKey(!showApiKey)}
                    disabled={isSubmitting}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </FormControl>
            <FormDescription>Opcional. Se encriptará al guardar.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="base_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Base URL</FormLabel>
            <FormControl>
              <Input
                placeholder="https://api.example.com/v1"
                className="rounded-none"
                {...field}
                value={field.value || ''}
              />
            </FormControl>
            <FormDescription>Opcional. URL base del API del proveedor.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="system_prompt"
        render={({ field }) => (
          <FormItem>
            <FormLabel>System Prompt</FormLabel>
            <FormControl>
              <div
                data-color-mode={resolvedTheme === 'dark' ? 'dark' : 'light'}
                className="min-w-0 overflow-hidden"
              >
                <MDEditor
                  value={field.value || ''}
                  onChange={(value) => field.onChange(value ?? '')}
                  onBlur={field.onBlur}
                  height={280}
                  preview="edit"
                  className="rounded-none!"
                  textareaProps={{
                    placeholder: 'Eres un asistente especializado en...',
                    disabled: isSubmitting,
                  }}
                />
              </div>
            </FormControl>
            <FormDescription>
              Instrucciones del sistema. Se guarda con formato markdown preservando saltos de línea.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="max_loops"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Loops</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={10}
                  max={10}
                  className="rounded-none w-32"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                />
              </FormControl>
              <FormDescription>Número máximo de iteraciones del agente.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="skill_tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills Tags</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Agregar tag..."
                      className="rounded-none"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-none"
                      onClick={handleAddTag}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {field.value.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="enable_ui"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between border p-4 rounded-none border-muted">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Habilitar UI</FormLabel>
                <FormDescription>
                  Mostrar interfaz de chat para este agente.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between border p-4 rounded-none border-muted">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Activo</FormLabel>
                <FormDescription>
                  Habilitar o deshabilitar este agente.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
