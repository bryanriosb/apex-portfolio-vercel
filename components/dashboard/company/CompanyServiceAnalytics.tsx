'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, SearchConfig } from '@/components/DataTable'
import { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import {
  fetchCompanyServiceAnalyticsAction,
  type CompanyServiceAnalytics,
} from '@/lib/actions/company-reports'
import { BarChart3 } from 'lucide-react'

interface CompanyServiceAnalyticsProps {
  dateRange: {
    startDate: Date
    endDate: Date
  }
}

const SERVICE_ANALYTICS_COLUMNS: ColumnDef<CompanyServiceAnalytics>[] = [
  {
    accessorKey: 'service_name',
    header: 'Servicio',
    cell: ({ row }) => {
      const serviceName = row.getValue('service_name') as string
      return <div className="font-medium">{serviceName}</div>
    },
  },
  {
    accessorKey: 'total_appointments',
    header: 'Citas',
    cell: ({ row }) => {
      const appointments = row.getValue('total_appointments') as number
      return (
        <div className="text-center">
          <Badge variant="secondary" className="font-mono">
            {appointments}
          </Badge>
        </div>
      )
    },
  },
  {
    accessorKey: 'total_revenue',
    header: 'Ingresos Totales',
    cell: ({ row }) => {
      const revenue = row.getValue('total_revenue') as number
      return (
        <div className="text-right font-mono">
          {formatCurrency(revenue / 100)}
        </div>
      )
    },
  },
  {
    accessorKey: 'avg_price',
    header: 'Precio Promedio',
    cell: ({ row }) => {
      const avgPrice = row.getValue('avg_price') as number
      return (
        <div className="text-right font-mono text-muted-foreground">
          {formatCurrency(avgPrice / 100)}
        </div>
      )
    },
  },
  {
    accessorKey: 'popularity_percentage',
    header: 'Popularidad',
    cell: ({ row }) => {
      const percentage = row.getValue('popularity_percentage') as number
      return (
        <div className="flex items-center justify-end gap-2">
          <div className="w-16 bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className="text-sm font-medium min-w-[3rem]">
            {percentage.toFixed(1)}%
          </span>
        </div>
      )
    },
  },
]

const SEARCH_CONFIG: SearchConfig = {
  placeholder: 'Buscar servicios...',
  column: 'service_name',
}

export function CompanyServiceAnalytics({
  dateRange,
}: CompanyServiceAnalyticsProps) {
  const [data, setData] = useState<CompanyServiceAnalytics[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // For company dashboard, show global analytics across all businesses
        const result = await fetchCompanyServiceAnalyticsAction(
          dateRange.startDate.toISOString(),
          dateRange.endDate.toISOString(),
          undefined, // No business filter for company admin
          50 // Mostrar más servicios en analytics
        )
        setData(result)
      } catch (error) {
        console.error('Error fetching company service analytics:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dateRange.startDate, dateRange.endDate])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Análisis de Servicios
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Servicios más populares por cantidad de citas e ingresos generados
        </p>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={SERVICE_ANALYTICS_COLUMNS}
          data={data}
          searchConfig={SEARCH_CONFIG}
        />
      </CardContent>
    </Card>
  )
}
