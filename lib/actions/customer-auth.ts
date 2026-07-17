'use server'

import { getSupabaseAdminClient } from './supabase'
import { sendEmailMailgun } from './mailgun'
import {
  requireUser,
  requireRole,
  requireBusinessAccess,
  AccessDeniedError,
} from '@/lib/auth/tenant-guard'
import { USER_ROLES } from '@/const/roles'
import type { AuthUser } from '@/lib/services/auth/supabase-auth'
import type { BusinessCustomer } from '@/lib/models/customer/business-customer'

export interface CreateCustomerAuthResult {
  success: boolean
  userId?: string
  error?: string
  isNewUser?: boolean
  generatedPassword?: string
}

/**
 * Genera una contraseña aleatoria segura
 */
function generateRandomPassword(length: number = 12): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  
  const allChars = lowercase + uppercase + numbers + symbols
  
  let password = ''
  // Asegurar al menos un carácter de cada tipo
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += symbols[Math.floor(Math.random() * symbols.length)]
  
  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Mezclar caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * AC-3/AC-6 (fail-closed): autoriza operaciones sobre el usuario auth de un
 * customer. Se permite al propio usuario, a company_admin (cross-tenant) y a
 * miembros del tenant dueño de algún business_customer vinculado al userId
 * (con `adminOnly`, solo si además el rol es business_admin).
 */
async function assertCustomerUserAccess(
  userId: string,
  options: { adminOnly?: boolean } = {}
): Promise<AuthUser> {
  const user = await requireUser()

  // El propio usuario siempre puede operar sobre su cuenta
  if (user.id === userId) {
    return user
  }

  // company_admin es el único rol cross-tenant
  if (user.role === USER_ROLES.COMPANY_ADMIN) {
    return user
  }

  if (options.adminOnly && user.role !== USER_ROLES.BUSINESS_ADMIN) {
    throw new AccessDeniedError(
      'No tienes permisos para gestionar este usuario'
    )
  }

  const client = await getSupabaseAdminClient()

  // Buscar los business_customers vinculados al usuario auth
  const { data: links } = await client
    .from('business_customers')
    .select('business_id')
    .eq('user_id', userId)

  const linkedBusinessIds = (links ?? [])
    .map((link) => link.business_id)
    .filter(Boolean) as string[]

  if (linkedBusinessIds.length > 0) {
    // 1. Sucursales presentes en la sesión
    const sessionBusinessIds = new Set(
      [user.business_id, ...(user.businesses?.map((b) => b.id) ?? [])].filter(
        Boolean
      ) as string[]
    )

    if (linkedBusinessIds.some((id) => sessionBusinessIds.has(id))) {
      return user
    }

    // 2. Fallback a BD: alguna sucursal vinculada pertenece a la cuenta
    if (user.business_account_id) {
      const { data: owned } = await client
        .from('businesses')
        .select('id')
        .in('id', linkedBusinessIds)
        .eq('business_account_id', user.business_account_id)
        .limit(1)

      if (owned && owned.length > 0) {
        return user
      }
    }
  }

  throw new AccessDeniedError('No tienes permisos sobre este usuario')
}

/**
 * Busca un usuario existente en auth.users por email
 */
export async function findExistingAuthUser(
  email: string
): Promise<{ id: string; email: string } | null> {
  try {
    // AC-3: requiere sesión válida (guard defensivo; helper server-side)
    await requireUser()

    const client = await getSupabaseAdminClient()
    const { data: { users }, error } = await client.auth.admin.listUsers()
    
    if (error) {
      console.error('Error listing users:', error.message)
      return null
    }
    
    const existingUser = users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )
    
    if (existingUser) {
      return {
        id: existingUser.id,
        email: existingUser.email || '',
      }
    }
    
    return null
  } catch (error) {
    console.error('Error finding existing auth user:', error)
    return null
  }
}

/**
 * Crea un usuario en Supabase Auth para un business_customer
 * Si el email ya existe, retorna el user_id existente
 */
