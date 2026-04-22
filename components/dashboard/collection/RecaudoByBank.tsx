'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Landmark, AlertCircle } from 'lucide-react'
import { RecaudoByBank as RecaudoByBankType } from '@/lib/actions/bank-transactions/transaction'

interface RecaudoByBankProps {
  data: RecaudoByBankType[]
  loading: boolean
  error?: string | null
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

const bankColors: Record<string, string> = {
  'Banco de Bogotá': 'bg-blue-600',
  'Banco de Occidente': 'bg-green-600',
  'Banco Popular': 'bg-purple-600',
  'BBVA Colombia': 'bg-sky-600',
  'Bancolombia': 'bg-yellow-500',
  'Davivienda': 'bg-red-600',
  'Scotiabank Colpatria': 'bg-orange-500',
  'Banco AV Villas': 'bg-pink-600',
  'Banco Caja Social': 'bg-teal-600',
}

export const RecaudoByBank: React.FC<RecaudoByBankProps> = ({ data, loading, error }) => {
  if (loading) {
    return (
      <Card className="rounded-none border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Recaudo por Banco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="rounded-none border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Recaudo por Banco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-destructive">
            <AlertCircle className="h-8 w-8 mb-2 opacity-70" />
            <p className="text-sm font-medium">Error al cargar datos</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="rounded-none border">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Recaudo por Banco
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay datos de recaudo por banco
          </p>
        </CardContent>
      </Card>
    )
  }

  const total = data.reduce((sum, item) => sum + item.amount, 0)

  return (
    <Card className="rounded-none border">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Landmark className="h-4 w-4" />
          Recaudo por Banco
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.slice(0, 6).map((item) => {
          const colorClass = bankColors[item.bank_name] || 'bg-gray-500'

          return (
            <div key={item.bank_name} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                  <span className="font-medium">{item.bank_name}</span>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{formatCurrency(item.amount)}</span>
                  <span className="text-muted-foreground ml-2">
                    ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Progress
                  value={item.percentage}
                  className="h-2 flex-1"
                />
                <span className="w-16 text-right">{item.count} tx</span>
              </div>
            </div>
          )
        })}

        {data.length > 6 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Y {data.length - 6} bancos más...
          </p>
        )}

        <div className="pt-2 border-t flex justify-between text-sm font-medium">
          <span>Total General</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
