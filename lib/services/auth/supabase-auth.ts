'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

import type { UserRole } from '@/const/roles'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  role: UserRole
  business_id?: string | null
  business_account_id?: string | null
  user_profile_id?: string | null
  specialist_id?: string | null
  business_type?: string | null
  subscription_plan?: string | null
  email_verified?: boolean
  tenant_name?: string | null
  instance_id?: string | null
  businesses?: Array<{
    id: string
    name: string
    business_account_id: string
  }> | null
  accessToken?: string | null
}

/**
 * Get businesses associated with a business account
 * @param businessAccountId - The business account ID
 * @returns Array of businesses or null
 */
async function getAccountBusinesses(
  businessAccountId: string
): Promise<Array<{ id: string; name: string; business_account_id: string }> | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id, name, business_account_id')
      .eq('business_account_id', businessAccountId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching account businesses:', error.message)
      return null
    }

    return businesses || []
  } catch (err) {
    console.error('Error in getAccountBusinesses:', err)
    return null
  }
}

/**
 * Get specialist data for a professional user
 * @param userProfileId - The user profile ID
 * @returns Specialist data or null
 */
async function getSpecialistForProfessional(
  userProfileId: string
): Promise<{ id: string; business_id: string | null } | null> {
  try {
    const supabase = await getSupabaseAdminClient()
    const { data: specialist, error } = await supabase
      .from('specialists')
      .select('id, business_id')
      .eq('user_profile_id', userProfileId)
      .single()

    if (error || !specialist) {
      return null
    }

    return specialist
  } catch (err) {
    console.error('Error in getSpecialistForProfessional:', err)
    return null
  }
}

/**
 * Authenticate user with Supabase Auth using email and password
 * @param credentials - Object containing email and password
 * @returns User session data if successful, null otherwise
 */
