'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { EffectivenessKpis } from '@/lib/actions/collection/metrics'

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

interface IntentsDistributionChartProps {
  data: EffectivenessKpis | null
  loading?: boolean
}

/** Etiquetas legibles para las intenciones que emite el clasificador */
const INTENT_LABELS: Record<string, string> = {
  payment_proof: 'Comprobante de pago',
  promise_to_pay: 'Promesa de pago',
  billing_claim: 'Reclamo de facturación',
  withholding: 'Retenciones',
  account_status: 'Estado de cuenta',
  unclear: 'No clasificada',
}

const COLORS = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#6b7280']

export function IntentsDistributionChart({
  data,
  loading,
}: IntentsDistributionChartProps) {
  const { hasData, option } = useMemo(() => {
    const entries = Object.entries(data?.intents_distribution || {}).sort(
      (a, b) => b[1] - a[1]
    )
    const chartData = entries.map(([intent, count], index) => ({
      name: INTENT_LABELS[intent] || intent,
      value: count,
      itemStyle: { color: COLORS[index % COLORS.length] },
    }))

    return {
      hasData: chartData.length > 0,
      option: {
        tooltip: {
          trigger: 'item',
          formatter: (params: any) =>
            `${params.name}: ${params.value} interacciones (${params.percent}%)`,
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
            radius: ['45%', '70%'],
            center: ['32%', '50%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 6,
              borderColor: '#fff',
              borderWidth: 2,
            },
            label: { show: false },
            emphasis: {
              label: { show: true, fontSize: 12, fontWeight: 'bold' },
            },
            labelLine: { show: false },
            data: chartData,
          },
        ],
      },
    }
  }, [data])

  const averageConfidence = (data?.average_confidence || 0) * 100

  return (
    <Card className="rounded-none border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Intenciones de los Clientes</CardTitle>
        <p className="text-xs text-muted-foreground">
          {averageConfidence > 0
            ? `Confianza promedio del clasificador: ${averageConfidence.toFixed(1)}%`
            : 'Distribución de solicitudes gestionadas por el agente'}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : hasData ? (
          <ReactECharts option={option} style={{ height: 300 }} />
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Sin interacciones registradas
          </div>
        )}
      </CardContent>
    </Card>
  )
}