export async function createCustomerAuthUser(params: {
  email: string
  password?: string
  fullName: string
  businessId: string
  businessCustomerId?: string
  phone?: string | null
  generatePassword?: boolean
}): Promise<CreateCustomerAuthResult> {
  const { email, password, fullName, businessId, businessCustomerId, phone, generatePassword = false } = params

  try {
    // AC-3: la sucursal destino debe pertenecer al tenant de la sesión
    await requireBusinessAccess(businessId)

    const client = await getSupabaseAdminClient()
    
    // 1. Verificar si el usuario ya existe
    const existingUser = await findExistingAuthUser(email)
    
    if (existingUser) {
      console.log(`[CustomerAuth] Usuario existente encontrado para ${email}, reutilizando user_id: ${existingUser.id}`)
      return {
        success: true,
        userId: existingUser.id,
        isNewUser: false,
      }
    }
    
    // 2. Generar contraseña si es necesario
    const userPassword = password || (generatePassword ? generateRandomPassword() : null)
    
    if (!userPassword) {
      return {
        success: false,
        error: 'Se requiere una contraseña o generar una automáticamente',
      }
    }
    
    // 3. Crear usuario en Supabase Auth
    // Normalizar phone: quitar el símbolo + del inicio
    const normalizedPhone = phone ? (phone.startsWith('+') ? phone.substring(1) : phone) : null
    
    const authUserData: {
      email: string
      password: string
      email_confirm: boolean
      user_metadata: Record<string, any>
      app_metadata: Record<string, any>
      phone?: string
      phone_confirm?: boolean
    } = {
      email,
      password: userPassword,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        full_name: fullName,
        name: fullName,
        role: 'customer',
        business_id: businessId,
        business_customer_id: businessCustomerId,
        phone: normalizedPhone,
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: 'customer',
        business_id: businessId,
        business_customer_id: businessCustomerId,
        phone: normalizedPhone,
      },
    }
    
    // Agregar phone como campo de primer nivel si existe (como en registration.ts)
    if (normalizedPhone) {
      authUserData.phone = normalizedPhone
      authUserData.phone_confirm = true
    }
    
    const { data: authData, error: authError } = await client.auth.admin.createUser(authUserData)
    
    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError?.message)
      return {
        success: false,
        error: authError?.message || 'Error al crear el usuario',
      }
    }
    
    console.log(`[CustomerAuth] Usuario creado exitosamente: ${authData.user.id}`)
    
    return {
      success: true,
      userId: authData.user.id,
      isNewUser: true,
      generatedPassword: userPassword,
    }
  } catch (error: any) {
    console.error('Error in createCustomerAuthUser:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado al crear usuario',
    }
  }
}

/**
 * Envía un email de bienvenida al cliente con sus credenciales
 */
