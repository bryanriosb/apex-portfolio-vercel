'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'

interface RecaudoAlertsProps {
  unidentifiedCount: number
  loading: boolean
}

export const RecaudoAlerts: React.FC<RecaudoAlertsProps> = ({
  unidentifiedCount,
  loading,
}) => {
  if (loading) {
    return null
  }

  if (unidentifiedCount === 0) {
    return (
      <Card className="rounded-none border border-muted-foreground-200">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle className="h-5 w-5 text-muted-foreground" />
          <div>
            <p className="font-medium text-muted-800">Todo al día</p>
            <p className="text-sm text-muted-foreground">
              No hay transacciones pendientes de identificar
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-none border border-amber-200 bg-amber-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4" />
          Transacciones Sin Identificar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-amber-700">
              {unidentifiedCount}
            </p>
            <p className="text-sm text-amber-600">
              transacciones pendientes de asociar a clientes
            </p>
          </div>
          <Link href="/admin/collection/transactions/unidentified">
            <Button
              variant="outline"
              className="gap-2 border-amber-300 hover:bg-amber-100"
            >
              Revisar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
