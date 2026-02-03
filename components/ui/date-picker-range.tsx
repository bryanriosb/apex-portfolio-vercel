'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'
import { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function DatePickerWithRange({
  className,
  date,
  setDate,
  variant = 'outline',
}: {
  date: DateRange | undefined
  setDate: React.Dispatch<React.SetStateAction<DateRange | undefined>>
  variant?: 'ghost' | 'outline'
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex gap-2 items-center', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={variant}
            className={cn(
              'w-full flex justify-between ',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span className=" text-left font-normal text-sm">
                Seleccionar Fecha
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            disabled={{
              after: new Date(),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