export async function authenticateWithSupabase(
  credentials: Record<'email' | 'password', string> | undefined
): Promise<AuthUser | null> {
  try {
    if (!credentials) return null

    const supabase = await getSupabaseAdminClient()
    const { email, password } = credentials



    // Sign in with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })

    if (authError || !authData.user) {
      console.error('Authentication error:', authError?.message, authError)
      return null
    }



    // Obtener role desde metadata del usuario de Supabase Auth
    const userRole = authData.user.user_metadata?.role || 'customer'

    // Bloquear acceso a usuarios con rol customer
    if (userRole === 'customer') {

      return null // Retornar null simula credenciales inválidas
    }



    // Para business relationships, seguir usando las tablas existentes por ahora
    // Obtener user_profile_id desde metadata o buscarlo
    let userProfileId = authData.user.user_metadata?.user_profile_id

    if (!userProfileId) {
      // Si no existe en metadata, buscar en la tabla users_profile (compatibilidad)
      const { data: legacyProfile } = await supabase
        .from('users_profile')
        .select('id')
        .eq('user_id', authData.user.id)
        .single()

      userProfileId = legacyProfile?.id || null
    }

    // Luego intentar obtener las membresías (puede que no tenga ninguna)
    let membership = null
    if (userProfileId) {
      const { data: memberships } = await supabase
        .from('business_account_members')
        .select('business_account_id, role, status')
        .eq('user_profile_id', userProfileId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      membership = memberships?.[0] || null
    }



    // Si el usuario es business_admin y tiene una cuenta asociada, obtener sus negocios
    let businesses = null
    let specialistId: string | null = null
    let businessId: string | null = null
    let businessType: string | null = null
    let subscriptionPlan: string | null = null

    if (userRole === 'business_admin' && membership?.business_account_id) {

      businesses = await getAccountBusinesses(membership.business_account_id)


      // Obtener el tipo de negocio del primer negocio y el plan de la cuenta
      if (businesses && businesses.length > 0) {
        const { data: firstBusiness } = await supabase
          .from('businesses')
          .select('type')
          .eq('id', businesses[0].id)
          .single()

        if (firstBusiness) {
          businessType = firstBusiness.type
        }
      }

      // Obtener el plan de suscripción de la cuenta
      const { data: account } = await supabase
        .from('business_accounts')
        .select('subscription_plan')
        .eq('id', membership.business_account_id)
        .single()

      if (account) {
        subscriptionPlan = account.subscription_plan
      }
    }

    // Si el usuario es professional, obtener su specialist_id y business_id
    if (userRole === 'professional' && userProfileId) {

      const specialist = await getSpecialistForProfessional(userProfileId)

      if (specialist) {
        specialistId = specialist.id
        businessId = specialist.business_id


        // Obtener el business para el profesional
        if (businessId) {
          const { data: business } = await supabase
            .from('businesses')
            .select('id, name, business_account_id, type')
            .eq('id', businessId)
            .single()

          if (business) {
            businesses = [business]
            businessType = business.type

            // Obtener el plan de suscripción de la cuenta
            const { data: account } = await supabase
              .from('business_accounts')
              .select('subscription_plan')
              .eq('id', business.business_account_id)
              .single()

            if (account) {
              subscriptionPlan = account.subscription_plan
            }
          }
        }
      }
    }

    return {
      id: authData.user.id,
      email: authData.user.email || email,
      name: authData.user.user_metadata?.name || userRole || 'User',
      role: (userRole as UserRole) || 'customer',
      business_id: businessId || authData.user.user_metadata?.business_id || null,
      business_account_id: membership?.business_account_id || authData.user.user_metadata?.business_account_id || null,
      business_type: businessType || authData.user.user_metadata?.business_type || null,
      subscription_plan: subscriptionPlan || authData.user.user_metadata?.subscription_plan || null,
      email_verified: authData.user.user_metadata?.email_verified || false,
      tenant_name: authData.user.user_metadata?.tenant_name || null,
      instance_id: authData.user.user_metadata?.instance_id || null,
      businesses,
      user_profile_id: userProfileId,
      specialist_id: specialistId,
      accessToken: authData.session?.access_token || null,
    }
  } catch (err) {
    console.error('Cannot sign in:', err)
    return null
  }
}

/**
 * Sign out the current user
 */
export async function signOutSupabase(): Promise<void> {
  try {
    const supabase = await getSupabaseAdminClient()
    await supabase.auth.signOut()
  } catch (err) {
    console.error('Error signing out:', err)
  }
}

/**
 * Get the currently authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    // Obtener sesión de NextAuth en lugar de Supabase Auth
    const { getServerSession } = await import('next-auth')
    const { AUTH_OPTIONS } = await import('@/const/auth')

    const session = await getServerSession(AUTH_OPTIONS)

    if (!session?.user) {
      return null
    }

    // NextAuth ya tiene el user en la sesión con todos los datos
    const user = session.user as any

    // Si el user de NextAuth ya tiene todos los campos, retornarlo directamente
    if (user.id && user.role) {
      return user as AuthUser
    }

    // Si no, buscar en la base de datos
    const supabase = await getSupabaseAdminClient()

    // Get user from Supabase Auth usando el email de la sesión
    // Primero listar usuarios para encontrar por email (no hay método directo por email en admin)
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.error('Error listing users:', listError?.message)
      return null
    }

    const authUser = users.find(u => u.email === user.email)

    if (!authUser) {
      console.error('User not found in auth system')
      return null
    }

    // Obtener role desde metadata del usuario de Supabase Auth
    const userRole = authUser.user_metadata?.role || 'customer'

    // Para business relationships, seguir usando las tablas existentes por ahora
    // Obtener user_profile_id desde metadata o buscarlo
    let userProfileId = authUser.user_metadata?.user_profile_id

    if (!userProfileId) {
      // Si no existe en metadata, buscar en la tabla users_profile (compatibilidad)
      const { data: legacyProfile } = await supabase
        .from('users_profile')
        .select('id')
        .eq('user_id', authUser.id)
        .single()

      userProfileId = legacyProfile?.id || null
    }

    // Intentar obtener las membresías (puede que no tenga ninguna)
    let membership = null
    if (userProfileId) {
      const { data: memberships } = await supabase
        .from('business_account_members')
        .select('business_account_id, role, status')
        .eq('user_profile_id', userProfileId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      membership = memberships?.[0] || null
    }

    // Si el usuario es business_admin y tiene una cuenta asociada, obtener sus negocios
    let businesses = null
    let specialistId: string | null = null
    let businessId: string | null = null
    let businessType: string | null = null
    let subscriptionPlan: string | null = null

    if (userRole === 'business_admin' && membership?.business_account_id) {
      businesses = await getAccountBusinesses(membership.business_account_id)

      // Obtener el tipo de negocio del primer negocio y el plan de la cuenta
      if (businesses && businesses.length > 0) {
        const { data: firstBusiness } = await supabase
          .from('businesses')
          .select('type')
          .eq('id', businesses[0].id)
          .single()

        if (firstBusiness) {
          businessType = firstBusiness.type
        }
      }

      // Obtener el plan de suscripción de la cuenta
      const { data: account } = await supabase
        .from('business_accounts')
        .select('subscription_plan')
        .eq('id', membership.business_account_id)
        .single()

      if (account) {
        subscriptionPlan = account.subscription_plan
      }
    }

    // Si el usuario es professional, obtener su specialist_id y business_id
    if (userRole === 'professional' && userProfileId) {
      const specialist = await getSpecialistForProfessional(userProfileId)
      if (specialist) {
        specialistId = specialist.id
        businessId = specialist.business_id

        if (businessId) {
          const { data: business } = await supabase
            .from('businesses')
            .select('id, name, business_account_id, type')
            .eq('id', businessId)
            .single()

          if (business) {
            businesses = [business]
            businessType = business.type

            // Obtener el plan de suscripción de la cuenta
            const { data: account } = await supabase
              .from('business_accounts')
              .select('subscription_plan')
              .eq('id', business.business_account_id)
              .single()

            if (account) {
              subscriptionPlan = account.subscription_plan
            }
          }
        }
      }
    }

    return {
      id: authUser.id,
      email: authUser.email || user.email || '',
      name: authUser.user_metadata?.name || user.name || userRole || 'User',
      role: (userRole as UserRole) || 'customer',
      business_id: businessId || authUser.user_metadata?.business_id || null,
      business_account_id: membership?.business_account_id || authUser.user_metadata?.business_account_id || null,
      business_type: businessType || authUser.user_metadata?.business_type || null,
      subscription_plan: subscriptionPlan || authUser.user_metadata?.subscription_plan || null,
      email_verified: authUser.user_metadata?.email_verified || false,
      tenant_name: authUser.user_metadata?.tenant_name || null,
      instance_id: authUser.user_metadata?.instance_id || null,
      businesses,
      user_profile_id: userProfileId,
      specialist_id: specialistId,
    }
  } catch (err) {
    console.error('Error getting current user:', err)
    return null
  }
}

/**
 * Create a new admin user account
 */
export async function createAdminAccount(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await getSupabaseAdminClient()

    // Create auth user with metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'company_admin', // Default role for admin accounts
          email_verified: false, // Can be set to true for auto-verification in development
          tenant_name: 'default',
          instance_id: crypto.randomUUID(),
          business_type: 'tech',
          subscription_plan: 'enterprise',
          business_id: null,
          business_account_id: null,
          businesses: [],
        },
      },
    })

    if (authError || !authData.user) {
      return {
        success: false,
        error: authError?.message || 'Failed to create account',
      }
    }

    // Optional: Create user profile for backward compatibility
    // This can be removed later when fully migrated to metadata
    try {
      await supabase
        .from('users_profile')
        .insert({
          user_id: authData.user.id,
          email: email,
          role: 'company_admin',
        })
    } catch (profileError) {
      // Log but don't fail if profile creation fails
      console.warn('Profile creation failed (non-critical):', profileError)
    }

    return { success: true }
  } catch (err) {
    console.error('Error creating admin account:', err)
    return { success: false, error: 'Unexpected error occurred' }
  }
}
