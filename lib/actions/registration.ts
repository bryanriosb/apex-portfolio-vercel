'use server'

import { getSupabaseAdminClient } from './supabase'
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
}

export interface RegisterBusinessResult {
  success: boolean
  error?: string
}

export async function registerBusinessAction(
  data: RegisterBusinessData
): Promise<RegisterBusinessResult> {
  const client = await getSupabaseAdminClient()

  let authUserId: string | null = null
  let userProfileId: string | null = null
  let businessAccountId: string | null = null

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

    // 2. Crear usuario en Supabase Auth
    const authUserData: any = {
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        name: data.fullName,
      },
    }

    // Solo agregar phone si existe y no está vacío
    if (data.phone && data.phone.trim() !== '') {
      authUserData.phone = data.phone
      authUserData.phone_confirm = true
    }

    const { data: authData, error: authError } =
      await client.auth.admin.createUser(authUserData)

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError)
      return {
        success: false,
        error: authError?.message || 'Error al crear la cuenta',
      }
    }

    console.log('Auth user created successfully:', {
      id: authData.user.id,
      email: authData.user.email,
      phone: authData.user.phone,
      user_metadata: authData.user.user_metadata,
    })

    authUserId = authData.user.id

    // 3. Crear users_profile con rol business_admin
    const { data: profileData, error: profileError } = await client
      .from('users_profile')
      .insert({
        user_id: authUserId,
        role: 'business_admin',
        city: data.city,
        state: data.state,
        country: 'CO',
      })
      .select()
      .single()

    if (profileError || !profileData) {
      throw new Error(profileError?.message || 'Error al crear el perfil')
    }

    userProfileId = profileData.id

    // 4. Crear business_account
    const { data: accountData, error: accountError } = await client
      .from('business_accounts')
      .insert({
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
        created_by: authUserId,
      })
      .select()
      .single()

    if (accountError || !accountData) {
      throw new Error(
        accountError?.message || 'Error al crear la cuenta de negocio'
      )
    }

    businessAccountId = accountData.id

    // 5. Crear business_account_member (vincular usuario a la cuenta)
    const { error: memberError } = await client
      .from('business_account_members')
      .insert({
        business_account_id: businessAccountId,
        user_profile_id: userProfileId,
        role: 'owner',
        status: 'active',
      })

    if (memberError) {
      throw new Error(
        memberError.message || 'Error al vincular usuario a la cuenta'
      )
    }

    // 6. Crear primera sucursal (business)
    const { error: businessError } = await client.from('businesses').insert({
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

    // 7. Iniciar período de trial
    const { error: trialError } = await client.rpc('start_trial_for_account', {
      p_business_account_id: businessAccountId,
      p_custom_trial_days: null,
    })

    if (trialError) {
      console.error('Error starting trial:', trialError)
    }

    return { success: true }
  } catch (error: any) {
    // Rollback en caso de error
    if (businessAccountId) {
      await client
        .from('businesses')
        .delete()
        .eq('business_account_id', businessAccountId)
      await client
        .from('business_account_members')
        .delete()
        .eq('business_account_id', businessAccountId)
      await client
        .from('business_accounts')
        .delete()
        .eq('id', businessAccountId)
    }

    if (userProfileId) {
      await client.from('users_profile').delete().eq('id', userProfileId)
    }

    if (authUserId) {
      await client.auth.admin.deleteUser(authUserId)
    }

    console.error('Registration error:', error)
    return {
      success: false,
      error: error.message || 'Error durante el registro',
    }
  }
}