export async function sendCustomerWelcomeEmail(params: {
  email: string
  fullName: string
  password: string
  businessName?: string
}): Promise<{ success: boolean; error?: string }> {
  const { email, fullName, password, businessName } = params

  try {
    // AC-3: requiere sesión válida (guard defensivo; helper server-side)
    await requireUser()

    const loginUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/sign-in`
      : 'https://agentic.borls.com/auth/sign-in'
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .credentials { background: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
          .credentials p { margin: 5px 0; }
          .button { display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 4px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido a APEX!</h1>
          </div>
          <div class="content">
            <p>Hola <strong>${fullName}</strong>,</p>
            <p>Se ha creado una cuenta de cliente para ti${businessName ? ` en <strong>${businessName}</strong>` : ''}.</p>
            <p>A continuación encontrarás tus credenciales de acceso:</p>
            <div class="credentials">
              <p><strong>Correo electrónico:</strong> ${email}</p>
              <p><strong>Contraseña:</strong> ${password}</p>
            </div>
            <p>Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión.</p>
            <p style="text-align: center; margin-top: 30px;">
              <a href="${loginUrl}" class="button">Iniciar Sesión</a>
            </p>
          </div>
          <div class="footer">
            <p>Este correo fue enviado automáticamente. Por favor no respondas a este mensaje.</p>
          </div>
        </div>
      </body>
      </html>
    `
    
    const textBody = `
¡Bienvenido a APEX!

Hola ${fullName},

Se ha creado una cuenta de cliente para ti${businessName ? ` en ${businessName}` : ''}.

Tus credenciales de acceso:
- Correo electrónico: ${email}
- Contraseña: ${password}

Por seguridad, te recomendamos cambiar tu contraseña después de iniciar sesión.

Inicia sesión en: ${loginUrl}

Este correo fue enviado automáticamente. Por favor no respondas a este mensaje.
    `
    
    await sendEmailMailgun({
      to: email,
      from: 'APEX <noreply@apex.borls.com>',
      subject: '¡Bienvenido a APEX! - Tus credenciales de acceso',
      body: {
        text: textBody,
        html: htmlBody,
      },
    })
    
    console.log(`[CustomerAuth] Email de bienvenida enviado a ${email}`)
    return { success: true }
  } catch (error: any) {
    console.error('[CustomerAuth] Error enviando email de bienvenida:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Crea un business_customer con cuenta de usuario opcional
 */
export async function createCustomerWithAuthAction(input: {
  businessId: string
  businessAccountId: string
  fullName: string
  email: string
  phone?: string | null
  nit: string
  companyName?: string | null
  status?: 'active' | 'inactive' | 'vip' | 'blocked'
  category?: string | null
  notes?: string | null
  createUserAccount?: boolean
  password?: string
  sendWelcomeEmail?: boolean
}): Promise<{
  success: boolean
  customer?: BusinessCustomer
  error?: string
  authCreated?: boolean
}> {
  const client = await getSupabaseAdminClient()
  
  let userId: string | null = null
  let isNewUser = false
  let generatedPassword: string | null = null

  try {
    // AC-3: la sucursal destino debe pertenecer al tenant de la sesión
    await requireBusinessAccess(input.businessId)

    // 1. Crear el business_customer primero
    const customerData = {
      business_id: input.businessId,
      full_name: input.fullName,
      emails: [input.email],
      phone: input.phone || null,
      nit: input.nit,
      company_name: input.companyName || null,
      status: input.status || 'active',
      category: input.category || null,
      notes: input.notes || null,
    }
    
    const { data: customer, error: customerError } = await client
      .from('business_customers')
      .insert(customerData)
      .select()
      .single()
    
    if (customerError) {
      return {
        success: false,
        error: customerError.message || 'Error al crear el cliente',
      }
    }
    
    // 2. Si se solicita crear cuenta de usuario
    if (input.createUserAccount && input.email && customer) {
      const authResult = await createCustomerAuthUser({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
        businessId: input.businessId,
        businessCustomerId: customer.id,
        phone: input.phone,
        generatePassword: !input.password,
      })
      
      if (authResult.success && authResult.userId) {
        userId = authResult.userId
        isNewUser = authResult.isNewUser || false
        generatedPassword = authResult.generatedPassword || input.password || null
        
        // 3. Actualizar el customer con el user_id
        await client
          .from('business_customers')
          .update({ user_id: userId })
          .eq('id', customer.id)
        
        // Enviar email de bienvenida si se solicitó y es usuario nuevo
        if (input.sendWelcomeEmail && isNewUser && generatedPassword) {
          await sendCustomerWelcomeEmail({
            email: input.email,
            fullName: input.fullName,
            password: generatedPassword,
            businessName: input.companyName || undefined,
          })
        }
      } else if (!authResult.success) {
        console.warn('[createCustomerWithAuth] No se pudo crear cuenta de usuario:', authResult.error)
      }
    }
    
    // 4. Obtener el customer actualizado
    const { data: updatedCustomer } = await client
      .from('business_customers')
      .select('*')
      .eq('id', customer.id)
      .single()
    
    return {
      success: true,
      customer: (updatedCustomer || customer) as BusinessCustomer,
      authCreated: !!userId,
    }
  } catch (error: any) {
    // Rollback en caso de error
    if (userId && isNewUser) {
      await client.auth.admin.deleteUser(userId)
    }
    
    console.error('Error in createCustomerWithAuthAction:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado',
    }
  }
}

/**
 * Activa una cuenta de usuario para un cliente existente
 */
export async function activateCustomerAccountAction(params: {
  customerId: string
  businessId: string
  password?: string
  sendWelcomeEmail?: boolean
}): Promise<{
  success: boolean
  userId?: string
  error?: string
  isNewUser?: boolean
}> {
  const client = await getSupabaseAdminClient()

  try {
    // AC-3: la sucursal solicitada debe pertenecer al tenant de la sesión
    await requireBusinessAccess(params.businessId)

    // 1. Obtener el customer existente
    const { data: customer, error: customerError } = await client
      .from('business_customers')
      .select('*')
      .eq('id', params.customerId)
      .single()

    if (customerError || !customer) {
      return { success: false, error: 'Cliente no encontrado' }
    }

    // AC-3: el customer debe pertenecer a una sucursal del tenant de la
    // sesión (evita operar sobre customers de otros tenants por ID)
    await requireBusinessAccess(customer.business_id)

    // 2. Verificar si ya tiene cuenta de usuario
    if (customer.user_id) {
      return { success: false, error: 'Este cliente ya tiene una cuenta de usuario activa' }
    }
    
    // 3. Verificar que tenga email
    if (!customer.emails || customer.emails.length === 0) {
      return { success: false, error: 'El cliente no tiene un email registrado' }
    }
    
    const primaryEmail = customer.emails[0]
    
    // 4. Crear usuario en Supabase Auth con business_customer_id y phone
    const authResult = await createCustomerAuthUser({
      email: primaryEmail,
      password: params.password,
      fullName: customer.full_name || '',
      businessId: params.businessId,
      businessCustomerId: customer.id,
      phone: customer.phone,
      generatePassword: !params.password,
    })
    
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }
    
    // 5. Actualizar el customer con el user_id
    const { error: updateError } = await client
      .from('business_customers')
      .update({ user_id: authResult.userId })
      .eq('id', params.customerId)
    
    if (updateError) {
      // Rollback: eliminar usuario auth si se creó
      if (authResult.userId && authResult.isNewUser) {
        await client.auth.admin.deleteUser(authResult.userId)
      }
      return { success: false, error: 'Error al vincular la cuenta al cliente' }
    }
    
    // 6. Enviar email de bienvenida si se solicitó
    if (params.sendWelcomeEmail && authResult.isNewUser && authResult.generatedPassword) {
      await sendCustomerWelcomeEmail({
        email: primaryEmail,
        fullName: customer.full_name || '',
        password: authResult.generatedPassword,
        businessName: customer.company_name || undefined,
      })
    }
    
    return {
      success: true,
      userId: authResult.userId || undefined,
      isNewUser: authResult.isNewUser,
    }
  } catch (error: any) {
    console.error('Error in activateCustomerAccountAction:', error)
    return { success: false, error: error.message || 'Error inesperado' }
  }
}

/**
 * Actualiza los datos de un usuario en Supabase Auth
 * Sincroniza email, nombre y phone cuando se actualiza un business_customer
 */
export async function updateCustomerAuthUser(params: {
  userId: string
  email?: string
  fullName?: string
  phone?: string | null
  businessCustomerId?: string
}): Promise<{ success: boolean; error?: string }> {
  const { userId, email, fullName, phone, businessCustomerId } = params

  try {
    // AC-3: solo el propio usuario, company_admin o un miembro del tenant
    // dueño del customer vinculado pueden modificar el usuario auth
    await assertCustomerUserAccess(userId)

    const client = await getSupabaseAdminClient()

    // Normalizar phone: quitar el símbolo + del inicio
    const normalizedPhone = phone ? (phone.startsWith('+') ? phone.substring(1) : phone) : null
    
    const updateData: {
      email?: string
      phone?: string
      user_metadata?: Record<string, any>
      app_metadata?: Record<string, any>
    } = {}
    
    if (email) {
      updateData.email = email
    }
    
    // Agregar phone como campo de primer nivel si existe
    if (normalizedPhone) {
      updateData.phone = normalizedPhone
    }
    
    if (fullName || phone !== undefined || businessCustomerId) {
      updateData.user_metadata = {
        full_name: fullName,
        name: fullName,
        phone: normalizedPhone,
        business_customer_id: businessCustomerId,
      }
      updateData.app_metadata = {
        phone: normalizedPhone,
        business_customer_id: businessCustomerId,
      }
    }
    
    const { error } = await client.auth.admin.updateUserById(userId, updateData)
    
    if (error) {
      console.error('[CustomerAuth] Error updating auth user:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log(`[CustomerAuth] Usuario ${userId} actualizado correctamente`)
    return { success: true }
  } catch (error: any) {
    console.error('[CustomerAuth] Error in updateCustomerAuthUser:', error)
    return { success: false, error: error.message || 'Error inesperado' }
  }
}

/**
 * Cambia la contraseña de un usuario en Supabase Auth
 */
export async function changeCustomerPassword(params: {
  userId: string
  newPassword: string
}): Promise<{ success: boolean; error?: string }> {
  const { userId, newPassword } = params

  try {
    // AC-3/AC-6: solo el propio usuario, company_admin o un business_admin
    // del tenant dueño del customer pueden cambiar la contraseña
    await assertCustomerUserAccess(userId, { adminOnly: true })

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'La contraseña debe tener al menos 8 caracteres' }
    }
    
    const client = await getSupabaseAdminClient()
    
    const { error } = await client.auth.admin.updateUserById(userId, {
      password: newPassword,
    })
    
    if (error) {
      console.error('[CustomerAuth] Error changing password:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log(`[CustomerAuth] Contraseña actualizada para usuario ${userId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[CustomerAuth] Error in changeCustomerPassword:', error)
    return { success: false, error: error.message || 'Error inesperado' }
  }
}

/**
 * Elimina un usuario de Supabase Auth
 * Se llama cuando se elimina un business_customer que tiene cuenta de usuario
 */
export async function deleteCustomerAuthUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // AC-6: solo roles admin. No se puede validar el tenant por
    // business_customers porque los callers (delete de business-customer)
    // invocan este helper DESPUÉS de borrar el registro vinculado.
    await requireRole(USER_ROLES.COMPANY_ADMIN, USER_ROLES.BUSINESS_ADMIN)

    const client = await getSupabaseAdminClient()

    const { error } = await client.auth.admin.deleteUser(userId)
    
    if (error) {
      console.error('[CustomerAuth] Error deleting auth user:', error.message)
      return { success: false, error: error.message }
    }
    
    console.log(`[CustomerAuth] Usuario ${userId} eliminado correctamente`)
    return { success: true }
  } catch (error: any) {
    console.error('[CustomerAuth] Error in deleteCustomerAuthUser:', error)
    return { success: false, error: error.message || 'Error inesperado' }
  }
}

/**
 * Remueve el acceso de un customer (elimina la cuenta de Supabase Auth)
 * pero mantiene el registro del business_customer
 */
export async function removeCustomerAccessAction(params: {
  customerId: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    // AC-3: requiere sesión válida (fail-closed)
    const user = await requireUser()

    const client = await getSupabaseAdminClient()

    // 1. Obtener el customer para verificar user_id y tenant dueño
    const { data: customer, error: fetchError } = await client
      .from('business_customers')
      .select('id, user_id, business_id')
      .eq('id', params.customerId)
      .single()

    if (fetchError || !customer) {
      return { success: false, error: 'Cliente no encontrado' }
    }

    if (!customer.user_id) {
      return { success: false, error: 'Este cliente no tiene cuenta de acceso' }
    }

    // AC-3/AC-6: solo el propio usuario o un admin del tenant dueño del
    // customer pueden remover el acceso
    if (user.id !== customer.user_id) {
      if (
        user.role !== USER_ROLES.COMPANY_ADMIN &&
        user.role !== USER_ROLES.BUSINESS_ADMIN
      ) {
        throw new AccessDeniedError(
          'No tienes permisos para remover este acceso'
        )
      }
      // Valida que la sucursal del customer pertenezca al tenant de la sesión
      // (company_admin pasa por ser el único rol cross-tenant)
      await requireBusinessAccess(customer.business_id)
    }

    // 2. Eliminar el usuario de Supabase Auth
    const { error: deleteError } = await client.auth.admin.deleteUser(customer.user_id)
    
    if (deleteError) {
      console.error('[CustomerAuth] Error removing access:', deleteError.message)
      return { success: false, error: deleteError.message }
    }
    
    // 3. Actualizar el business_customer para quitar el user_id
    const { error: updateError } = await client
      .from('business_customers')
      .update({ user_id: null })
      .eq('id', params.customerId)
    
    if (updateError) {
      console.error('[CustomerAuth] Error updating customer:', updateError.message)
      return { success: false, error: 'Error al actualizar el cliente' }
    }
    
    console.log(`[CustomerAuth] Acceso removido para cliente ${params.customerId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[CustomerAuth] Error in removeCustomerAccessAction:', error)
    return { success: false, error: error.message || 'Error inesperado' }
  }
}
