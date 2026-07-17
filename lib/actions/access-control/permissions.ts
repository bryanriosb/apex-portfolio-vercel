'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'
import { requireUser, requireCompanyAdmin } from '@/lib/auth/tenant-guard'

import type {
  RbacPermission,
  RbacPermissionInsert,
} from '@/lib/models/access-control/access-control'

const PERMISSION_CODE_REGEX = /^[a-z_]+\.([a-z_]+|\*)$/

/** Catálogo de permisos (lectura para cualquier sesión). */
export async function fetchPermissionsAction(): Promise<{
  data: RbacPermission[]
  error: string | null
}> {
  try {
    await requireUser()

    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('rbac_permissions')
      .select('*')
      .order('entity')
      .order('action')

    if (error) throw error
    return { data: data ?? [], error: null }
  } catch (error: any) {
    console.error('Error fetching permissions:', error)
    return { data: [], error: error.message }
  }
}

/**
 * El catálogo de permisos es de plataforma (los códigos deben coincidir con
 * el enforcement en código): solo company_admin lo modifica.
 */
export async function createPermissionAction(
  input: RbacPermissionInsert
): Promise<{ data: RbacPermission | null; error: string | null }> {
  try {
    await requireCompanyAdmin()

    const code = input.code.trim().toLowerCase()
    if (code !== '*' && !PERMISSION_CODE_REGEX.test(code)) {
      return {
        data: null,
        error: "Formato inválido: usa 'entidad.accion' o 'entidad.*'",
      }
    }

    const [entity, action] = code === '*' ? ['*', '*'] : code.split('.')

    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('rbac_permissions')
      .insert({
        code,
        entity,
        action,
        description: input.description ?? null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'Ya existe un permiso con ese código' }
      }
      throw error
    }

    return { data, error: null }
  } catch (error: any) {
    console.error('Error creating permission:', error)
    return { data: null, error: error.message }
  }
}

export async function updatePermissionAction(
  permissionId: string,
  input: { description?: string | null }
): Promise<{ data: RbacPermission | null; error: string | null }> {
  try {
    await requireCompanyAdmin()

    // Solo la descripción es editable: cambiar el código rompería el
    // enforcement que lo referencia.
    const client = await getSupabaseAdminClient()
    const { data, error } = await client
      .from('rbac_permissions')
      .update({ description: input.description ?? null })
      .eq('id', permissionId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error: any) {
    console.error('Error updating permission:', error)
    return { data: null, error: error.message }
  }
}

export async function deletePermissionAction(
  permissionId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await requireCompanyAdmin()

    const client = await getSupabaseAdminClient()

    const { count } = await client
      .from('rbac_role_permissions')
      .select('role_id', { count: 'exact', head: true })
      .eq('permission_id', permissionId)

    if (count && count > 0) {
      return {
        success: false,
        error: `El permiso está asignado a ${count} rol(es); retíralo primero`,
      }
    }

    const { error } = await client
      .from('rbac_permissions')
      .delete()
      .eq('id', permissionId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error deleting permission:', error)
    return { success: false, error: error.message }
  }
}
