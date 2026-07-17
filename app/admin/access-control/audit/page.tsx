'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fetchRbacAuditAction } from '@/lib/actions/access-control/audit'
import { formatDateTime, shortId } from '@/components/access-control/format'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import type { RbacAuditEntry } from '@/lib/models/access-control/access-control'

const PAGE_SIZE = 100
const MAX_LIMIT = 500

function operationBadge(operation: string) {
  switch (operation) {
    case 'INSERT':
      return (
        <Badge className="bg-green-600 text-white dark:bg-green-500">
          INSERT
        </Badge>
      )
    case 'DELETE':
      return <Badge variant="destructive">DELETE</Badge>
    case 'UPDATE':
      return (
        <Badge className="bg-amber-500 text-white dark:bg-amber-400 dark:text-black">
          UPDATE
        </Badge>
      )
    default:
      return <Badge variant="secondary">{operation}</Badge>
  }
}

export default function AuditPage() {
  const { role: userRole } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const isCompanyAdmin = userRole === USER_ROLES.COMPANY_ADMIN
  // Para company_admin el alcance sale del negocio activo (sin negocio
  // activo, vista de plataforma); business_admin siempre ve su cuenta.
  const accountId = isCompanyAdmin
    ? activeBusiness?.business_account_id ?? undefined
    : undefined

  const [entries, setEntries] = useState<RbacAuditEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const loadAudit = useCallback(
    async (nextLimit: number, isInitial: boolean) => {
      if (isInitial) setIsLoading(true)
      else setIsLoadingMore(true)

      const result = await fetchRbacAuditAction({
        ...(accountId ? { businessAccountId: accountId } : {}),
        limit: nextLimit,
      })

      setIsLoading(false)
      setIsLoadingMore(false)

      if (result.error) {
        toast.error(result.error)
        return
      }
      setEntries(result.data)
    },
    [accountId]
  )

  useEffect(() => {
    setLimit(PAGE_SIZE)
    setExpanded(new Set())
    loadAudit(PAGE_SIZE, true)
  }, [loadAudit])

  const handleLoadMore = () => {
    const nextLimit = Math.min(limit + PAGE_SIZE, MAX_LIMIT)
    setLimit(nextLimit)
    loadAudit(nextLimit, false)
  }

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const canLoadMore = entries.length >= limit && limit < MAX_LIMIT

  return (
    <div className="flex flex-col gap-6 w-full overflow-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Auditoría
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Registro de cambios en roles, permisos y asignaciones
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Fecha</TableHead>
              <TableHead>Tabla</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Actor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No hay eventos de auditoría registrados
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => {
                const isOpen = expanded.has(entry.id)
                return (
                  <Fragment key={entry.id}>
                    <TableRow>
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleExpanded(entry.id)}
                          aria-label={
                            isOpen ? 'Ocultar datos' : 'Ver datos del registro'
                          }
                        >
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(entry.occurred_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.table_name}</Badge>
                      </TableCell>
                      <TableCell>{operationBadge(entry.operation)}</TableCell>
                      <TableCell>
                        {entry.actor ? (
                          <code
                            className="text-xs bg-muted px-1.5 py-0.5 rounded"
                            title={entry.actor}
                          >
                            {shortId(entry.actor)}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={5} className="bg-muted/30">
                          <pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto max-h-64">
                            {JSON.stringify(entry.row_data, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && canLoadMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cargar más
          </Button>
        </div>
      )}
    </div>
  )
}
