'use client'

import { useMemo, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { ProviderCombobox, type ProviderComboboxItem } from './ProviderCombobox'
import {
  findLlmProviderOption,
  type LlmProviderFormValues,
  type LlmProviderOption,
} from '@/lib/models/agents/llm-provider'

interface LlmProviderFormFieldsProps {
  form: UseFormReturn<LlmProviderFormValues>
  providerOptions: { native: LlmProviderOption[]; compatible: LlmProviderOption[] }
  isEditing: boolean
  isSubmitting: boolean
}

export function LlmProviderFormFields({
  form,
  providerOptions,
  isEditing,
  isSubmitting,
}: LlmProviderFormFieldsProps) {
  const [showApiKey, setShowApiKey] = useState(false)

  const selectedProvider = form.watch('provider')
  const selectedOption = findLlmProviderOption(
    providerOptions,
    selectedProvider
  )

  const providerComboboxOptions = useMemo<ProviderComboboxItem[]>(
    () => [
      ...providerOptions.native.map((option) => ({
        value: option.value,
        label: option.label,
        group: 'Clientes nativos',
      })),
      ...providerOptions.compatible.map((option) => ({
        value: option.value,
        label: option.label,
        group: 'OpenAI compatible',
      })),
    ],
    [providerOptions]
  )

  return (
    <div className="space-y-5">
      <FormField
        control={form.control}
        name="provider"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Proveedor</FormLabel>
            <ProviderCombobox
              options={providerComboboxOptions}
              value={field.value || null}
              onChange={(value) => {
                field.onChange(value)
                const option = findLlmProviderOption(providerOptions, value)
                form.setValue('base_url', option?.baseUrl || '', {
                  shouldValidate: form.formState.isSubmitted,
                })
              }}
              disabled={isSubmitting || isEditing}
              className="w-full rounded-none"
            />
            {isEditing ? (
              <FormDescription>
                El proveedor no se puede cambiar; elimina y crea uno nuevo.
              </FormDescription>
            ) : null}
            <FormMessage />
          </FormItem>
        )}
      />

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
                  placeholder={
                    isEditing ? 'Deja vacío para conservar la actual' : 'sk-...'
                  }
                  className="rounded-none pr-10"
                  disabled={isSubmitting}
                  {...field}
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
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </FormControl>
            <FormDescription>Se encriptará al guardar.</FormDescription>
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
                placeholder="https://api.proveedor.com/v1"
                className="rounded-none"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormDescription>
              {selectedOption?.requiresBaseUrl
                ? 'Endpoint OpenAI-compatible del proveedor.'
                : 'Opcional. El cliente nativo usa su URL por defecto.'}
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {isEditing && (
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between px-3 py-2">
              <div className="space-y-0.5">
                <FormDescription className="text-xs">
                  Disponible como proveedor global para los agentes
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  )
}
