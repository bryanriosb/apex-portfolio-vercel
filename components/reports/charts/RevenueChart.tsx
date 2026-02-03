'use client'

import ReactECharts from 'echarts-for-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'
import type { RevenueTrendItem } from '@/lib/actions/reports'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface RevenueChartProps {
  data: RevenueTrendItem[]
  loading?: boolean
  title?: string
}

export function RevenueChart({
  data,
  loading,
  title = 'Tendencia de Ingresos',
}: RevenueChartProps) {
  if (loading) {
    return (
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const date = params[0]?.name || ''
        let html = `<div class="font-medium">${date}</div>`
        params.forEach((param: any) => {
          const value =
            param.seriesName === 'Ingresos'
              ? formatCurrency(param.value / 100)
              : param.value
          html += `<div class="flex items-center gap-2">
            <span style="background:${param.color}" class="w-2 h-2 rounded-full inline-block"></span>
            <span>${param.seriesName}: ${value}</span>
          </div>`
        })
        return html
      },
    },
    legend: {
      data: ['Ingresos', 'Citas'],
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
      boundaryGap: false,
      data: data.map((d) => format(new Date(d.date), 'dd MMM', { locale: es })),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Ingresos',
        position: 'left',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
          formatter: (value: number) => formatCurrency(value / 100),
        },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      {
        type: 'value',
        name: 'Citas',
        position: 'right',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#6b7280', fontSize: 11 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: 'Ingresos',
        type: 'line',
        smooth: true,
        data: data.map((d) => d.revenue),
        itemStyle: { color: '#8b5cf6' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(139, 92, 246, 0.3)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.05)' },
            ],
          },
        },
      },
      {
        name: 'Citas',
        type: 'bar',
        yAxisIndex: 1,
        data: data.map((d) => d.appointments),
        itemStyle: { color: '#e5e7eb', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 20,
      },
    ],
  }

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: 300 }} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sin datos para el período seleccionado
          </div>
        )}
      </CardContent>
    </Card>
  )
}
