'use server'

import { getSupabaseAdminClient } from '@/lib/actions/supabase'

import type { UserRole } from '@/const/roles'

export interface AuthUser {
  id: string
  username: string
  email: string
  name: string | null
  role: UserRole
  business_id?: string | null
  business_account_id?: string | null
  business_type?: string | null
  subscription_plan?: string | null
  email_verified?: boolean
  tenant_name?: string | null
  instance_id?: string | null
  businesses?: Array<{
    id: string
    name: string
    business_account_id: string
    timezone: string
  }> | null
  timezone?: string | null
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
      .select('id, name, business_account_id, timezone')
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

    // Ya no usamos tablas legacy. Extraemos todo de user_metadata (o app_metadata)
    const { user_metadata } = authData.user || {}
    let businesses = user_metadata?.businesses || null
    let businessId = user_metadata?.business_id || null
    let businessAccountId = user_metadata?.business_account_id || null
    let businessType = user_metadata?.business_type || null
    let subscriptionPlan = user_metadata?.subscription_plan || null
    let tenantName = user_metadata?.tenant_name || null
    let instanceId = user_metadata?.instance_id || null
    let timezone = user_metadata?.timezone || 'America/Bogota'

    // Fallback: Si no hay businesses en metadata pero sí tenemos el businessAccountId, lo consultamos (por si se crearon más sucursales)
    if ((!businesses || businesses.length === 0) && businessAccountId && userRole === 'business_admin') {
      const fetchedBusinesses = await getAccountBusinesses(businessAccountId)
      if (fetchedBusinesses && fetchedBusinesses.length > 0) {
        businesses = fetchedBusinesses

        // Si no teníamos los datos principales, los intentamos inferir del primer negocio
        if (!businessId) businessId = businesses[0].id

        const { data: firstBusiness } = await supabase
          .from('businesses')
          .select('type')
          .eq('id', businesses[0].id)
          .single()

        if (firstBusiness && !businessType) businessType = firstBusiness.type
      }
    }

    return {
      id: authData.user.id,
      username: authData.user.email || email,
      email: authData.user.email || email,
      name: user_metadata?.name || userRole || 'User',
      role: (userRole as UserRole) || 'customer',
      business_id: businessId,
      business_account_id: businessAccountId,
      business_type: businessType,
      subscription_plan: subscriptionPlan,
      email_verified: user_metadata?.email_verified || false,
      tenant_name: tenantName,
      instance_id: instanceId,
      businesses,
      timezone,
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

    // Si el user de NextAuth ya tiene todos los campos vitales, retornarlo directamente
    if (user.id && user.role && user.business_id) {
      return user as AuthUser
    }

    // Si no, buscar en la base de datos
    const supabase = await getSupabaseAdminClient()

    // Get user from Supabase Auth usando el email de la sesión
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

    const { user_metadata } = authUser || {}
    const userRole = user_metadata?.role || 'customer'

    let businesses = user_metadata?.businesses || null
    let businessId = user_metadata?.business_id || null
    let businessAccountId = user_metadata?.business_account_id || null
    let businessType = user_metadata?.business_type || null
    let subscriptionPlan = user_metadata?.subscription_plan || null
    let tenantName = user_metadata?.tenant_name || null
    let instanceId = user_metadata?.instance_id || null
    let timezone = user_metadata?.timezone || 'America/Bogota'

    if ((!businesses || businesses.length === 0) && businessAccountId && userRole === 'business_admin') {
      const fetchedBusinesses = await getAccountBusinesses(businessAccountId)
      if (fetchedBusinesses && fetchedBusinesses.length > 0) {
        businesses = fetchedBusinesses

        if (!businessId) businessId = businesses[0].id

        const { data: firstBusiness } = await supabase
          .from('businesses')
          .select('type')
          .eq('id', businesses[0].id)
          .single()

        if (firstBusiness && !businessType) businessType = firstBusiness.type
      }
    }

    return {
      id: authUser.id,
      username: authUser.email || user.email || '',
      email: authUser.email || user.email || '',
      name: user_metadata?.name || userRole || 'User',
      role: (userRole as UserRole) || 'customer',
      business_id: businessId,
      business_account_id: businessAccountId,
      business_type: businessType,
      subscription_plan: subscriptionPlan,
      email_verified: user_metadata?.email_verified || false,
      tenant_name: tenantName,
      instance_id: instanceId,
      businesses,
      timezone,
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

    return { success: true }
  } catch (err) {
    console.error('Error creating admin account:', err)
    return { success: false, error: 'Unexpected error occurred' }
  }
}
/**
 * Get the current business ID from the authenticated user
 * Throws error if not authenticated or no business ID found
 */
export async function getCurrentBusinessId(): Promise<string> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  if (!user.business_id) {
    throw new Error('User does not have a business ID')
  }

  return user.business_id
}
