'use server'

import { getSupabaseAdminClient } from './supabase'
import { verifyTurnstileToken } from '@/lib/services/turnstile/turnstile-service'
import type { BusinessType } from '@/lib/types/enums'

export interface RegisterBusinessData {
  fullName: string
  email: string
  password: string
  phone?: string
  businessName: string
  businessType: BusinessType
  professionalCount: number
  city: string
  state: string
  address: string
  turnstileToken: string
}

export interface RegisterBusinessResult {
  success: boolean
  error?: string
}

export async function registerBusinessAction(
  data: RegisterBusinessData
): Promise<RegisterBusinessResult> {
  // Validate Turnstile token first
  if (!data.turnstileToken) {
    return {
      success: false,
      error: 'Verificación de seguridad requerida. Por favor, completa el captcha.',
    }
  }

  const turnstileResult = await verifyTurnstileToken(data.turnstileToken)
  if (!turnstileResult.success) {
    return {
      success: false,
      error: turnstileResult.error || 'Verificación de seguridad fallida. Por favor, intenta de nuevo.',
    }
  }

  const client = await getSupabaseAdminClient()

  let authUserId: string | null = null
  const businessAccountId = crypto.randomUUID()
  const businessId = crypto.randomUUID()
  
  // Generar tenant_name basado en el nombre del negocio
  const tenantSlug = data.businessName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 30)
  const tenantName = `${tenantSlug}-${businessAccountId.slice(0, 8)}`

  try {
    // 1. Verificar que el email no exista
    const { data: existingUsers } = await client.auth.admin.listUsers()
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase()
    )

    if (emailExists) {
      return {
        success: false,
        error: 'Este correo electrónico ya está registrado',
      }
    }

    // 2. Crear business_account PRIMERO
    const { error: accountError } = await client
      .from('business_accounts')
      .insert({
        id: businessAccountId,
        company_name: data.businessName,
        contact_name: data.fullName,
        contact_email: data.email,
        contact_phone: data.phone || null,
        billing_address: data.address,
        billing_city: data.city,
        billing_state: data.state,
        billing_country: 'CO',
        subscription_plan: 'trial',
        status: 'trial',
        settings: {
          professional_count: data.professionalCount,
        },
        tenant_name: tenantName,
      })

    if (accountError) {
      throw new Error(
        accountError.message || 'Error al crear la cuenta de negocio'
      )
    }

    // 3. Crear primera sucursal (business) SEGUNDO
    const { error: businessError } = await client.from('businesses').insert({
      id: businessId,
      business_account_id: businessAccountId,
      name: data.businessName,
      address: data.address,
      city: data.city,
      state: data.state,
      type: data.businessType,
      phone_number: data.phone || null,
    })

    if (businessError) {
      throw new Error(businessError.message || 'Error al crear la sucursal')
    }

    // 4. Crear usuario en Supabase Auth ULTIMO (con los IDs ya creados)
    const authUserData: any = {
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        name: data.fullName,
        email_verified: true,
        role: 'business_admin',
        business_id: businessId,
        business_account_id: businessAccountId,
        business_type: data.businessType,
        subscription_plan: 'trial',
        businesses: [{
          id: businessId,
          name: data.businessName,
          business_account_id: businessAccountId
        }],
        tenant_name: tenantName,
      },
      app_metadata: {
        provider: 'email',
        providers: ['email'],
        role: 'business_admin',
        business_id: businessId,
        business_account_id: businessAccountId,
        business_type: data.businessType,
        subscription_plan: 'trial',
        businesses: [{
          id: businessId,
          name: data.businessName,
          business_account_id: businessAccountId
        }],
        tenant_name: tenantName,
      }
    }

    if (data.phone && data.phone.trim() !== '') {
      authUserData.phone = data.phone
      authUserData.phone_confirm = true
    }

    const { data: authData, error: authError } =
      await client.auth.admin.createUser(authUserData)

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Error al crear el usuario')
    }

    authUserId = authData.user.id

    console.log('Registration successful:', {
      user_id: authUserId,
      business_account_id: businessAccountId,
      business_id: businessId,
    })

    // 5. Iniciar período de trial
    const { error: trialError } = await client.rpc('start_trial_for_account', {
      p_business_account_id: businessAccountId,
      p_custom_trial_days: null,
    })

    if (trialError) {
      console.error('Error starting trial:', trialError)
    }

    return { success: true }
  } catch (error: any) {
    // Rollback en caso de error (en orden inverso)
    if (authUserId) {
      await client.auth.admin.deleteUser(authUserId)
    }

    if (businessId) {
      await client.from('businesses').delete().eq('id', businessId)
    }

    if (businessAccountId) {
      await client.from('business_accounts').delete().eq('id', businessAccountId)
    }

    console.error('Registration error:', error)
    return {
      success: false,
      error: error.message || 'Error durante el registro',
    }
  }
}
