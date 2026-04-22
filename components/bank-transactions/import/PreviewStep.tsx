'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, AlertCircle, CheckCircle, Hash } from 'lucide-react'
import type { ImportFileData } from './types'

interface PreviewStepProps {
  fileData: ImportFileData | null
}

export function PreviewStep({ fileData }: PreviewStepProps) {
  if (!fileData) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No hay datos para previsualizar
      </div>
    )
  }

  const totalAmount = fileData.sheets.reduce(
    (sum, s) => sum + s.transactions.reduce((s2, t) => s2 + t.amount, 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Total Transacciones
          </p>
          <p className="text-2xl font-bold">{fileData.totalTransactions}</p>
        </div>
        <div className="border p-4">
          <p className="text-xs text-muted-foreground mb-1">Bancos</p>
          <p className="text-2xl font-bold">{fileData.sheets.length}</p>
        </div>
        <div className="border p-4">
          <p className="text-xs text-muted-foreground mb-1">Errores</p>
          <p className="text-2xl font-bold text-amber-600">
            {fileData.errors.length}
          </p>
        </div>
        <div className="border p-4">
          <p className="text-xs text-muted-foreground mb-1">Monto Total</p>
          <p className="text-xl font-bold font-mono">
            ${totalAmount.toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {fileData.sheets.map((sheet, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{sheet.bankName}</CardTitle>
                </div>
                <Badge variant="outline">
                  {sheet.transactions.length} registros
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Hoja: {sheet.sheetName}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>
                    Con NIT:{' '}
                    {sheet.transactions.filter((t) => t.customer_nit).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span>
                    Sin NIT:{' '}
                    {sheet.transactions.filter((t) => !t.customer_nit).length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">
                    Monto: $
                    {sheet.transactions
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
              {sheet.errors.length > 0 && (
                <div className="mt-3 p-2 bg-amber-50 border border-amber-200 text-xs">
                  <p className="font-medium text-amber-900">
                    {sheet.errors.length} errores
                  </p>
                  <ul className="text-amber-700 mt-1 space-y-0.5">
                    {sheet.errors.slice(0, 3).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {sheet.errors.length > 3 && (
                      <li>...y {sheet.errors.length - 3} más</li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {fileData.errors.length > 0 && (
        <div className="border p-4 bg-amber-50">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-900">
                Se encontraron {fileData.errors.length} advertencias
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Las transacciones con errores no serán importadas. Puede
                proceder con la importación de los registros válidos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
