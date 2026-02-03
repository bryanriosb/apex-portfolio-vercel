'use client'

import { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

export interface ComboboxOption {
  value: string
  label: string
  description?: string
}

interface CreatableComboboxProps {
  options: ComboboxOption[]
  value: string | null
  onChange: (value: string | null) => void
  onCreateNew?: (
    name: string
  ) => Promise<{ value: string; label: string } | null>
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  createText?: string
  disabled?: boolean
  allowClear?: boolean
  className?: string
}

/**
 * Converts a string to CamelCase
 * Example: "botox viales" -> "BotoxViales"
 */
function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

export function CreatableCombobox({
  options,
  value,
  onChange,
  onCreateNew,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyText = 'No se encontraron resultados',
  createText = 'Crear',
  disabled = false,
  allowClear = true,
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  )

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const searchLower = search.toLowerCase()
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchLower) ||
        opt.description?.toLowerCase().includes(searchLower)
    )
  }, [options, search])

  const showCreateOption = useMemo(() => {
    if (!search.trim() || !onCreateNew) return false
    const searchLower = search.toLowerCase().trim()
    return !options.some((opt) => opt.label.toLowerCase() === searchLower)
  }, [search, options, onCreateNew])

  const handleSelect = (optionValue: string) => {
    if (optionValue === value) {
      if (allowClear) {
        onChange(null)
      }
    } else {
      onChange(optionValue)
    }
    setOpen(false)
    setSearch('')
  }

  const handleCreate = async () => {
    if (!onCreateNew || !search.trim()) return

    setIsCreating(true)
    try {
      const camelCaseName = toCamelCase(search.trim())
      const result = await onCreateNew(camelCaseName)
      if (result) {
        onChange(result.value)
        setOpen(false)
        setSearch('')
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          data-tutorial="service-category-select"
          disabled={disabled}
        >
          {selectedOption ? selectedOption.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{showCreateOption ? null : emptyText}</CommandEmpty>
            {allowClear && value && (
              <>
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => handleSelect('')}
                    className="text-muted-foreground"
                  >
                    Sin selección
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {showCreateOption && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__create__"
                    onSelect={handleCreate}
                    disabled={isCreating}
                    className="text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating ? (
                      'Creando...'
                    ) : (
                      <>
                        {createText} &quot;{toCamelCase(search.trim())}&quot;
                      </>
                    )}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
