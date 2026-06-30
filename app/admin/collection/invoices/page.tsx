'use client'

import {
  DataTable,
  DataTableRef,
  SearchConfig,
  FilterConfig,
} from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
} from 'lucide-react'
import InvoiceService from '@/lib/services/invoice/invoice-service'
import { getInvoicesColumns } from '@/lib/models/invoice/const/data-table/invoices-columns'
import { InvoiceFormModal } from '@/components/invoices/InvoiceFormModal'
import { useRef, useMemo, useState } from 'react'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { toast } from 'sonner'
import type { Invoice, InvoiceCreatePayload, InvoiceUpdatePayload } from '@/lib/models/invoice/types'

export default function InvoicesPage() {
  const { activeBusiness } = useActiveBusinessStore()
  const invoiceService = useMemo(() => new InvoiceService(), [])
  const dataTableRef = useRef<DataTableRef>(null)
  const timezone = activeBusiness?.timezone || 'America/Bogota'

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [invoicesToDelete, setInvoicesToDelete] = useState<string[]>([])

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'invoice_number',
      placeholder: 'Buscar factura...',
      serverField: 'search',
    }),
    []
  )

  const filterConfigs: FilterConfig[] = useMemo(
    () => [
      {
        column: 'status',
        title: 'Estado',
        options: [
          { label: 'Borrador', value: 'draft', icon: FileText },
          { label: 'Pendiente', value: 'pending', icon: Clock },
          { label: 'Pagada', value: 'paid', icon: CheckCircle2 },
          { label: 'Parcial', value: 'partial', icon: AlertCircle },
          { label: 'Cancelada', value: 'cancelled', icon: Ban },
        ],
      },
    ],
    []
  )

  const serviceParams = useMemo(() => ({}), [])

  const handleCreateInvoice = () => {
    setSelectedInvoice(null)
    setModalOpen(true)
  }

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setModalOpen(true)
  }

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete) return

    try {
      await invoiceService.destroy(invoiceToDelete)
      toast.success('Factura eliminada correctamente')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la factura')
    } finally {
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setInvoicesToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!invoicesToDelete.length) return

    try {
      const result = await invoiceService.destroyMany(invoicesToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} factura(s) eliminada(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar las facturas')
    } finally {
      setBatchDeleteDialogOpen(false)
      setInvoicesToDelete([])
    }
  }

  const handleSaveInvoice = async (
    data: InvoiceCreatePayload | InvoiceUpdatePayload,
    invoiceId?: string
  ) => {
    try {
      if (invoiceId) {
        const result = await invoiceService.update(
          invoiceId,
          data as InvoiceUpdatePayload
        )
        if (!result.success) throw new Error(result.error)
        toast.success('Factura actualizada correctamente')
      } else {
        const result = await invoiceService.create(data as InvoiceCreatePayload)
        if (!result.success) throw new Error(result.error)
        toast.success('Factura creada correctamente')
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar la factura')
      throw error
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Facturas
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona las facturas de tu negocio
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button className="w-full sm:w-auto" onClick={handleCreateInvoice}>
            <Plus size={20} />
            Nueva Factura
          </Button>
        </div>
      </div>

      <DataTable
        ref={dataTableRef}
        columns={getInvoicesColumns(timezone).map((col) => {
          if (col.id === 'actions') {
            return {
              ...col,
              cell: ({ row }: any) => {
                const invoice = row.original

                return (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleEditInvoice(invoice)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDeleteInvoice(invoice.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              },
            }
          }
          return col
        })}
        service={invoiceService}
        searchConfig={searchConfig}
        filters={filterConfigs}
        defaultQueryParams={serviceParams}
        enableRowSelection
        onDeleteSelected={handleBatchDelete}
      />

      <InvoiceFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        invoice={selectedInvoice}
        onSave={handleSaveInvoice}
        businessId={activeBusiness?.id || ''}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="factura"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="factura"
        count={invoicesToDelete.length}
        variant="outline"
      />
    </div>
  )
}
