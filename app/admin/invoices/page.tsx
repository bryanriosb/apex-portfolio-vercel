'use client'

import { useRef, useMemo, useState, useEffect } from 'react'
import { DataTable, DataTableRef, SearchConfig, FilterConfig, ExportConfig } from '@/components/DataTable'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2, Plus, Eye } from 'lucide-react'
import InvoiceService from '@/lib/services/invoice/invoice-service'
import { INVOICE_COLUMNS } from '@/lib/models/invoice/invoice-columns'
import InvoiceModal from '@/components/invoices/InvoiceModal'
import InvoiceDetailModal from '@/components/invoices/InvoiceDetailModal'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { getBusinessByIdAction } from '@/lib/actions/business'
import { toast } from 'sonner'
import type { Invoice, InvoiceInsert, InvoiceUpdate } from '@/lib/models/invoice/invoice'
import type { Business } from '@/lib/models/business/business'

const STATUS_FILTER_OPTIONS = [
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ISSUED', label: 'Emitida' },
  { value: 'PAID', label: 'Pagada' },
  { value: 'CANCELLED', label: 'Anulada' },
]

export default function InvoicesPage() {
  const { role, isLoading } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const invoiceService = useMemo(() => new InvoiceService(), [])
  const dataTableRef = useRef<DataTableRef>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('')
  const [businessData, setBusinessData] = useState<Business | null>(null)

  const activeBusinessId = activeBusiness?.id

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'invoice_number',
      placeholder: 'Buscar factura...',
      serverField: 'search',
    }),
    []
  )

  const filters: FilterConfig[] = useMemo(
    () => [
      {
        column: 'status',
        title: 'Estado',
        options: STATUS_FILTER_OPTIONS,
      },
    ],
    []
  )

  const serviceParams = useMemo(() => {
    if (!activeBusinessId) return null
    return { business_id: activeBusinessId }
  }, [activeBusinessId])

  const isReady = !isLoading && serviceParams !== null

  const exportConfig: ExportConfig | null = useMemo(() => {
    if (!activeBusinessId) return null

    return {
      enabled: true,
      tableName: 'facturas',
      businessId: activeBusinessId,
      excludedColumns: ['actions'],
      columnFormatters: {
        status: (value: string) => {
          const statusLabels: Record<string, string> = {
            DRAFT: 'Borrador',
            ISSUED: 'Emitida',
            PAID: 'Pagada',
            CANCELLED: 'Anulada',
          }
          return statusLabels[value] || value
        },
        subtotal_cents: (value: number) => {
          if (!value) return '$0'
          return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          }).format(value / 100)
        },
        tax_cents: (value: number) => {
          if (!value) return '$0'
          return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          }).format(value / 100)
        },
        total_cents: (value: number) => {
          if (!value) return '$0'
          return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
          }).format(value / 100)
        },
        created_at: (value: string) => {
          if (!value) return '-'
          return new Date(value).toLocaleDateString('es-CO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        },
        customer_name: (value: string) => value || '-',
        customer_email: (value: string) => value || '-',
      },
    }
  }, [activeBusinessId])

  const isCompanyAdmin = role === 'company_admin'
  const isBusinessAdmin = role === 'business_admin'
  const canCreate = isCompanyAdmin || isBusinessAdmin
  const canEdit = isCompanyAdmin || isBusinessAdmin
  const canDelete = isCompanyAdmin || isBusinessAdmin

  useEffect(() => {
    async function loadBusinessData() {
      if (!activeBusinessId) return
      const business = await getBusinessByIdAction(activeBusinessId)
      setBusinessData(business)
    }
    loadBusinessData()
  }, [activeBusinessId])

  const handleCreateInvoice = async () => {
    if (!activeBusinessId) return
    const number = await invoiceService.getNextInvoiceNumber(activeBusinessId)
    setNextInvoiceNumber(number)
    setSelectedInvoice(null)
    setModalOpen(true)
  }

  const handleEditInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setNextInvoiceNumber(invoice.invoice_number)
    setModalOpen(true)
  }

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDetailModalOpen(true)
  }

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoiceToDelete(invoiceId)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!invoiceToDelete) return

    try {
      await invoiceService.destroyItem(invoiceToDelete)
      toast.success('Factura eliminada correctamente')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar la factura')
    } finally {
      setDeleteDialogOpen(false)
      setInvoiceToDelete(null)
    }
  }

  const handleSaveInvoice = async (
    data: InvoiceInsert | InvoiceUpdate,
    invoiceId?: string
  ) => {
    try {
      if (invoiceId) {
        const result = await invoiceService.updateItem(invoiceId, data as InvoiceUpdate)
        if (!result.success) throw new Error(result.error)
        toast.success('Factura actualizada correctamente')
      } else {
        const result = await invoiceService.createItem(data as InvoiceInsert)
        if (!result.success) throw new Error(result.error)
        toast.success('Factura creada correctamente')
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar la factura')
      throw error
    }
  }

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver las facturas
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona las facturas de tu negocio
          </p>
        </div>
        {canCreate && (
          <Button className="w-full sm:w-auto" onClick={handleCreateInvoice}>
            <Plus size={20} />
            Nueva Factura
          </Button>
        )}
      </div>

      {isReady && (
        <DataTable
          key={activeBusinessId}
          ref={dataTableRef}
          columns={INVOICE_COLUMNS.map((col) => {
            if (col.id === 'actions') {
              return {
                ...col,
                cell: ({ row }: any) => {
                  const invoice = row.original
                  const isLocked = invoice.status === 'PAID' || invoice.status === 'CANCELLED'

                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewInvoice(invoice)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalle
                        </DropdownMenuItem>
                        {canEdit && !isLocked && (
                          <DropdownMenuItem onClick={() => handleEditInvoice(invoice)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && !isLocked && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </>
                        )}
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
          filters={filters}
          exportConfig={exportConfig || undefined}
          defaultQueryParams={serviceParams || {}}
        />
      )}

      {businessData && (
        <InvoiceModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          invoice={selectedInvoice}
          businessId={activeBusinessId}
          businessData={{
            name: businessData.name,
            address: businessData.address,
            phone: businessData.phone_number || undefined,
          }}
          nextInvoiceNumber={nextInvoiceNumber}
          onSave={handleSaveInvoice}
        />
      )}

      <InvoiceDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        invoice={selectedInvoice}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="factura"
      />
    </div>
  )
}
