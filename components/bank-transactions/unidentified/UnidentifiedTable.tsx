'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  UserPlus,
  ArrowUpDown,
  CheckCircle2,
  CheckCircle,
  FileSearch,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type FilterConfig, type DataTableRef } from '@/components/DataTable'
import { MatchCustomerDialog } from './MatchCustomerDialog'
import {
  fetchBankTransactionsAction,
  getDistinctBanksAction,
} from '@/lib/actions/bank-transactions'
import type { BankTransaction } from '@/lib/models/bank-transactions'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { toast } from 'sonner'
import Link from 'next/link'

const statusLabels: Record<string, string> = {
  unidentified: 'Sin identificar',
  no_nit: 'Sin NIT',
  manual: 'Manual',
  identified: 'Identificado',
  duplicate: 'Duplicado',
}

const statusColors: Record<string, string> = {
  unidentified:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  no_nit:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  manual: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  identified:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  duplicate: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function UnidentifiedTable() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] =
    useState<BankTransaction | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [availableBanks, setAvailableBanks] = useState<string[]>([])
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([])
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const dataTableRef = useRef<DataTableRef>(null)
  const { activeBusiness } = useActiveBusinessStore()

  const businessId = activeBusiness?.id

  useEffect(() => {
    if (!businessId) return

    getDistinctBanksAction(businessId).then((banks) => {
      setAvailableBanks(banks)
    })
  }, [businessId])

  const handleOpenMatchDialog = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction)
    setDialogOpen(true)
  }

  const handleMatched = () => {
    setRefreshKey((prev) => prev + 1)
    toast.success('Transacción asociada correctamente', {
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    })
  }

  const handleBatchMatched = () => {
    setRefreshKey((prev) => prev + 1)
    dataTableRef.current?.clearSelection()
    setSelectedTransactionIds([])
  }

  const handleOpenBatchDialog = () => {
    const ids = dataTableRef.current?.getSelectedRowIds() || []
    if (ids.length === 0) {
      toast.warning('Selecciona al menos una transacción')
      return
    }
    setSelectedTransactionIds(ids)
    setBatchDialogOpen(true)
  }

  const columns: ColumnDef<BankTransaction>[] = useMemo(
    () => [
      {
        accessorKey: 'transaction_date',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 -ml-3"
          >
            Fecha
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = row.getValue('transaction_date') as string
          return format(new Date(date), 'dd/MM/yyyy', { locale: es })
        },
      },
      {
        accessorKey: 'amount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-8 -ml-3"
          >
            Monto
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const amount = row.getValue('amount') as number
          return (
            <span className="font-mono font-medium">
              {formatCurrency(amount)}
            </span>
          )
        },
      },
      {
        accessorKey: 'bank_name',
        header: 'Banco',
        cell: ({ row }) => row.getValue('bank_name') || '-',
      },
      {
        accessorKey: 'customer_nit',
        header: 'NIT Extracto',
        cell: ({ row }) => {
          const nit = row.getValue('customer_nit') as string | null
          return nit ? (
            <span className="font-mono">{nit}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'customer_name_extract',
        header: 'Nombre Extracto',
        cell: ({ row }) => {
          const name = row.getValue('customer_name_extract') as string | null
          return name ? (
            <span className="truncate max-w-[200px] block">{name}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'reference',
        header: 'Referencia',
        cell: ({ row }) => {
          const ref = row.getValue('reference') as string | null
          return ref ? (
            <span className="font-mono text-sm truncate max-w-[150px] block">
              {ref}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Estado',
        cell: ({ row }) => {
          const status = row.getValue('status') as string
          return (
            <Badge variant="secondary" className={statusColors[status] || ''}>
              {statusLabels[status] || status}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const transaction = row.original
          const canMatch = ['unidentified', 'no_nit'].includes(
            transaction.status
          )

          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenMatchDialog(transaction)}
              disabled={!canMatch}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              Asociar
            </Button>
          )
        },
      },
    ],
    []
  )

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        column: 'status',
        title: 'Estado',
        options: [
          { label: 'Sin identificar', value: 'unidentified' },
          { label: 'Sin NIT', value: 'no_nit' },
          { label: 'Manual', value: 'manual' },
          { label: 'Duplicado', value: 'duplicate' },
        ],
      },
      {
        column: 'bank_name',
        title: 'Banco',
        options: availableBanks.map((bank) => ({
          label: bank,
          value: bank,
        })),
      },
    ],
    [availableBanks]
  )

  const customEmptyState = (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <p className="text-sm text-center max-w-md mb-4">
        No hay transacciones pendientes por identificar.
      </p>
      <Link href="/dashboard/bank-transactions/import">
        <Button variant="outline" size="sm">
          <FileSearch className="h-4 w-4 mr-2" />
          Importar nuevas transacciones
        </Button>
      </Link>
    </div>
  )

  const service = useMemo(
    () => ({
      fetchItems: async (params: any) => {
        return fetchBankTransactionsAction({
          ...params,
          business_id: businessId,
          status: params.status || ['unidentified', 'no_nit'],
        })
      },
    }),
    [businessId]
  )

  if (!businessId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Selecciona un negocio para ver las transacciones
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={handleOpenBatchDialog}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Asociar seleccionados
        </Button>
      </div>

      <DataTable
        ref={dataTableRef}
        columns={columns}
        service={service}
        filters={filters}
        searchConfig={{
          column: 'customer_nit',
          placeholder: 'Buscar por NIT, nombre o referencia...',
        }}
        defaultQueryParams={{
          status: ['unidentified', 'no_nit'],
        }}
        refreshKey={refreshKey ? `unidentified-${refreshKey}` : undefined}
        emptyState={customEmptyState}
        enableRowSelection={true}
        getRowId={(row) => row.id}
      />

      {selectedTransaction && (
        <MatchCustomerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          transactionId={selectedTransaction.id}
          transactionNit={selectedTransaction.customer_nit}
          transactionName={selectedTransaction.customer_name_extract}
          businessId={businessId}
          onMatched={handleMatched}
        />
      )}

      {selectedTransactionIds.length > 0 && (
        <MatchCustomerDialog
          open={batchDialogOpen}
          onOpenChange={setBatchDialogOpen}
          transactionIds={selectedTransactionIds}
          businessId={businessId}
          onMatched={handleBatchMatched}
        />
      )}
    </>
  )
}
