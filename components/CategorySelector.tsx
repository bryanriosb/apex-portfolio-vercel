import * as React from 'react'
import { Check, Plus, Building } from 'lucide-react'

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
import type { CustomerCategory } from '@/lib/models/customer/business-customer'

interface CategorySelectorProps {
  value?: string
  onChange?: (categoryId: string | null) => void
  placeholder?: string
  className?: string
  businessAccountId: string
  disabled?: boolean
}

export function CategorySelector({
  value,
  onChange,
  placeholder = 'Seleccionar categoría...',
  className,
  businessAccountId,
  disabled = false,
}: CategorySelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState('')
  const [categories, setCategories] = React.useState<CustomerCategory[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isCreating, setIsCreating] = React.useState(false)

  React.useEffect(() => {
    const loadCategories = async () => {
      if (!businessAccountId) return

      setIsLoading(true)
      try {
        const { fetchCustomerCategoriesAction } =
          await import('@/lib/actions/customer-category')
        const result = await fetchCustomerCategoriesAction(businessAccountId)
        if (result.success && result.data) {
          setCategories(result.data)
        }
      } catch (error) {
        console.error('Error loading categories:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCategories()
  }, [businessAccountId])

  const handleSelect = (categoryId: string) => {
    onChange?.(categoryId === 'none' ? null : categoryId)
    setOpen(false)
    setInputValue('')
  }

  const handleCreateNew = async () => {
    if (!inputValue.trim() || !businessAccountId) return

    setIsCreating(true)
    try {
      const { createCustomerCategoryAction } =
        await import('@/lib/actions/customer-category')
      const result = await createCustomerCategoryAction(businessAccountId, {
        name: inputValue.trim(),
        description: `Categoría creada desde el formulario de cliente`,
      })

      if (result.success && result.data) {
        // Add new category to the list
        setCategories((prev) => [...prev, result.data!])
        // Select the new category
        onChange?.(result.data!.id)
        setOpen(false)
        setInputValue('')
      } else {
        console.error('Error creating category:', result.error)
      }
    } catch (error) {
      console.error('Error creating category:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      handleCreateNew()
    }
  }

  const clearSelection = () => {
    onChange?.(null)
    setInputValue('')
  }

  const selectedCategory = categories.find((cat) => cat.id === value)

  const allOptions = categories

  return (
    <div className={cn('w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between"
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              {selectedCategory ? (
                <>
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedCategory.name}</span>
                </>
              ) : (
                <>
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{placeholder}</span>
                </>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar o crear categoría..."
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={handleInputKeyDown}
            />
            <CommandList>
              {isLoading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Cargando categorías...
                </div>
              ) : (
                <>
                  <CommandEmpty>
                    {inputValue.trim() ? (
                      <div className="py-3 px-2">
                        <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium">
                              {inputValue.trim()}
                            </span>
                          </div>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleCreateNew}
                            className="h-7 px-3 text-xs"
                            disabled={isCreating || !inputValue.trim()}
                          >
                            {isCreating ? (
                              <div className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />
                            ) : (
                              'Crear'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        No se encontraron categorías. Escribe para buscar o
                        crear una nueva.
                      </div>
                    )}
                  </CommandEmpty>
                  <CommandGroup heading="Categorías existentes">
                    <CommandItem
                      key="none"
                      value="none"
                      onSelect={() => handleSelect('none')}
                    >
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                          !value
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible'
                        )}
                      >
                        <Check />
                      </div>
                      <span className="italic">Sin categoría</span>
                    </CommandItem>
                    {allOptions.map((category) => {
                      const isSelected = value === category.id
                      return (
                        <CommandItem
                          key={category.id}
                          value={category.id}
                          onSelect={() => handleSelect(category.id)}
                        >
                          <div
                            className={cn(
                              'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'opacity-50 [&_svg]:invisible'
                            )}
                          >
                            <Check />
                          </div>
                          <div className="flex flex-col">
                            <span>{category.name}</span>
                            {category.description && (
                              <span className="text-xs text-muted-foreground">
                                {category.description}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                  {value && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          onSelect={clearSelection}
                          className="justify-center text-center"
                        >
                          Limpiar selección
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
