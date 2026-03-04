'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY!

// Cliente específico para operaciones de auth (no singleton)
function getAuthClient() {
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Envía un email de recuperación de contraseña
 */
export async function sendPasswordResetEmailAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAuthClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })

    if (error) {
      console.error('Error sending password reset email:', error)

      // No revelar si el email existe o no por seguridad
      if (error.message.includes('rate limit')) {
        return {
          success: false,
          error:
            'Demasiados intentos. Por favor, espera unos minutos antes de intentar nuevamente.',
        }
      }

      // Para otros errores, mostrar mensaje genérico
      return {
        success: false,
        error: 'No se pudo enviar el correo. Por favor, intenta nuevamente.',
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in sendPasswordResetEmailAction:', error)
    return {
      success: false,
      error: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
    }
  }
}

/**
 * Actualiza la contraseña del usuario usando el token de recuperación
 */
export async function updatePasswordAction(
  newPassword: string,
  accessToken: string,
  refreshToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getAuthClient()

    // Establecer la sesión con los tokens del URL
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (sessionError) {
      console.error('Error setting session:', sessionError)
      return {
        success: false,
        error: 'El enlace de recuperación ha expirado o es inválido.',
      }
    }

    // Actualizar la contraseña
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (updateError) {
      console.error('Error updating password:', updateError)

      if (updateError.message.includes('should be different')) {
        return {
          success: false,
          error: 'La nueva contraseña debe ser diferente a la anterior.',
        }
      }

      return {
        success: false,
        error:
          'No se pudo actualizar la contraseña. Por favor, intenta nuevamente.',
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error in updatePasswordAction:', error)
    return {
      success: false,
      error: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
    }
  }
}
