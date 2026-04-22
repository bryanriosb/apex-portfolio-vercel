'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, Search, User, Building2, AlertTriangle, Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { searchBusinessCustomersAction } from '@/lib/actions/business-customer'
import {
  matchTransactionToCustomerAction,
  bulkMatchTransactionsAction,
} from '@/lib/actions/bank-transactions'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'
import { getCurrentUser } from '@/lib/services/auth/supabase-auth'

interface MatchCustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionId?: string
  transactionIds?: string[]
  transactionNit?: string | null
  transactionName?: string | null
  businessId: string
  onMatched: () => void
}

export function MatchCustomerDialog({
  open,
  onOpenChange,
  transactionId,
  transactionIds,
  transactionNit,
  transactionName,
  businessId,
  onMatched,
}: MatchCustomerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<BusinessCustomer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<BusinessCustomer | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [totalResults, setTotalResults] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isBatchMode = Boolean(transactionIds && transactionIds.length > 0)
  const targetCount = isBatchMode ? transactionIds!.length : 1

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setCustomers([])
      setHasSearched(false)
      setTotalResults(null)
      return
    }

    setIsSearching(true)
    setHasSearched(true)

    try {
      const results = await searchBusinessCustomersAction(
        businessId,
        searchQuery.trim(),
        20
      )
      setCustomers(results)
      setTotalResults(results.length === 20 ? null : results.length)
    } catch (error) {
      console.error('Error searching customers:', error)
      toast.error('Error al buscar clientes')
      setCustomers([])
      setTotalResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [businessId, searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const handleSelectCustomer = (customer: BusinessCustomer) => {
    setSelectedCustomer(customer)
  }

  const handleMatch = async () => {
    if (!selectedCustomer) return

    setIsSubmitting(true)

    try {
      const user = await getCurrentUser()
      const matchedBy = user?.id || 'system'

      if (isBatchMode && transactionIds) {
        const result = await bulkMatchTransactionsAction(
          transactionIds,
          selectedCustomer.id,
          matchedBy
        )

        if (result.success) {
          toast.success(`${result.matchedCount} transacciones asociadas correctamente`)
          onMatched()
          onOpenChange(false)
          resetState()
        } else {
          toast.error(result.error || 'Error al asociar las transacciones')
        }
      } else if (transactionId) {
        const result = await matchTransactionToCustomerAction(
          transactionId,
          selectedCustomer.id,
          matchedBy
        )

        if (result.success) {
          toast.success('Transacción asociada correctamente')
          onMatched()
          onOpenChange(false)
          resetState()
        } else {
          toast.error(result.error || 'Error al asociar la transacción')
        }
      }
    } catch (error: any) {
      console.error('Error matching transaction:', error)
      toast.error(error.message || 'Error al asociar')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetState = () => {
    setSearchQuery('')
    setCustomers([])
    setSelectedCustomer(null)
    setHasSearched(false)
    setTotalResults(null)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false)
      resetState()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isBatchMode && <Users className="h-5 w-5" />}
            Asociar Cliente
          </DialogTitle>
          <DialogDescription>
            {isBatchMode
              ? `Asocia ${targetCount} transacciones seleccionadas a un cliente`
              : 'Busca y selecciona un cliente para asociar a esta transacción'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isBatchMode && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Modo lote activo</p>
              <p className="text-xs mt-0.5">
                {targetCount} transacciones serán asociadas al cliente seleccionado
              </p>
            </div>
          )}

          {!isBatchMode && (transactionNit || transactionName) && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium text-muted-foreground mb-1">Datos del extracto:</p>
              {transactionNit && (
                <p className="text-muted-foreground">
                  NIT: <span className="font-mono">{transactionNit}</span>
                </p>
              )}
              {transactionName && (
                <p className="text-muted-foreground">
                  Nombre: <span>{transactionName}</span>
                </p>
              )}
            </div>
          )}

          <div className="relative">
            <Input
              ref={inputRef}
              placeholder="Buscar por NIT, nombre o empresa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {hasSearched && customers.length > 0 && (
            <div className="text-xs text-muted-foreground px-1">
              {totalResults !== null ? (
                <span>{customers.length} cliente{customers.length !== 1 ? 's' : ''} encontrado{customers.length !== 1 ? 's' : ''}</span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Mostrando {customers.length} resultados. Refina la búsqueda para ver menos.
                </span>
              )}
            </div>
          )}

          <ScrollArea className="h-[300px] rounded-md border">
            {isSearching ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Buscando...</span>
                </div>
              </div>
            ) : hasSearched && customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <User className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-sm font-medium">No se encontraron clientes</p>
                <p className="text-xs mt-1 text-center px-4">
                  No hay clientes que coincidan con &quot;{searchQuery}&quot;
                </p>
                <p className="text-xs mt-2 text-muted-foreground">
                  Intenta con otro término o crea un nuevo cliente
                </p>
              </div>
            ) : !hasSearched ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 opacity-50" />
                </div>
                <p className="text-sm font-medium">Buscar clientes</p>
                <p className="text-xs mt-1">
                  Ingresa un NIT, nombre o empresa
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className={cn(
                      'w-full text-left p-3 hover:bg-muted/50 transition-colors',
                      selectedCustomer?.id === customer.id && 'bg-primary/10'
                    )}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {selectedCustomer?.id === customer.id ? (
                          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                            <svg
                              className="h-3 w-3 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {customer.full_name}
                          </p>
                          {customer.company_name && (
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          NIT: {customer.nit}
                        </p>
                        {customer.company_name && (
                          <p className="text-xs text-muted-foreground truncate">
                            {customer.company_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedCustomer && (
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-sm font-medium">Cliente seleccionado:</p>
              <p className="text-sm">
                {selectedCustomer.full_name}
                {selectedCustomer.company_name && ` - ${selectedCustomer.company_name}`}
              </p>
              <p className="text-xs text-muted-foreground">NIT: {selectedCustomer.nit}</p>
            </div>
          )}

          {!isBatchMode &&
            selectedCustomer &&
            transactionNit &&
            selectedCustomer.nit !== transactionNit && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">NITs diferentes</p>
                  <p className="text-xs mt-0.5">
                    El NIT del cliente ({selectedCustomer.nit}) no coincide con
                    el del extracto ({transactionNit})
                  </p>
                </div>
              </div>
            )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleMatch}
            disabled={!selectedCustomer || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSubmitting
              ? 'Asociando...'
              : isBatchMode
                ? `Asociar ${targetCount} transacciones`
                : 'Asociar Cliente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
