import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UnidentifiedTable } from '@/components/bank-transactions/unidentified'

export default function UnidentifiedTransactionsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/collection/transactions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Transacciones Sin Identificar
        </h1>
        <p className="text-muted-foreground">
          Transacciones bancarias pendientes de asociar a clientes
        </p>
      </div>

      <UnidentifiedTable />
    </div>
  )
}
