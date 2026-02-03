import { UserRole } from '@/const/roles'
import 'next-auth'

declare module 'next-auth' {
  /**
   * Extender la interfaz Session para incluir los campos personalizados del usuario
   */
  interface Session {
    user: User
  }

  /**
   * Extender la interfaz User para incluir los campos personalizados
   */
  interface User {
    id: string
    email?: string | null
    username?: string | null
    name: string
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
    }> | null
    user_profile_id?: string | null
    specialist_id?: string | null
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extender la interfaz JWT para incluir los campos personalizados
   */
  interface JWT {
    User
  }
}
