'use client'

import ReactECharts from 'echarts-for-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/currency'

interface PieChartProps {
  data: { name: string; value: number }[]
  loading?: boolean
  title: string
  formatAsCurrency?: boolean
}

export function PieChart({
  data,
  loading,
  title,
  formatAsCurrency = true,
}: PieChartProps) {
  if (loading) {
    return (
      <Card className="border">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const colors = [
    '#8b5cf6',
    '#ec4899',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#6366f1',
  ]

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const value = formatAsCurrency
          ? formatCurrency(params.value / 100)
          : params.value
        return `${params.name}: ${value} (${params.percent}%)`
      },
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { fontSize: 11, color: '#6b7280' },
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
          },
        },
        labelLine: { show: false },
        data: data.map((item, index) => ({
          ...item,
          itemStyle: { color: colors[index % colors.length] },
        })),
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
