'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  UserPlus,
  Trash2,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react'
import type { BusinessAccountMember } from '@/lib/models/business-account/business-account-member'
import BusinessAccountService from '@/lib/services/business-account/business-account-service'
import Loading from '@/components/ui/loading'
import { toast } from 'sonner'
import { CreateMemberModal } from './CreateMemberModal'
import { useCurrentUser } from '@/hooks/use-current-user'
import { USER_ROLES } from '@/const/roles'

interface BusinessAccountMembersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  accountName: string
  contactName?: string
  contactEmail?: string
}

const roleLabels = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Miembro',
}

const roleIcons = {
  owner: ShieldCheck,
  admin: Shield,
  member: User,
}

const statusLabels = {
  active: 'Activo',
  inactive: 'Inactivo',
}

const statusVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  inactive: 'outline',
}

export function BusinessAccountMembersModal({
  open,
  onOpenChange,
  accountId,
  accountName,
  contactName,
  contactEmail,
}: BusinessAccountMembersModalProps) {
  const [members, setMembers] = useState<BusinessAccountMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createMemberModalOpen, setCreateMemberModalOpen] = useState(false)
  const { role } = useCurrentUser()

  // Contar administradores activos
  const adminCount = useMemo(() => {
    return members.filter(
      (m) => (m.role === 'owner' || m.role === 'admin') && m.status === 'active'
    ).length
  }, [members])

  useEffect(() => {
    if (open && accountId) {
      loadMembers()
    }
  }, [open, accountId])

  const loadMembers = async () => {
    setIsLoading(true)
    try {
      const service = new BusinessAccountService()
      const membersList = await service.getAccountMembers(accountId)
      setMembers(membersList)
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateRole = async (
    memberId: string,
    newRole: 'owner' | 'admin' | 'member'
  ) => {
    try {
      const service = new BusinessAccountService()
      const result = await service.updateMember(memberId, { role: newRole })
      if (result.success) {
        toast.success(`Rol actualizado a ${roleLabels[newRole]}`)
        await loadMembers()
      } else {
        toast.error(result.error || 'Error al actualizar el rol')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar el rol')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este miembro?')) {
      return
    }

    try {
      const service = new BusinessAccountService()
      const result = await service.removeMember(memberId)
      if (result.success) {
        toast.success('Miembro eliminado correctamente')
        await loadMembers()
      } else {
        toast.error(result.error || 'Error al eliminar el miembro')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al eliminar el miembro')
    }
  }

  const handleCreateMember = () => {
    setCreateMemberModalOpen(true)
  }

  const handleMemberCreated = () => {
    loadMembers()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl !max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Miembros del Equipo</DialogTitle>
          <DialogDescription>
            Gestiona los miembros y permisos de {accountName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button onClick={handleCreateMember} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Crear Miembro
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loading />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay miembros en esta cuenta
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Unión</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const RoleIcon = roleIcons[member.role]
                  const isAdmin =
                    member.role === 'owner' || member.role === 'admin'
                  const isLastAdmin = isAdmin && adminCount === 1

                  // Determinar si se puede eliminar este miembro
                  const canDelete = (() => {
                    // Los owners nunca se pueden eliminar desde aquí
                    if (member.role === 'owner') return false

                    // Si es el último admin, solo company_admin puede eliminar
                    if (isLastAdmin) {
                      return role === USER_ROLES.COMPANY_ADMIN
                    }

                    // Si es admin pero no es el último, business_admin también puede
                    if (isAdmin) {
                      return true
                    }

                    // Los members normales siempre se pueden eliminar
                    return true
                  })()

                  const deleteTooltip = (() => {
                    if (member.role === 'owner') {
                      return 'No se puede eliminar al propietario'
                    }
                    if (isLastAdmin && role !== USER_ROLES.COMPANY_ADMIN) {
                      return 'Solo un administrador de la compañía puede eliminar al único administrador'
                    }
                    return undefined
                  })()

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {(member as any).users_profile?.full_name ||
                              (member as any).users_profile?.email ||
                              'Usuario sin nombre'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(member as any).users_profile?.email ||
                              member.user_profile_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <RoleIcon className="h-3 w-3" />
                          {roleLabels[member.role]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[member.status]}>
                          {statusLabels[member.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(member.created_at).toLocaleDateString(
                          'es-CO'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menú</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {member.role !== 'owner' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateRole(member.id, 'admin')
                                  }
                                  disabled={member.role === 'admin'}
                                >
                                  <Shield className="mr-2 h-4 w-4" />
                                  Hacer Administrador
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleUpdateRole(member.id, 'member')
                                  }
                                  disabled={member.role === 'member'}
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  Hacer Miembro
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={!canDelete}
                              title={deleteTooltip}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                              {isLastAdmin && (
                                <span className="ml-2 text-xs">
                                  (Único admin)
                                </span>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <CreateMemberModal
          open={createMemberModalOpen}
          onOpenChange={setCreateMemberModalOpen}
          accountId={accountId}
          onMemberCreated={handleMemberCreated}
          contactName={contactName}
          contactEmail={contactEmail}
        />
      </DialogContent>
    </Dialog>
  )
}
