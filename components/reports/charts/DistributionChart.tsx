'use client'

import ReactECharts from 'echarts-for-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { HourlyDistribution, DailyDistribution } from '@/lib/actions/reports'

interface HourlyChartProps {
  data: HourlyDistribution[]
  loading?: boolean
}

export function HourlyDistributionChart({ data, loading }: HourlyChartProps) {
  if (loading) {
    return (
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">Horarios Más Populares</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => `${params[0].name}:00 - ${params[0].value} citas`,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => `${d.hour}:00`),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280', fontSize: 11, rotate: 45 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => d.count),
        itemStyle: {
          color: '#8b5cf6',
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 30,
      },
    ],
  }

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Horarios Más Populares</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: 250 }} />
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Sin datos
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface DailyChartProps {
  data: DailyDistribution[]
  loading?: boolean
}

export function DailyDistributionChart({ data, loading }: DailyChartProps) {
  if (loading) {
    return (
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">Días Más Activos</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => `${params[0].name}: ${params[0].value} citas`,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.day_name.substring(0, 3)),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      axisLabel: { color: '#6b7280', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#6b7280', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f3f4f6' } },
    },
    series: [
      {
        type: 'bar',
        data: data.map((d) => d.count),
        itemStyle: {
          color: '#ec4899',
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 40,
      },
    ],
  }

  return (
    <Card className="border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Días Más Activos</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ReactECharts option={option} style={{ height: 250 }} />
        ) : (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Sin datos
          </div>
        )}
      </CardContent>
    </Card>
  )
}
