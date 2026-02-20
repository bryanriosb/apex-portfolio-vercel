'use server'

import { sendSMSContiguity } from './contiguity'
import { sendEmailMailgun } from './mailgun'
import { getSupabaseAdminClient } from './supabase'

// Store temporal para códigos de verificación (en producción usar Redis)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>()

/**
 * Genera un código de 6 dígitos aleatorio
 */
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Envía un código de verificación por email
 */
export async function sendEmailVerificationAction(email: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Verificar si el email ya existe en business_accounts
    const client = await getSupabaseAdminClient()
    const { data: existingAccounts } = await client
      .from('business_accounts')
      .select('contact_email')
      .ilike('contact_email', email)
      .limit(1)

    if (existingAccounts && existingAccounts.length > 0) {
      return {
        success: false,
        error: 'Este correo electrónico ya está registrado',
      }
    }

    const code = generateVerificationCode()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutos

    // Guardar código temporalmente
    verificationCodes.set(`email:${email}`, { code, expiresAt })

    // Enviar email usando Contiguity
    const result = await sendEmailMailgun({
      to: email,
      from: 'Beluvio <not-reply@borls.com>',
      subject: 'Código de verificación - Beluvio',
      body: {
        text: `Tu código de verificación es: ${code}. Este código expirará en 10 minutos.`,
      },
    })

    console.log('Email sent successfully:', result)

    return { success: true }
  } catch (error: any) {
    console.error('Error sending email verification:', error)
    return {
      success: false,
      error: error.message || 'Error al enviar el código de verificación',
    }
  }
}

/**
 * Envía un código de verificación por SMS
 */
export async function sendSMSVerificationAction(phone: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Verificar si el teléfono ya existe en business_accounts
    const client = await getSupabaseAdminClient()
    const { data: existingAccounts } = await client
      .from('business_accounts')
      .select('contact_phone')
      .or(`contact_phone.eq.${phone},contact_phone.eq.+${phone}`)
      .limit(1)

    if (existingAccounts && existingAccounts.length > 0) {
      return {
        success: false,
        error: 'Este número de teléfono ya está registrado',
      }
    }

    const code = generateVerificationCode()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutos

    // Guardar código temporalmente
    verificationCodes.set(`phone:${phone}`, { code, expiresAt })

    // Enviar SMS
    await sendSMSContiguity({
      to: phone,
      message: `Beluvio - ${code}. Expira en 10 minutos.`,
    })

    return { success: true }
  } catch (error: any) {
    console.error('Error sending SMS verification:', error)
    return {
      success: false,
      error: error.message || 'Error al enviar el código de verificación',
    }
  }
}

/**
 * Verifica un código de email
 */
export async function verifyEmailCodeAction(
  email: string,
  code: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const key = `email:${email}`
    const stored = verificationCodes.get(key)

    if (!stored) {
      return { success: false, error: 'Código no encontrado o expirado' }
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(key)
      return { success: false, error: 'El código ha expirado' }
    }

    if (stored.code !== code) {
      return { success: false, error: 'Código incorrecto' }
    }

    // Código válido, eliminar del store
    verificationCodes.delete(key)
    return { success: true }
  } catch (error: any) {
    console.error('Error verifying email code:', error)
    return {
      success: false,
      error: error.message || 'Error al verificar el código',
    }
  }
}

/**
 * Verifica un código de SMS
 */
export async function verifySMSCodeAction(
  phone: string,
  code: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const key = `phone:${phone}`
    const stored = verificationCodes.get(key)

    if (!stored) {
      return { success: false, error: 'Código no encontrado o expirado' }
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(key)
      return { success: false, error: 'El código ha expirado' }
    }

    if (stored.code !== code) {
      return { success: false, error: 'Código incorrecto' }
    }

    // Código válido, eliminar del store
    verificationCodes.delete(key)
    return { success: true }
  } catch (error: any) {
    console.error('Error verifying SMS code:', error)
    return {
      success: false,
      error: error.message || 'Error al verificar el código',
    }
  }
}
