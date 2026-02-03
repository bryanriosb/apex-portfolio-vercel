'use client'

import { useState } from 'react'
import { DatePickerWithRange } from '../ui/date-picker-range'
import { DateRange } from 'react-day-picker'
import DashboardFilterSelector from './DashboardFilterSelector'
import DashboardPeriodSelector from './DashboardSelectPeriod'

export default function DashboardFilter() {
  const [date, setDate] = useState<DateRange | undefined>()

  return (
    <div className="flex gap-2">
      <div className="flex items-center border rounded-md ">
        <DatePickerWithRange
          date={date}
          setDate={setDate}
          variant="ghost"
          className="border-r"
        />
        <DashboardPeriodSelector />
      </div>
      <DashboardFilterSelector
        filters={[
          {
            title: 'Estado',
            options: [
              { label: 'Activo', value: 'active' },
              { label: 'Inactivo', value: 'inactive' },
            ],
          },
          {
            title: 'Categoría',
            options: [
              { label: 'Categoría 1', value: 'cat1' },
              { label: 'Categoría 2', value: 'cat2' },
              { label: 'Categoría 3', value: 'cat3' },
            ],
          },
        ]}
      />
    </div>
  )
}
