import type { RbacPermission } from '@/lib/models/access-control/access-control'

/** Fecha corta (ej: 14 jul 2026). */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Fecha y hora (ej: 14 jul 2026, 10:30). */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** UUID abreviado para mostrar en tablas. */
export function shortId(id: string): string {
  return id.slice(0, 8)
}

/** Agrupa el catálogo de permisos por entidad, preservando el orden. */
export function groupPermissionsByEntity(
  permissions: RbacPermission[]
): { entity: string; permissions: RbacPermission[] }[] {
  const groups = new Map<string, RbacPermission[]>()
  for (const permission of permissions) {
    const list = groups.get(permission.entity) ?? []
    list.push(permission)
    groups.set(permission.entity, list)
  }
  return Array.from(groups.entries()).map(([entity, perms]) => ({
    entity,
    permissions: perms,
  }))
}
