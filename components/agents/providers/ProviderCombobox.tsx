'use client'

import { useMemo } from 'react'
import { Combobox, type ComboboxOption } from '@/components/ui/combobox'
import { ProviderLogo } from '@/components/agents/ProviderLogo'

export interface ProviderComboboxItem {
  value: string
  label: string
  /** Encabezado de grupo (p. ej. "Clientes nativos" / "OpenAI compatible"). */
  group?: string
}

interface ProviderComboboxProps {
  options: ProviderComboboxItem[]
  value: string | null
  /** Campo requerido: la deselección del combobox se ignora. */
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  popoverClassName?: string
}

/**
 * Selector estándar de proveedor LLM: combobox de shadcn con búsqueda,
 * logo del proveedor y soporte de grupos. Única fuente de este patrón para
 * GlobalChat, formulario de agentes y formulario de proveedores globales.
 */
export function ProviderCombobox({
  options,
  value,
  onChange,
  placeholder = 'Selecciona un proveedor',
  disabled = false,
  className,
  popoverClassName,
}: ProviderComboboxProps) {
  const comboboxOptions = useMemo<ComboboxOption[]>(
    () =>
      options.map((option) => ({
        value: option.value,
        label: option.label,
        group: option.group,
        icon: <ProviderLogo provider={option.value} />,
      })),
    [options]
  )

  return (
    <Combobox
      options={comboboxOptions}
      value={value}
      onChange={(next) => next && onChange(next)}
      placeholder={placeholder}
      searchPlaceholder="Buscar proveedor..."
      emptyText="No se encontraron proveedores"
      disabled={disabled}
      className={className}
      popoverClassName={popoverClassName}
    />
  )
}
