'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, X } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog'
import {
  AssignRoleModal,
  type AssignRoleValues,
} from '@/components/access-control/AssignRoleModal'
import {
  assignRoleAction,
  fetchAccountMembersAction,
  revokeRoleAction,
} from '@/lib/actions/access-control/assignments'
import { fetchRolesAction } from '@/lib/actions/access-control/roles'
import { formatDate, shortId } from '@/components/access-control/format'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useActiveBusinessStore } from '@/lib/store/active-business-store'
import { USER_ROLES } from '@/const/roles'
import type {
  AccountMember,
  RbacRole,
  RbacUserRole,
} from '@/lib/models/access-control/access-control'

export default function AssignmentsPage() {
  const { role: userRole } = useCurrentUser()
  const { activeBusiness } = useActiveBusinessStore()

  const isCompanyAdmin = userRole === USER_ROLES.COMPANY_ADMIN
  // Para company_admin la cuenta sale del negocio activo; para
  // business_admin el servidor la deriva SIEMPRE de la sesión.
  const accountId = isCompanyAdmin
    ? activeBusiness?.business_account_id ?? undefined
    : undefined

  const [members, setMembers] = useState<AccountMember[]>([])
  const [roles, setRoles] = useState<RbacRole[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<AccountMember | null>(
    null
  )
  const [revokeTarget, setRevokeTarget] = useState<{
    member: AccountMember
    assignment: RbacUserRole
  } | null>(null)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [isRevoking, setIsRevoking] = useState(false)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const params = accountId ? { businessAccountId: accountId } : undefined
    const [membersResult, rolesResult] = await Promise.all([
      fetchAccountMembersAction(params),
      fetchRolesAction(params),
    ])
    setIsLoading(false)

    if (membersResult.error) {
      toast.error(membersResult.error)
    } else {
      setMembers(membersResult.data)
    }

    if (rolesResult.error) {
      toast.error(rolesResult.error)
    } else {
      setRoles(rolesResult.data)
    }
  }, [accountId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleOpenAssign = (member: AccountMember) => {
    setSelectedMember(member)
    setAssignModalOpen(true)
  }

  const handleAssign = async (values: AssignRoleValues) => {
    if (!selectedMember) return

    const result = await assignRoleAction({
      userId: selectedMember.user_id,
      roleId: values.roleId,
      ...(accountId ? { businessAccountId: accountId } : {}),
      expiresAt: values.expiresAt,
    })

    if (!result.success) {
      toast.error(result.error || 'No se pudo asignar el rol')
      throw new Error(result.error || 'assign_failed')
    }

    toast.success('Rol asignado correctamente')
    await loadData()
  }

  const handleOpenRevoke = (member: AccountMember, assignment: RbacUserRole) => {
    setRevokeTarget({ member, assignment })
    setRevokeDialogOpen(true)
  }

  const confirmRevoke = async () => {
    if (!revokeTarget) return

    setIsRevoking(true)
    const result = await revokeRoleAction({
      userId: revokeTarget.member.user_id,
      roleId: revokeTarget.assignment.role_id,
      // La cuenta autoritativa es la de la asignación (el servidor revalida).
      businessAccountId: revokeTarget.assignment.business_account_id,
    })
    setIsRevoking(false)
    setRevokeDialogOpen(false)
    setRevokeTarget(null)

    if (!result.success) {
      toast.error(result.error || 'No se pudo revocar el rol')
      return
    }
    toast.success('Rol revocado correctamente')
    await loadData()
  }

  const isExpired = (assignment: RbacUserRole) =>
    !!assignment.expires_at && new Date(assignment.expires_at) < new Date()

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 w-full overflow-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Asignaciones
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Miembros de la cuenta y sus roles RBAC
          </p>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Nombre</TableHead>
                <TableHead>Rol legacy</TableHead>
                <TableHead>Roles RBAC</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isCompanyAdmin && !accountId
                      ? 'Selecciona un negocio activo para ver los miembros de su cuenta'
                      : 'No hay miembros en esta cuenta'}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">
                      {member.email}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {member.name || '—'}
                    </TableCell>
                    <TableCell>
                      {member.legacy_role ? (
                        <Badge variant="secondary" className="text-muted-foreground">
                          legacy: {member.legacy_role}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.roles.length === 0 ? (
                        <span className="text-sm text-muted-foreground">
                          Sin roles
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {member.roles.map((assignment) => (
                            <Tooltip
                              key={`${assignment.role_id}-${assignment.business_account_id}`}
                            >
                              <TooltipTrigger asChild>
                                <Badge
                                  variant={
                                    isExpired(assignment)
                                      ? 'outline'
                                      : 'default'
                                  }
                                  className="gap-1 pr-1"
                                >
                                  {assignment.role?.name ||
                                    shortId(assignment.role_id)}
                                  <button
                                    type="button"
                                    className="rounded-full hover:bg-black/20 dark:hover:bg-white/20 p-0.5"
                                    onClick={() =>
                                      handleOpenRevoke(member, assignment)
                                    }
                                    aria-label={`Revocar rol ${
                                      assignment.role?.name || ''
                                    }`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {isExpired(assignment)
                                  ? `Expiró el ${formatDate(assignment.expires_at!)}`
                                  : assignment.expires_at
                                    ? `Expira el ${formatDate(assignment.expires_at)}`
                                    : 'Sin expiración'}
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAssign(member)}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Asignar rol
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AssignRoleModal
          open={assignModalOpen}
          onOpenChange={setAssignModalOpen}
          member={selectedMember}
          roles={roles}
          onAssign={handleAssign}
        />

        <ConfirmDeleteDialog
          open={revokeDialogOpen}
          onOpenChange={setRevokeDialogOpen}
          onConfirm={confirmRevoke}
          isLoading={isRevoking}
          title="¿Revocar rol?"
          confirmLabel="Revocar"
          description={
            revokeTarget
              ? `Se revocará el rol "${
                  revokeTarget.assignment.role?.name || 'seleccionado'
                }" de ${
                  revokeTarget.member.name || revokeTarget.member.email
                }. El usuario perderá los permisos que otorga este rol.`
              : undefined
          }
        />
      </div>
    </TooltipProvider>
  )
}
