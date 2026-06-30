'use client'

import React, { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

interface CronBuilderProps {
  value: string
  onChange: (value: string) => void
}

const PREDEFINED_OPTIONS = [
  { value: '0 * * * *', label: 'Cada hora' },
  { value: '0 6 * * *', label: 'Diariamente a las 6:00 AM' },
  { value: '0 8 * * *', label: 'Diariamente a las 8:00 AM' },
  { value: '0 12 * * *', label: 'Diariamente a las 12:00 PM (Mediodía)' },
  { value: '0 18 * * *', label: 'Diariamente a las 6:00 PM' },
  { value: '0 8 * * 1', label: 'Semanalmente (Lunes a las 8:00 AM)' },
  { value: '0 8 1 * *', label: 'Mensualmente (Día 1 a las 8:00 AM)' },
]

const DAYS_OF_WEEK = [
  { value: '1', label: 'Lun' },
  { value: '2', label: 'Mar' },
  { value: '3', label: 'Mié' },
  { value: '4', label: 'Jue' },
  { value: '5', label: 'Vie' },
  { value: '6', label: 'Sáb' },
  { value: '0', label: 'Dom' },
]

export function CronBuilder({ value, onChange }: CronBuilderProps) {
  const [mode, setMode] = useState<'predefined' | 'custom'>('predefined')

  // Custom configuration state
  const [customType, setCustomType] = useState<'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly'>('daily')
  const [minute, setMinute] = useState('0')
  const [hour, setHour] = useState('8')
  const [dayOfWeek, setDayOfWeek] = useState<string[]>(['1'])
  const [dayOfMonth, setDayOfMonth] = useState('1')
  const [everyXMinutes, setEveryXMinutes] = useState('15')
  const [everyXHours, setEveryXHours] = useState('1')
  const [isInitializing, setIsInitializing] = useState(true)

  // Initialize from value
  useEffect(() => {
    if (isInitializing) {
      if (!value) {
        // If no value is provided, initialize with the first predefined option
        onChange(PREDEFINED_OPTIONS[0].value)
        setMode('predefined')
      } else {
        const isPredefined = PREDEFINED_OPTIONS.some(opt => opt.value === value)
        if (isPredefined) {
          setMode('predefined')
        } else {
          setMode('custom')
          // Try to parse basic custom cron formats
          const parts = value.split(' ')
          if (parts.length === 5) {
            const [m, h, dom, mon, dow] = parts
            if (m.startsWith('*/') && h === '*' && dom === '*' && mon === '*' && dow === '*') {
              setCustomType('minutes')
              setEveryXMinutes(m.replace('*/', ''))
            } else if (h.startsWith('*/') && dom === '*' && mon === '*' && dow === '*') {
              setCustomType('hourly')
              setEveryXHours(h.replace('*/', ''))
              setMinute(m !== '*' ? m : '0')
            } else if (h === '*' && dom === '*' && mon === '*' && dow === '*') {
              setCustomType('hourly')
              setEveryXHours('1')
              setMinute(m)
            } else if (dom === '*' && mon === '*' && dow === '*') {
              setCustomType('daily')
              setMinute(m)
              setHour(h)
            } else if (dom === '*' && mon === '*' && dow !== '*') {
              setCustomType('weekly')
              setMinute(m)
              setHour(h)
              setDayOfWeek(dow.split(','))
            } else if (dom !== '*' && mon === '*' && dow === '*') {
              setCustomType('monthly')
              setMinute(m)
              setHour(h)
              setDayOfMonth(dom)
            }
          }
        }
      }
      setIsInitializing(false)
    }
  }, [value, isInitializing, onChange])

  useEffect(() => {
    if (!isInitializing && mode === 'custom') {
      let newCron = ''
      switch (customType) {
        case 'minutes':
          newCron = `*/${everyXMinutes || '15'} * * * *`
          break
        case 'hourly':
          newCron = `${minute || '0'} ${everyXHours === '1' || !everyXHours ? '*' : `*/${everyXHours}`} * * *`
          break
        case 'daily':
          newCron = `${minute || '0'} ${hour || '0'} * * *`
          break
        case 'weekly':
          newCron = `${minute || '0'} ${hour || '0'} * * ${dayOfWeek.length > 0 ? dayOfWeek.join(',') : '*'}`
          break
        case 'monthly':
          newCron = `${minute || '0'} ${hour || '0'} ${dayOfMonth || '1'} * *`
          break
      }
      if (newCron !== value) {
        onChange(newCron)
      }
    }
  }, [customType, minute, hour, dayOfWeek, dayOfMonth, everyXMinutes, mode, isInitializing, onChange, value])

  const handlePredefinedChange = (val: string) => {
    if (val === 'custom') {
      setMode('custom')
      // Let the useEffect handle updating the cron based on current customType values
      let newCron = ''
      switch (customType) {
        case 'minutes':
          newCron = `*/${everyXMinutes || '15'} * * * *`
          break
        case 'hourly':
          newCron = `${minute || '0'} ${everyXHours === '1' || !everyXHours ? '*' : `*/${everyXHours}`} * * *`
          break
        case 'daily':
          newCron = `${minute || '0'} ${hour || '0'} * * *`
          break
        case 'weekly':
          newCron = `${minute || '0'} ${hour || '0'} * * ${dayOfWeek.length > 0 ? dayOfWeek.join(',') : '*'}`
          break
        case 'monthly':
          newCron = `${minute || '0'} ${hour || '0'} ${dayOfMonth || '1'} * *`
          break
      }
      onChange(newCron)
    } else {
      setMode('predefined')
      onChange(val)
    }
  }

  const toggleDayOfWeek = (day: string) => {
    setDayOfWeek(prev => {
      const next = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
      // If none selected, default to '*' for dow which is handled in generate, but we need at least one day or it breaks logical meaning for 'weekly'.
      return next
    })
  }

  return (
    <div className="space-y-4 border p-2 bg-muted/20 rounded-none w-full">
      <div className="space-y-2">
        <Select
          value={mode === 'predefined' ? value : 'custom'}
          onValueChange={handlePredefinedChange}
        >
          <SelectTrigger className="w-full rounded-none">
            <SelectValue placeholder="Selecciona la frecuencia" />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            {PREDEFINED_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="rounded-none">
                {opt.label}
              </SelectItem>
            ))}
            <SelectItem value="custom" className="rounded-none font-medium text-foreground">
              Personalizado...
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === 'custom' && (
        <div className="pt-4 border-t space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <Tabs value={customType} onValueChange={(v: any) => setCustomType(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="minutes">Minutos</TabsTrigger>
              <TabsTrigger value="hourly">Horas</TabsTrigger>
              <TabsTrigger value="daily">Diario</TabsTrigger>
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="monthly">Mensual</TabsTrigger>
            </TabsList>

            <div className="pt-6 pb-2 px-2 min-h-[100px] flex flex-col justify-center">
              <TabsContent value="minutes" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm">Ejecutar cada</span>
                  <Input
                    type="number"
                    min="1"
                    max="59"
                    value={everyXMinutes}
                    onChange={e => setEveryXMinutes(e.target.value)}
                    className="w-20 rounded-none text-center"
                  />
                  <span className="text-sm">minutos</span>
                </div>
              </TabsContent>

              <TabsContent value="hourly" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm">Ejecutar cada</span>
                  <Input
                    type="number"
                    min="1"
                    max="23"
                    value={everyXHours}
                    onChange={e => setEveryXHours(e.target.value)}
                    className="w-20 rounded-none text-center"
                  />
                  <span className="text-sm">horas</span>
                </div>
              </TabsContent>

              <TabsContent value="daily" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm">Ejecutar todos los días a las</span>
                  <Input
                    type="time"
                    step="60"
                    value={`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':')
                      if (h !== undefined && !isNaN(parseInt(h))) setHour(parseInt(h).toString())
                      if (m !== undefined && !isNaN(parseInt(m))) setMinute(parseInt(m).toString())
                    }}
                    className="w-24 rounded-none appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none text-center"
                  />
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="mt-0 space-y-4">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className={cn(
                          "px-3 py-1.5 text-sm border transition-colors rounded-none outline-none",
                          dayOfWeek.includes(day.value)
                            ? "bg-foreground text-background border-foreground font-medium"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <span className="text-sm">a las</span>
                    <Input
                      type="time"
                      step="60"
                      value={`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`}
                      onChange={e => {
                        const [h, m] = e.target.value.split(':')
                        if (h !== undefined && !isNaN(parseInt(h))) setHour(parseInt(h).toString())
                        if (m !== undefined && !isNaN(parseInt(m))) setMinute(parseInt(m).toString())
                      }}
                      className="w-24 rounded-none appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none text-center"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="monthly" className="mt-0 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm">Ejecutar el día</span>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={e => setDayOfMonth(e.target.value)}
                    className="w-16 rounded-none text-center"
                  />
                  <span className="text-sm">de cada mes a las</span>
                  <Input
                    type="time"
                    step="60"
                    value={`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`}
                    onChange={e => {
                      const [h, m] = e.target.value.split(':')
                      if (h !== undefined && !isNaN(parseInt(h))) setHour(parseInt(h).toString())
                      if (m !== undefined && !isNaN(parseInt(m))) setMinute(parseInt(m).toString())
                    }}
                    className="w-24 rounded-none appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none text-center"
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="bg-muted/30 p-3 flex items-center border rounded-none">
            <span className="text-sm text-foreground font-medium">
              {(() => {
                const h = hour.padStart(2, '0')
                const m = minute.padStart(2, '0')
                switch (customType) {
                  case 'minutes': return `Se ejecutará cada ${everyXMinutes || '15'} minutos.`
                  case 'hourly': {
                    const hrs = everyXHours || '1'
                    return hrs === '1' ? `Se ejecutará cada hora.` : `Se ejecutará cada ${hrs} horas.`
                  }
                  case 'daily': return `Se ejecutará todos los días a las ${h}:${m}.`
                  case 'weekly': {
                    const selectedDays = dayOfWeek.map(d => DAYS_OF_WEEK.find(dw => dw.value === d)?.label).filter(Boolean).join(', ')
                    return `Se ejecutará los días ${selectedDays || 'ninguno'} a las ${h}:${m}.`
                  }
                  case 'monthly': return `Se ejecutará el día ${dayOfMonth || '1'} de cada mes a las ${h}:${m}.`
                  default: return ''
                }
              })()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
