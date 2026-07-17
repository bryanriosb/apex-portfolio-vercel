'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatCompact } from '@/lib/utils/currency'
import type { AgingKpis } from '@/lib/actions/collection/metrics'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

interface AgingBucketsChartProps {
  data: AgingKpis | null
  loading?: boolean
}

const BUCKET_ORDER = ['0-30', '31-60', '61-90', '90+']

// Severidad de la mora: verde (reciente) → rojo (crítica)
const BUCKET_COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444']

export function AgingBucketsChart({ data, loading }: AgingBucketsChartProps) {
  // Normaliza a los 4 buckets estándar aunque el backend omita los vacíos
  const buckets = useMemo(
    () =>
      BUCKET_ORDER.map((name) => {
        const found = data?.buckets.find((b) => b.bucket === name)
        return {
          bucket: name,
          amount: found?.amount || 0,
          amount_with_promise: found?.amount_with_promise || 0,
        }
      }),
    [data]
  )

  const hasData = buckets.some((b) => b.amount > 0)

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const bucket = params[0]?.name || ''
          let html = `<div class="font-medium">Mora ${bucket}</div>`
          params.forEach((param: any) => {
            html += `<div class="flex items-center gap-2">
              <span style="background:${param.color}" class="w-2 h-2 rounded-full inline-block"></span>
              <span>${param.seriesName}: ${formatCurrency(param.value)}</span>
            </div>`
          })
          return html
        },
      },
      legend: {
        data: [
          {
            name: 'Monto vencido',
            // Las barras se colorean por severidad; el swatch refleja esa escala
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops: BUCKET_COLORS.map((color, i) => ({
                  offset: i / (BUCKET_COLORS.length - 1),
                  color,
                })),
              },
            },
          },
          { name: 'Con promesa de pago' },
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
        data: buckets.map((b) => `${b.bucket} días`),
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#6b7280', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
          formatter: (value: number) => formatCompact(value),
        },
        splitLine: { lineStyle: { color: '#f3f4f6' } },
      },
      series: [
        {
          name: 'Monto vencido',
          type: 'bar',
          data: buckets.map((b, i) => ({
            value: b.amount,
            itemStyle: {
              color: BUCKET_COLORS[i],
              borderRadius: [4, 4, 0, 0],
            },
          })),
          barMaxWidth: 48,
        },
        {
          name: 'Con promesa de pago',
          type: 'bar',
          data: buckets.map((b) => b.amount_with_promise),
          itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] },
          barMaxWidth: 48,
        },
      ],
    }),
    [buckets]
  )

  return (
    <Card className="rounded-none border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Antigüedad de Cartera</CardTitle>
        <p className="text-xs text-muted-foreground">
          Monto vencido por días de mora y cobertura con promesas de pago
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : hasData ? (
          <ReactECharts option={option} style={{ height: 300 }} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sin cartera vencida registrada
          </div>
        )}
      </CardContent>
    </Card>
  )
}
