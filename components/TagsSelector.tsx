import * as React from 'react'
import { Check, Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover'
import { Button } from './ui/button'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './ui/command'
import { Input } from './ui/input'

interface TagsSelectorProps {
  value?: string[]
  onChange?: (tags: string[]) => void
  placeholder?: string
  className?: string
  createNew?: boolean
  onNewTag?: (tag: string) => void
  existingTags?: string[]
}

export function TagsSelector({
  value = [],
  onChange,
  placeholder = 'Seleccionar etiquetas...',
  className,
  createNew = true,
  onNewTag,
  existingTags = [],
}: TagsSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')

  const selectedValues = new Set(value)

  const handleSelect = (tag: string) => {
    const newValues = selectedValues.has(tag)
      ? value.filter((t) => t !== tag)
      : [...value, tag]

    onChange?.(newValues)
  }

  const handleAddNew = () => {
    if (inputValue.trim() && !selectedValues.has(inputValue.trim())) {
      const newTag = inputValue.trim()
      const newValues = [...value, newTag]
      onChange?.(newValues)
      onNewTag?.(newTag)
      setInputValue('')
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleAddNew()
    }
  }

  const removeTag = (tagToRemove: string) => {
    const newValues = value.filter((tag) => tag !== tagToRemove)
    onChange?.(newValues)
  }

  const clearAll = () => {
    onChange?.([])
  }

  const allOptions = [
    ...existingTags,
    ...value.filter((tag) => !existingTags.includes(tag)),
  ].filter((tag, index, arr) => arr.indexOf(tag) === index)

  return (
    <div className={cn('w-full space-y-2', className)}>
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-1">
        {value.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                removeTag(tag)
              }}
              className="h-3 w-3 cursor-pointer hover:bg-destructive/20 hover:text-destructive rounded-sm transition-colors flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length === 0 && (
          <span className="text-sm text-muted-foreground italic">
            No hay etiquetas seleccionadas
          </span>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{placeholder}</span>
            </div>
            {selectedValues.size > 0 && (
              <Badge
                variant="secondary"
                className="rounded-sm px-2 py-0.5 text-xs font-normal"
              >
                {selectedValues.size} seleccionado
                {selectedValues.size > 1 ? 's' : ''}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar o crear etiqueta..."
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              <CommandEmpty>
                {createNew && inputValue.trim() ? (
                  <div className="py-3 px-2">
                    <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Plus className="h-6! w-6! text-primary" />
                        <span className="text-sm font-medium">
                          {inputValue.trim()}
                        </span>
                      </div>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleAddNew}
                        className="h-7 px-3 text-xs"
                        disabled={!inputValue.trim()}
                      >
                        Crear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {!inputValue.trim() &&
                      'No se encontraron etiquetas. Escribe y presiona Enter para crear una nueva.'}
                  </div>
                )}
              </CommandEmpty>
              <CommandGroup>
                {allOptions.map((tag) => {
                  const isSelected = selectedValues.has(tag)
                  return (
                    <CommandItem
                      key={tag}
                      className={cn(
                        'command-item-hover',
                        isSelected && 'command-item-selected'
                      )}
                      onSelect={() => handleSelect(tag)}
                    >
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                          isSelected
                            ? 'checkbox-selected'
                            : 'checkbox-unselected [&_svg]:invisible'
                        )}
                      >
                        <Check />
                      </div>
                      <span>{tag}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {selectedValues.size > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={clearAll}
                      className="justify-center text-center command-item-hover"
                    >
                      Limpiar selección
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
