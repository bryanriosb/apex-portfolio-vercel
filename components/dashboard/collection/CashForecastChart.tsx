'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatCurrency, formatCompact } from '@/lib/utils/currency'
import type {
  CashForecastItem,
  ExpectedForecastItem,
} from '@/lib/actions/collection/metrics'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

interface CashForecastChartProps {
  /** Comprometido por promesas de pago activas */
  data: CashForecastItem[]
  /** Esperado por vencimientos (due_date + política de la sucursal + comportamiento) */
  expectedData: ExpectedForecastItem[]
  loading?: boolean
}

const formatDateLabel = (isoDate: string) => {
  const parsed = new Date(`${isoDate}T00:00:00`)
  return Number.isNaN(parsed.getTime())
    ? isoDate
    : format(parsed, 'dd MMM', { locale: es })
}

export function CashForecastChart({
  data,
  expectedData,
  loading,
}: CashForecastChartProps) {
  // Consolida ambas series sobre un eje de fechas común: las promesas vienen
  // por fecha de compromiso (+ segmento, que aquí se agrega) y el esperado
  // por lunes de semana proyectada.
  const { hasData, option } = useMemo(() => {
    const byDate = new Map<
      string,
      { promised: number; promises: number; expected: number; invoices: number }
    >()
    const entry = (key: string) => {
      const existing = byDate.get(key)
      if (existing) return existing
      const fresh = { promised: 0, promises: 0, expected: 0, invoices: 0 }
      byDate.set(key, fresh)
      return fresh
    }

    for (const item of data) {
      const e = entry(item.week_start)
      e.promised += item.projected_amount
      e.promises += item.promise_count
    }
    for (const item of expectedData) {
      const e = entry(item.week_start)
      e.expected += item.expected_amount
      e.invoices += item.invoice_count
    }

    const sortedDates = Array.from(byDate.keys()).sort()
    const expected = sortedDates.map((d) => byDate.get(d)?.expected || 0)
    const promised = sortedDates.map((d) => byDate.get(d)?.promised || 0)
    const promises = sortedDates.map((d) => byDate.get(d)?.promises || 0)

    return {
      hasData: sortedDates.length > 0,
      option: {
        tooltip: {
          trigger: 'axis',
          formatter: (params: any) => {
            const date = params[0]?.name || ''
            let html = `<div class="font-medium">Semana del ${date}</div>`
            params.forEach((param: any) => {
              const value =
                param.seriesName === 'Promesas'
                  ? param.value
                  : formatCurrency(param.value)
              html += `<div class="flex items-center gap-2">
                <span style="background:${param.color}" class="w-2 h-2 rounded-full inline-block"></span>
                <span>${param.seriesName}: ${value}</span>
              </div>`
            })
            return html
          },
        },
        legend: {
          data: [
            'Esperado por vencimientos',
            'Comprometido por promesas',
            'Promesas',
          ],
          bottom: 0,
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '10%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: sortedDates.map(formatDateLabel),
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          axisLabel: { color: '#6b7280', fontSize: 11 },
        },
        yAxis: [
          {
            type: 'value',
            name: 'Monto',
            position: 'left',
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: {
              color: '#6b7280',
              fontSize: 11,
              formatter: (value: number) => formatCompact(value),
            },
            splitLine: { lineStyle: { color: '#f3f4f6' } },
          },
          {
            type: 'value',
            name: 'Promesas',
            position: 'right',
            minInterval: 1,
            axisLine: { show: false },
            axisTick: { show: false },
            axisLabel: { color: '#6b7280', fontSize: 11 },
            splitLine: { show: false },
          },
        ],
        series: [
          {
            name: 'Esperado por vencimientos',
            type: 'bar',
            data: expected,
            itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 28,
          },
          {
            name: 'Comprometido por promesas',
            type: 'bar',
            data: promised,
            itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
            barMaxWidth: 28,
          },
          {
            name: 'Promesas',
            type: 'line',
            yAxisIndex: 1,
            smooth: true,
            data: promises,
            itemStyle: { color: '#8b5cf6' },
          },
        ],
      },
    }
  }, [data, expectedData])

  return (
    <Card className="rounded-none border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Proyección de Recaudo</CardTitle>
        <p className="text-xs text-muted-foreground">
          Esperado por vencimientos de facturas (según política de la sucursal
          y comportamiento de pago) vs. comprometido por promesas de pago
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : hasData ? (
          <ReactECharts option={option} style={{ height: 300 }} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sin facturas pendientes ni promesas de pago para proyectar
          </div>
        )}
      </CardContent>
    </Card>
  )
}
