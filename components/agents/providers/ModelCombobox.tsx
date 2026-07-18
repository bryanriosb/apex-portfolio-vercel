'use client'

import { useMemo } from 'react'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'

export interface ModelComboboxItem {
  id: string
  name: string
}

interface ModelComboboxProps {
  models: ModelComboboxItem[]
  value: string | null
  /** Campo requerido: la deselección del combobox se ignora. */
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Muestra spinner en el trigger y estado de carga en la lista. */
  isLoading?: boolean
  className?: string
  popoverClassName?: string
  /** Clase para la etiqueta del trigger (ver Combobox). */
  triggerLabelClassName?: string
}

/**
 * Selector estándar de modelo LLM: combobox de shadcn con búsqueda por
 * nombre o por slug (el id se muestra como descripción, p. ej.
 * google/gemma-4-31B-it). Única fuente de este patrón en la app.
 */
export function ModelCombobox({
  models,
  value,
  onChange,
  placeholder = 'Selecciona un modelo',
  disabled = false,
  isLoading = false,
  className,
  popoverClassName,
  triggerLabelClassName,
}: ModelComboboxProps) {
  const comboboxOptions = useMemo<ComboboxOption[]>(
    () =>
      models.map((model) => ({
        value: model.id,
        label: model.name,
        description: model.id,
      })),
    [models]
  )

  return (
    <Combobox
      options={comboboxOptions}
      value={value}
      onChange={(next) => next && onChange(next)}
      placeholder={placeholder}
      searchPlaceholder="Buscar modelo..."
      emptyText="No se encontraron modelos"
      disabled={disabled}
      isLoading={isLoading}
      className={className}
      popoverClassName={popoverClassName}
      triggerLabelClassName={triggerLabelClassName}
    />
  )
}
