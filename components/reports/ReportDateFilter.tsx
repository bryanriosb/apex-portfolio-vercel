'use client'

import { Button } from '@/components/ui/button'
import { DatePickerWithRange } from '@/components/ui/date-picker-range'
import { DateRange } from 'react-day-picker'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { Settings2 } from 'lucide-react'
import Link from 'next/link'

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'week'
  | 'month'
  | 'last_month'
  | 'custom'

interface ReportDateFilterProps {
  dateRange: DateRange | undefined
  onDateRangeChange: (range: DateRange | undefined) => void
  activePreset: DatePreset
  onPresetChange: (preset: DatePreset) => void
}

const presets: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: 'yesterday', label: 'Ayer' },
  { key: 'week', label: 'Esta semana' },
  { key: 'month', label: 'Este mes' },
  { key: 'last_month', label: 'Mes anterior' },
]

export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date()

  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'yesterday':
      const yesterday = subDays(now, 1)
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) }
    case 'week':
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }),
        to: endOfWeek(now, { weekStartsOn: 1 }),
      }
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'last_month':
      const lastMonth = subMonths(now, 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    default:
      return { from: startOfMonth(now), to: endOfDay(now) }
  }
}

export function ReportDateFilter({
  dateRange,
  onDateRangeChange,
  activePreset,
  onPresetChange,
}: ReportDateFilterProps) {
  const handlePresetClick = (preset: DatePreset) => {
    onPresetChange(preset)
    onDateRangeChange(getDateRangeFromPreset(preset))
  }

  const handleCustomDateChange = (range: DateRange | undefined) => {
    onPresetChange('custom')
    onDateRangeChange(range)
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset) => (
          <Button
            key={preset.key}
            variant={activePreset === preset.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetClick(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      <DatePickerWithRange
        date={dateRange}
        setDate={handleCustomDateChange as any}
        variant={activePreset === 'custom' ? 'outline' : 'ghost'}
      />
    </div>
  )
}
