'use client'

import {
  DataTable,
  DataTableRef,
  SearchConfig,
  FilterConfig,
  ExportConfig,
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
  UserCheck,
  UserX,
  Crown,
  Ban,
  KeySquare,
  DoorClosedLocked,
} from 'lucide-react'
import BusinessCustomerService from '@/lib/services/customer/business-customer-service'
import { getCustomersColumns } from '@/lib/models/customer/const/data-table/customers-columns'
import { CustomerModal } from '@/components/customers/CustomerModal'
import { CreateAccessModal } from '@/components/customers/CreateAccessModal'
import { useRef, useMemo, useState, useEffect } from 'react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { toast } from 'sonner'
import type {
  BusinessCustomer,
  BusinessCustomerUpdate,
  CreateCustomerInput,
} from '@/lib/models/customer/business-customer'
import { GenericImportExportButtons } from '@/components/GenericImportExportButtons'
import { importCustomersWithProgress } from '@/lib/actions/customer-import-export'

export default function CustomersPage() {
  const { user, role, isLoading } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()
  const customerService = useMemo(() => new BusinessCustomerService(), [])
  const dataTableRef = useRef<DataTableRef>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false)
  const [createAccessModalOpen, setCreateAccessModalOpen] = useState(false)
  const [removeAccessDialogOpen, setRemoveAccessDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] =
    useState<BusinessCustomer | null>(null)
  const [customerToCreateAccess, setCustomerToCreateAccess] =
    useState<BusinessCustomer | null>(null)
  const [customerToRemoveAccess, setCustomerToRemoveAccess] =
    useState<BusinessCustomer | null>(null)
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null)
  const [customersToDelete, setCustomersToDelete] = useState<string[]>([])
  const [categories, setCategories] = useState<any[]>([])

  useEffect(() => {
    fetchCategories()
  }, [activeBusiness?.business_account_id, customerService])

  const fetchCategories = async () => {
    if (activeBusiness?.business_account_id) {
      try {
        const result = await customerService.fetchCategories(
          activeBusiness.business_account_id
        )
        if (result.success && result.data) {
          setCategories(result.data)
        }
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }
  }

  const searchConfig: SearchConfig = useMemo(
    () => ({
      column: 'full_name',
      placeholder: 'Buscar cliente...',
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
          { label: 'Activo', value: 'active', icon: UserCheck },
          { label: 'Inactivo', value: 'inactive', icon: UserX },
          { label: 'VIP', value: 'vip', icon: Crown },
          { label: 'Bloqueado', value: 'blocked', icon: Ban },
        ],
      },
      {
        column: 'category',
        title: 'Categoría',
        options: categories.map((cat) => ({
          label: cat.name,
          value: cat.id,
        })),
      },
    ],
    [categories]
  )

  const activeBusinessId = activeBusiness?.id

  const serviceParams = useMemo(() => {
    if (!activeBusinessId) return null
    return { business_id: activeBusinessId }
  }, [activeBusinessId])

  const isReady = !isLoading && serviceParams !== null

  const exportConfig: ExportConfig | null = useMemo(() => {
    if (!activeBusinessId) return null

    return {
      enabled: true,
      tableName: 'clientes',
      businessId: activeBusinessId,
      excludedColumns: ['actions'],
      columnFormatters: {
        status: (value: string) => {
          const statusLabels: Record<string, string> = {
            active: 'Activo',
            inactive: 'Inactivo',
            vip: 'VIP',
            blocked: 'Bloqueado',
          }
          return statusLabels[value] || value
        },
        category: (value: string, row: any) =>
          row.category_name?.name || value || '-',
        tags: (value: string[]) => {
          if (!value || value.length === 0) return '-'
          return value.join(', ')
        },
        created_at: (value: string) => {
          if (!value) return '-'
          return new Date(value).toLocaleDateString('es-CO')
        },
        company_name: (value: string) => value || '-',
        phone: (value: string) => value || '-',
      },
    }
  }, [activeBusinessId])

  const isCompanyAdmin = role === 'company_admin'
  const isBusinessAdmin = role === 'business_admin'
  const canCreate = isCompanyAdmin || isBusinessAdmin
  const canEdit = isCompanyAdmin || isBusinessAdmin
  const canDelete = isCompanyAdmin || isBusinessAdmin

  const handleCreateCustomer = () => {
    setSelectedCustomer(null)
    setModalOpen(true)
  }

  const handleEditCustomer = (customer: BusinessCustomer) => {
    setSelectedCustomer(customer)
    setModalOpen(true)
  }

  const handleDeleteCustomer = (customerId: string) => {
    setCustomerToDelete(customerId)
    setDeleteDialogOpen(true)
  }

  const handleCreateAccess = (customer: BusinessCustomer) => {
    setCustomerToCreateAccess(customer)
    setCreateAccessModalOpen(true)
  }

  const handleRemoveAccess = (customer: BusinessCustomer) => {
    if (!customer.user_id) return
    setCustomerToRemoveAccess(customer)
    setRemoveAccessDialogOpen(true)
  }

  const confirmRemoveAccess = async () => {
    if (!customerToRemoveAccess) return
    
    try {
      const { removeCustomerAccessAction } = await import('@/lib/actions/customer-auth')
      const result = await removeCustomerAccessAction({ customerId: customerToRemoveAccess.id })
      
      if (result.success) {
        toast.success('Acceso removido correctamente')
        // Cerrar el modal de edición si está abierto
        setModalOpen(false)
        setSelectedCustomer(null)
        dataTableRef.current?.refreshData()
      } else {
        toast.error(result.error || 'Error al remover el acceso')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error inesperado')
    } finally {
      setRemoveAccessDialogOpen(false)
      setCustomerToRemoveAccess(null)
    }
  }

  const confirmDelete = async () => {
    if (!customerToDelete) return

    try {
      await customerService.destroyItem(customerToDelete)
      toast.success('Cliente eliminado correctamente')
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo eliminar el cliente')
    } finally {
      setDeleteDialogOpen(false)
      setCustomerToDelete(null)
    }
  }

  const handleBatchDelete = async (ids: string[]) => {
    setCustomersToDelete(ids)
    setBatchDeleteDialogOpen(true)
  }

  const confirmBatchDelete = async () => {
    if (!customersToDelete.length) return

    try {
      const result = await customerService.destroyMany(customersToDelete)
      if (result.success) {
        toast.success(`${result.deletedCount} cliente(s) eliminado(s)`)
        dataTableRef.current?.refreshData()
        dataTableRef.current?.clearSelection()
      } else {
        throw new Error(result.error)
      }
    } catch (error: any) {
      toast.error(error.message || 'No se pudieron eliminar los clientes')
    } finally {
      setBatchDeleteDialogOpen(false)
      setCustomersToDelete([])
    }
  }

  const handleSaveCustomer = async (
    data: CreateCustomerInput | BusinessCustomerUpdate,
    customerId?: string
  ) => {
    try {
      if (customerId) {
        const updateData = data as BusinessCustomerUpdate & { 
          new_password?: string
          create_user_account?: boolean
          password?: string
          send_welcome_email?: boolean
        }
        const newPassword = updateData.new_password
        const createUserAccount = updateData.create_user_account
        const password = updateData.password
        const sendWelcomeEmail = updateData.send_welcome_email
        
        delete updateData.new_password
        delete updateData.create_user_account
        delete updateData.password
        delete updateData.send_welcome_email
        
        const result = await customerService.updateItem(
          customerId,
          updateData
        )
        if (!result.success) throw new Error(result.error)
        
        // Si se solicitó cambio de contraseña
        if (newPassword) {
          const { changeCustomerPassword } = await import('@/lib/actions/customer-auth')
          const customer = await customerService.getById(customerId)
          
          if (customer?.user_id) {
            const passwordResult = await changeCustomerPassword({
              userId: customer.user_id,
              newPassword: newPassword,
            })
            
            if (!passwordResult.success) {
              toast.warning('Cliente actualizado, pero hubo un error al cambiar la contraseña: ' + passwordResult.error)
            } else {
              toast.success('Cliente y contraseña actualizados correctamente')
            }
          } else {
            toast.success('Cliente actualizado correctamente')
          }
        }
        // Si se solicitó crear cuenta de usuario (customer sin user_id)
        else if (createUserAccount) {
          const { activateCustomerAccountAction } = await import('@/lib/actions/customer-auth')
          const authResult = await activateCustomerAccountAction({
            customerId: customerId,
            businessId: activeBusinessId || '',
            password: password || undefined,
            sendWelcomeEmail: sendWelcomeEmail,
          })
          
          if (!authResult.success) {
            toast.warning('Cliente actualizado, pero hubo un error al crear la cuenta: ' + authResult.error)
          } else {
            toast.success('Cliente actualizado y cuenta creada correctamente')
          }
        } else {
          toast.success('Cliente actualizado correctamente')
        }
      } else {
        const result = await customerService.createFullCustomer(
          data as CreateCustomerInput
        )
        if (!result.success) throw new Error(result.error)
        if (result.isNew) {
          toast.success('Cliente creado correctamente')
        } else {
          toast.info('Cliente existente encontrado')
        }
      }
      dataTableRef.current?.refreshData()
    } catch (error: any) {
      toast.error(error.message || 'No se pudo guardar el cliente')
      throw error
    }
  }

  if (!activeBusinessId) {
    return (
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Clientes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Selecciona una sucursal para ver los clientes
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Clientes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Gestiona los clientes de tu negocio
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {canCreate && (
            <Button className="w-full sm:w-auto" onClick={handleCreateCustomer}>
              <Plus size={20} />
              Nuevo Cliente
            </Button>
          )}
          {activeBusiness?.id && (
            <GenericImportExportButtons
              config={{
                entityType: 'customers',
                displayName: 'Clientes',
                templateDownloadUrl: '/api/customers/download-template',
                importAction: importCustomersWithProgress,
                requiredFields: ['nit', 'emails'],
                optionalFields: [
                  'company_name',
                  'full_name',
                  'phone',
                  'status',
                  'category',
                  'notes',
                  'preferences',
                  'tags',
                ],
              }}
              additionalFormData={{ businessId: activeBusiness.id }}
              onImportComplete={() => dataTableRef.current?.refreshData()}
            />
          )}
        </div>
      </div>

      {isReady && (
        <DataTable
          key={activeBusinessId}
          ref={dataTableRef}
          columns={getCustomersColumns(user?.timezone || 'America/Bogota').map((col) => {
            if (col.id === 'actions') {
              return {
                ...col,
                cell: ({ row }: any) => {
                  const customer = row.original

                  if (!canEdit && !canDelete) return null

                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canEdit && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleEditCustomer(customer)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {!customer.user_id && customer.emails?.length > 0 && (
                              <DropdownMenuItem
                                onClick={() => handleCreateAccess(customer)}
                              >
                                <KeySquare className="mr-2 h-4 w-4" />
                                Crear Acceso
                              </DropdownMenuItem>
                            )}
                            {customer.user_id && (
                              <DropdownMenuItem
                                onClick={() => handleRemoveAccess(customer)}
                              >
                                <DoorClosedLocked className="mr-2 h-4 w-4" />
                                Remover Acceso
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteCustomer(customer.id)}
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
          service={customerService}
          searchConfig={searchConfig}
          filters={filterConfigs}
          exportConfig={exportConfig || undefined}
          defaultQueryParams={serviceParams || {}}
          enableRowSelection={canDelete}
          onDeleteSelected={handleBatchDelete}
        />
      )}

      <CustomerModal
        businessId={activeBusinessId}
        businessAccountId={activeBusiness?.business_account_id || ''}
        open={modalOpen}
        onOpenChange={setModalOpen}
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
        onRemoveAccess={handleRemoveAccess}
      />

      <ConfirmDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName="cliente"
      />

      <ConfirmDeleteDialog
        open={batchDeleteDialogOpen}
        onOpenChange={setBatchDeleteDialogOpen}
        onConfirm={confirmBatchDelete}
        itemName="cliente"
        count={customersToDelete.length}
        variant="outline"
      />

      <CreateAccessModal
        open={createAccessModalOpen}
        onOpenChange={setCreateAccessModalOpen}
        customer={customerToCreateAccess}
        businessId={activeBusinessId || ''}
        onSuccess={() => dataTableRef.current?.refreshData()}
      />

      <ConfirmDeleteDialog
        open={removeAccessDialogOpen}
        onOpenChange={setRemoveAccessDialogOpen}
        onConfirm={confirmRemoveAccess}
        itemName={`acceso de ${customerToRemoveAccess?.full_name || 'este cliente'}`}
        title="Remover Acceso"
        description="El cliente perderá la capacidad de iniciar sesión en la plataforma."
        confirmLabel="Remover"
      />
    </div>
  )
}
