'use client'

import * as React from 'react'
import { useState } from 'react'
import { Check, ListFilter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { Button } from '../ui/button'
import { Separator } from '../ui/separator'
import { Badge } from '../ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command'

interface FilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

interface FilterGroup {
  title: string
  options: FilterOption[]
}

interface DashboardFilterSelectorProps {
  filters: FilterGroup[]
}

export default function DashboardFilterSelector({
  filters,
}: DashboardFilterSelectorProps) {
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, Set<string>>
  >({})

  const handleSelect = (filterTitle: string, optionValue: string) => {
    setSelectedFilters((prev) => {
      const currentSet = prev[filterTitle] || new Set<string>()
      const newSet = new Set(currentSet)

      if (newSet.has(optionValue)) {
        newSet.delete(optionValue)
      } else {
        newSet.add(optionValue)
      }

      return {
        ...prev,
        [filterTitle]: newSet,
      }
    })
  }

  const handleClearFilter = (filterTitle: string) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [filterTitle]: new Set(),
    }))
  }

  const getTotalSelectedCount = () => {
    return Object.values(selectedFilters).reduce(
      (sum, set) => sum + set.size,
      0
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="flex gap-2 text-muted-foreground" variant="outline">
          <ListFilter />
          <span className="hidden lg:block">Filtro</span>
          {getTotalSelectedCount() > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {getTotalSelectedCount()}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="end">
        <Command>
          <CommandInput placeholder="Buscar filtros..." />
          <CommandList>
            <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            {filters.map((filter, filterIndex) => {
              const selectedSet = selectedFilters[filter.title] || new Set()

              return (
                <React.Fragment key={filter.title}>
                  {filterIndex > 0 && <CommandSeparator />}
                  <CommandGroup heading={filter.title}>
                    {filter.options.map((option) => {
                      const isSelected = selectedSet.has(option.value)
                      return (
                        <CommandItem
                          key={option.value}
                          className={cn(
                            'command-item-hover',
                            isSelected && 'command-item-selected'
                          )}
                          onSelect={() =>
                            handleSelect(filter.title, option.value)
                          }
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
                          {option.icon && (
                            <option.icon className="mr-2 h-4 w-4 text-primary hover:text-primary" />
                          )}
                          <span>{option.label}</span>
                        </CommandItem>
                      )
                    })}
                    {selectedSet.size > 0 && (
                      <CommandItem
                        onSelect={() => handleClearFilter(filter.title)}
                        className="justify-center text-center command-item-hover text-xs text-muted-foreground"
                      >
                        Limpiar {filter.title}
                      </CommandItem>
                    )}
                  </CommandGroup>
                </React.Fragment>
              )
            })}
            {getTotalSelectedCount() > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setSelectedFilters({})}
                    className="justify-center text-center command-item-hover"
                  >
                    Limpiar todos los filtros
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
